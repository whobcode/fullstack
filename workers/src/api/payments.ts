import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

// Square API base URLs
const SQUARE_API_URL = {
  sandbox: 'https://connect.squareupsandbox.com/v2',
  production: 'https://connect.squareup.com/v2',
};

// Slot pricing in cents (matches game.ts)
const SLOT_PRICES: Record<number, number> = {
  4: 500,   // $5
  5: 1000,  // $10
  6: 1500,  // $15
  7: 2000,  // $20
};

// Square API helper - direct REST calls instead of heavy SDK
async function squareRequest<T>(
  env: Bindings,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ data?: T; errors?: Array<{ code: string; detail: string; field?: string }> }> {
  const baseUrl = env.SQUARE_ENVIRONMENT === 'production'
    ? SQUARE_API_URL.production
    : SQUARE_API_URL.sandbox;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    return { errors: result.errors as Array<{ code: string; detail: string; field?: string }> };
  }

  return { data: result as T };
}

// Square API response types
interface SquarePayment {
  id: string;
  status: string;
  amount_money?: { amount: number; currency: string };
  receipt_url?: string;
  created_at?: string;
}

interface CreatePaymentResponse {
  payment?: SquarePayment;
}

interface GetPaymentResponse {
  payment?: SquarePayment;
}

const payments = new Hono<App>();

// All routes require authentication
payments.use('*', authMiddleware);

// Get Square application ID for frontend
payments.get('/config', async (c) => {
  const applicationId = c.env.SQUARE_APPLICATION_ID;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const environment = c.env.SQUARE_ENVIRONMENT || 'sandbox';

  if (!applicationId) {
    return c.json({ error: 'Square payments not configured' }, 503);
  }

  return c.json({
    data: {
      applicationId,
      locationId,
      environment,
    }
  });
});

// Schema for creating a payment
const createPaymentSchema = z.object({
  sourceId: z.string().min(1), // Payment token from Square Web Payments SDK
  slotNumber: z.number().min(4).max(7),
  idempotencyKey: z.string().uuid(),
});

// Process payment for a character slot
payments.post('/slot-purchase', zValidator('json', createPaymentSchema), async (c) => {
  const user = c.get('user');
  const { sourceId, slotNumber, idempotencyKey } = c.req.valid('json');
  const db = c.env.DB;

  // Validate Square configuration
  if (!c.env.SQUARE_ACCESS_TOKEN || !c.env.SQUARE_LOCATION_ID) {
    return c.json({ error: 'Payment processing not configured' }, 503);
  }

  // Validate slot price
  const amountCents = SLOT_PRICES[slotNumber];
  if (!amountCents) {
    return c.json({ error: 'Invalid slot number' }, 400);
  }

  // Check if slot already purchased
  const existing = await db.prepare('SELECT id FROM character_slot_purchases WHERE user_id = ? AND slot_number = ?')
    .bind(user.id, slotNumber).first();

  if (existing) {
    return c.json({ error: 'Slot already purchased' }, 400);
  }

  // Check if previous slots are purchased (must buy in order)
  for (let i = 4; i < slotNumber; i++) {
    const prevSlot = await db.prepare('SELECT id FROM character_slot_purchases WHERE user_id = ? AND slot_number = ?')
      .bind(user.id, i).first();
    if (!prevSlot) {
      return c.json({ error: `Must purchase slot ${i} first` }, 400);
    }
  }

  try {
    // Create the payment with Square REST API
    const result = await squareRequest<CreatePaymentResponse>(c.env, 'POST', '/payments', {
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: amountCents,
        currency: 'USD',
      },
      location_id: c.env.SQUARE_LOCATION_ID,
      note: `Character Slot ${slotNumber} - User: ${user.id}`,
      reference_id: `slot-${slotNumber}-user-${user.id}`,
    });

    if (result.errors) {
      return c.json({
        error: 'Payment processing failed',
        details: result.errors,
      }, 400);
    }

    const payment = result.data?.payment;
    if (!payment) {
      return c.json({ error: 'Payment failed - no payment returned' }, 500);
    }

    // Check payment status
    if (payment.status !== 'COMPLETED') {
      return c.json({
        error: `Payment not completed. Status: ${payment.status}`,
        paymentId: payment.id,
      }, 400);
    }

    // Record the successful purchase
    await db.prepare(`
      INSERT INTO character_slot_purchases (user_id, slot_number, price_paid, transaction_id, payment_status, square_payment_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      slotNumber,
      amountCents,
      idempotencyKey,
      'completed',
      payment.id
    ).run();

    return c.json({
      success: true,
      message: `Slot ${slotNumber} purchased successfully!`,
      data: {
        slotNumber,
        amountPaid: amountCents,
        paymentId: payment.id,
        receiptUrl: payment.receipt_url,
      }
    });

  } catch (error: unknown) {
    console.error('Square payment error:', error);
    return c.json({ error: 'Payment processing error' }, 500);
  }
});

// Get user's payment history
payments.get('/history', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const purchases = await db.prepare(`
    SELECT slot_number, price_paid, transaction_id, payment_status, square_payment_id, created_at
    FROM character_slot_purchases
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(user.id).all();

  return c.json({ data: purchases.results || [] });
});

// Verify a payment (for order confirmation)
const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
});

payments.post('/verify', zValidator('json', verifyPaymentSchema), async (c) => {
  const { paymentId } = c.req.valid('json');

  if (!c.env.SQUARE_ACCESS_TOKEN) {
    return c.json({ error: 'Payment verification not configured' }, 503);
  }

  try {
    const result = await squareRequest<GetPaymentResponse>(c.env, 'GET', `/payments/${paymentId}`);

    if (result.errors) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const payment = result.data?.payment;
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    return c.json({
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount_money?.amount?.toString(),
        currency: payment.amount_money?.currency,
        receiptUrl: payment.receipt_url,
        createdAt: payment.created_at,
      }
    });

  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    return c.json({ error: 'Failed to verify payment' }, 500);
  }
});

export default payments;
