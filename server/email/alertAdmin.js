import { Resend } from 'resend';

const resend = new Resend(globalThis.process?.env?.RESEND_API_KEY || '');

export async function alertAdminOnFailure({ userId, error, weekKey }) {
  const adminEmail = globalThis.process?.env?.RECAP_ADMIN_ALERT_EMAIL;
  const fromEmail = globalThis.process?.env?.RECAP_FROM_EMAIL;
  if (!adminEmail || !fromEmail || !globalThis.process?.env?.RESEND_API_KEY) return;

  const subject = `Weekly recap failed for user ${userId}`;
  const body = [
    `User ID: ${userId}`,
    `Week Key: ${weekKey}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Error: ${error?.message || String(error)}`,
  ].join('\n');

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject,
      text: body,
    });
  } catch (alertError) {
    console.error('Failed to send recap admin alert', alertError);
  }
}
