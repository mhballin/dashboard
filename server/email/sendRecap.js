import { Resend } from 'resend';
import pRetry, { AbortError } from 'p-retry';

const resend = new Resend(globalThis.process?.env?.RESEND_API_KEY || '');

function statusFromError(error) {
  return error?.statusCode || error?.status || error?.response?.status || null;
}

function isRetryable(error) {
  const status = statusFromError(error);
  if (status === 429 || status === 500 || status === 503) return true;
  const code = String(error?.code || '').toUpperCase();
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND';
}

export async function sendRecapEmail({ to, subject, html }) {
  if (!globalThis.process?.env?.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  if (!globalThis.process?.env?.RECAP_FROM_EMAIL) throw new Error('Missing RECAP_FROM_EMAIL');

  const result = await pRetry(async () => {
    try {
      const response = await resend.emails.send({
        from: globalThis.process?.env?.RECAP_FROM_EMAIL,
        to,
        subject,
        html,
      });
      return response;
    } catch (error) {
      if (!isRetryable(error)) throw new AbortError(error);
      throw error;
    }
  }, {
    retries: 3,
    minTimeout: 1000,
    factor: 2,
  });

  return { success: true, messageId: result?.data?.id || null };
}
