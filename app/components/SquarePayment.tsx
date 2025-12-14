import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';

type SquareConfig = {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
};

type SquarePaymentProps = {
  amount: number; // in cents
  slotNumber: number;
  onSuccess: (paymentId: string, receiptUrl?: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
};

declare global {
  interface Window {
    Square?: any;
  }
}

export function SquarePayment({
  amount,
  slotNumber,
  onSuccess,
  onError,
  onCancel,
}: SquarePaymentProps) {
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardInitialized, setCardInitialized] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Square config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiClient.get<{ data: SquareConfig }>('/payments/config');
        setConfig(res.data);
      } catch (err: any) {
        setError('Payment system unavailable');
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Load Square SDK
  useEffect(() => {
    if (!config) return;

    const loadSquareSDK = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.Square) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = config.environment === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Square SDK'));
        document.body.appendChild(script);
      });
    };

    loadSquareSDK()
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [config]);

  // Initialize card payment form
  useEffect(() => {
    if (loading || !config || !window.Square || cardInitialized) return;

    const initializeCard = async () => {
      try {
        const payments = window.Square.payments(config.applicationId, config.locationId);
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');
        setCard(cardInstance);
        setCardInitialized(true);
      } catch (err: any) {
        setError('Failed to initialize payment form');
        console.error('Square card init error:', err);
      }
    };

    initializeCard();
  }, [loading, config, cardInitialized]);

  const handlePayment = useCallback(async () => {
    if (!card || processing) return;

    setProcessing(true);
    setError(null);

    try {
      // Tokenize the card
      const tokenResult = await card.tokenize();

      if (tokenResult.status === 'OK') {
        // Generate idempotency key
        const idempotencyKey = crypto.randomUUID();

        // Send to backend for processing
        const response = await apiClient.post<{
          success: boolean;
          data: { paymentId: string; receiptUrl?: string };
          error?: string;
        }>('/payments/slot-purchase', {
          sourceId: tokenResult.token,
          slotNumber,
          idempotencyKey,
        });

        if (response.success) {
          onSuccess(response.data.paymentId, response.data.receiptUrl);
        } else {
          setError(response.error || 'Payment failed');
          onError(response.error || 'Payment failed');
        }
      } else {
        const errorMessage = tokenResult.errors?.[0]?.message || 'Card verification failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment processing error';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [card, processing, slotNumber, onSuccess, onError]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse text-shade-red-400">Loading payment form...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 text-center">
        <div className="text-shade-red-600">Payment system not configured</div>
        <p className="text-xs text-shade-red-400 mt-2">Please contact support to enable payments.</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-shade-black-700 border border-shade-red-800 text-shade-red-400 rounded"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold neon-text">
          ${(amount / 100).toFixed(2)}
        </div>
        <div className="text-sm text-shade-red-400">
          Character Slot {slotNumber}
        </div>
      </div>

      {/* Square Card Container */}
      <div className="bg-shade-black-800 p-4 rounded border border-shade-red-900">
        <div
          id="card-container"
          className="min-h-[100px]"
          style={{
            // Override Square's default styling to match theme
            '--sq-placeholder-color': 'rgba(255, 42, 42, 0.5)',
            '--sq-input-color': '#ff2a2a',
            '--sq-input-background': '#0d0d0d',
            '--sq-border-color': '#cc2222',
          } as React.CSSProperties}
        />
      </div>

      {error && (
        <div className="bg-shade-red-900/30 border border-shade-red-700 p-3 rounded text-sm text-shade-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 bg-shade-black-700 border border-shade-red-800 text-shade-red-400 p-3 rounded hover:bg-shade-black-600 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={!cardInitialized || processing}
          className="flex-1 bg-shade-black-900 neon-border text-shade-red-600 p-3 rounded hover:neon-glow-strong transition-all disabled:opacity-50"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Processing...
            </span>
          ) : (
            `Pay $${(amount / 100).toFixed(2)}`
          )}
        </button>
      </div>

      <div className="text-center text-xs text-shade-red-500">
        Secure payment powered by Square
      </div>
    </div>
  );
}
