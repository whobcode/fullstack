// SMS delivery.
//
// Twilio is the default provider; it is the only place in the codebase that
// knows which vendor sends the message, so swapping to Vonage/SNS/etc. means
// rewriting sendSms and nothing else. Like the Resend email path, this is
// gated on its secrets being present rather than assumed.

export type SmsResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export type SmsConfig = {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
};

/** True when the worker has everything it needs to send an SMS. */
export function isSmsConfigured(config: SmsConfig): boolean {
  return Boolean(config.accountSid && config.authToken && config.fromNumber);
}

/**
 * Sends a text message. Returns a result rather than throwing so callers can
 * decide how much to tell the client -- for the login flow we deliberately do
 * not echo provider errors back to the caller.
 */
export async function sendSms(config: SmsConfig, to: string, body: string): Promise<SmsResult> {
  if (!isSmsConfigured(config)) {
    return { ok: false, error: 'SMS service not configured', status: 503 };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const credentials = btoa(`${config.accountSid}:${config.authToken}`);

  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', config.fromNumber!);
  form.set('Body', body);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Twilio send failed:', response.status, detail);
      return { ok: false, error: 'Failed to send message', status: 502 };
    }

    return { ok: true };
  } catch (err) {
    console.error('Twilio request threw:', err);
    return { ok: false, error: 'Failed to send message', status: 502 };
  }
}
