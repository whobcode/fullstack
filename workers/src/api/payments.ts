import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { Client, Environment } from 'square';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

// Slot pricing in cents (matches game.ts)
const SLOT_PRICES: Record<number, number> = {
  4: 500,   // $5
  5: 1000,  // $10
  6: 1500,  // $15
  7: 2000,  // $20
};

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

  // Initialize Square client
  const squareClient = new Client({
    accessToken: c.env.SQUARE_ACCESS_TOKEN,
    environment: c.env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox,
  });

  try {
    // Create the payment with Square
    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      locationId: c.env.SQUARE_LOCATION_ID,
      note: `Character Slot ${slotNumber} - User: ${user.id}`,
      referenceId: `slot-${slotNumber}-user-${user.id}`,
    });

    if (!result.payment) {
      return c.json({ error: 'Payment failed - no payment returned' }, 500);
    }

    const payment = result.payment;

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
        receiptUrl: payment.receiptUrl,
      }
    });

  } catch (error: any) {
    console.error('Square payment error:', error);

    // Handle Square API errors
    if (error.errors) {
      const squareErrors = error.errors.map((e: any) => ({
        code: e.code,
        detail: e.detail,
        field: e.field,
      }));

      return c.json({
        error: 'Payment processing failed',
        details: squareErrors,
      }, 400);
    }

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

  const squareClient = new Client({
    accessToken: c.env.SQUARE_ACCESS_TOKEN,
    environment: c.env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox,
  });

  try {
    const { result } = await squareClient.paymentsApi.getPayment(paymentId);

    if (!result.payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    return c.json({
      data: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney?.amount?.toString(),
        currency: result.payment.amountMoney?.currency,
        receiptUrl: result.payment.receiptUrl,
        createdAt: result.payment.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return c.json({ error: 'Failed to verify payment' }, 500);
  }
});

export default payments;
