import { Resend } from 'resend'
import pRetry, { AbortError } from 'p-retry'

const resend = globalThis.process?.env?.RESEND_API_KEY ? new Resend(globalThis.process?.env?.RESEND_API_KEY) : null

function statusFromError(error) {
  return error?.statusCode || error?.status || error?.response?.status || null
}

function isRetryable(error) {
  const status = statusFromError(error)
  if (status === 429 || status === 500 || status === 503) return true
  const code = String(error?.code || '').toUpperCase()
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND'
}

export async function sendFeatureRequest({ title, description, attachments = [], userId, email }) {
  if (!globalThis.process?.env?.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')
  const from = globalThis.process?.env?.RECAP_FROM_EMAIL
  const to = globalThis.process?.env?.RECAP_ADMIN_ALERT_EMAIL
  if (!from || !to) throw new Error('Missing RECAP_FROM_EMAIL or RECAP_ADMIN_ALERT_EMAIL')

  const htmlParts = []
  htmlParts.push(`<h2 style="font-family: 'Plus Jakarta Sans', sans-serif;">New feature request</h2>`)
  htmlParts.push(`<p><strong>Title:</strong> ${String(title || '')}</p>`)
  htmlParts.push(`<p><strong>Description:</strong><br/>${String(description || '').replace(/\n/g, '<br/>')}</p>`)
  if (email || userId) {
    htmlParts.push(`<p><strong>From:</strong> ${email || ''} ${userId ? `(userId: ${userId})` : ''}</p>`)
  }

  for (const att of attachments || []) {
    try {
      // If data looks like a data URI, embed it; otherwise ignore
      if (att && att.data && String(att.data).startsWith('data:')) {
        htmlParts.push(`<div style="margin-top:8px;"><strong>${att.name || 'attachment'}</strong><br/><img src="${att.data}" style="max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:8px;"/></div>`)
      }
    } catch {
      // ignore attachment rendering errors
    }
  }

  const html = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #1a1a1a;">${htmlParts.join('')}</div>`

  const subject = `Feature request: ${String(title || '').slice(0, 80) || 'New request'}`

  const result = await pRetry(async () => {
    try {
      const response = await resend.emails.send({ from, to, subject, html })
      return response
    } catch (error) {
      if (!isRetryable(error)) throw new AbortError(error)
      throw error
    }
  }, { retries: 3, minTimeout: 1000, factor: 2 })

  return { success: true, messageId: result?.data?.id || null }
}
