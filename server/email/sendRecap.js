import { Resend } from 'resend';
import pRetry, { AbortError } from 'p-retry';

const resend = globalThis.process?.env?.RESEND_API_KEY ? new Resend(globalThis.process?.env?.RESEND_API_KEY) : null;

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(h\d|p|div|li|tr|td)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  // Local/dev helper: if DEV_NO_EMAIL=1, log email payload instead of sending
  if (String(globalThis.process?.env?.DEV_NO_EMAIL) === '1') {
    console.log('[DEV_NO_EMAIL] email payload:', { to, subject })
    // keep exact html out of noisy logs but provide a preview
    console.log(html?.slice?.(0, 500) || '')
    return { success: true, messageId: null }
  }

  if (!globalThis.process?.env?.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  if (!globalThis.process?.env?.RECAP_FROM_EMAIL) throw new Error('Missing RECAP_FROM_EMAIL');

  const text = htmlToPlainText(html);

  const result = await pRetry(async () => {
    try {
      const response = await resend.emails.send({
        from: globalThis.process?.env?.RECAP_FROM_EMAIL,
        to,
        subject,
        html,
        text,
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
