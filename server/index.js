import express from 'express'
import cors from 'cors'
import { initWeeklyRecapScheduler } from './email/weeklyRecapJob.js'
import { scrapeJobPosting } from './scraper.js'
import { sendRecapEmail } from './email/sendRecap.js'
import { sendFeatureRequest } from './email/sendFeatureRequest.js'

const PB_URL = (globalThis.process?.env?.PB_URL || '').replace(/\/+$/, '')
const PORT = globalThis.process?.env?.PORT || 3001
const UPSTREAM_TIMEOUT_MS = Number(globalThis.process?.env?.UPSTREAM_TIMEOUT_MS || 15000)
const CORS_ALLOWED_ORIGINS = (globalThis.process?.env?.CORS_ALLOWED_ORIGINS || 'https://dashboard.michaelballin.com,http://localhost:5173')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

if (!PB_URL) {
  throw new Error('Missing required environment variable: PB_URL')
}

try {
  new URL(PB_URL)
} catch {
  throw new Error('Invalid PB_URL. Expected absolute URL such as https://pocketbase.example.com')
}

const app = express()

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (CORS_ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    return callback(new Error('Origin not allowed by CORS'))
  },
}

app.use((req, res, next) => {
  req.requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  next()
})

app.use(cors(corsOptions))
app.use(express.json())

function logError(req, scope, err) {
  console.error(`[${req.requestId}] ${scope} ${req.method} ${req.originalUrl}`, err)
}

function sendInternalError(res, requestId) {
  return res.status(500).json({ error: 'Internal server error', requestId })
}

function sendUpstreamError(res, requestId) {
  return res.status(502).json({ error: 'Upstream service error', requestId })
}

function buildProxyHeaders(req) {
  const headers = {}
  const auth = req.headers.authorization
  const accept = req.headers.accept
  const contentType = req.headers['content-type']

  if (auth) headers.authorization = auth
  if (accept) headers.accept = accept
  if (contentType) headers['content-type'] = contentType

  return headers
}

async function pbRequest(path, options = {}, token) {
  const url = `${PB_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { ...options, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(data?.message || `${response.status} ${response.statusText}`)
  }
  return data
}

async function authenticateAdmin() {
  const identity = globalThis.process?.env?.PB_ADMIN_EMAIL
  const password = globalThis.process?.env?.PB_ADMIN_PASSWORD
  if (!identity || !password) {
    throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD')
  }

  const body = JSON.stringify({ identity, password })
  const endpoints = ['/api/admins/auth-with-password', '/api/collections/_superusers/auth-with-password']

  let lastError = null
  for (const endpoint of endpoints) {
    try {
      const data = await pbRequest(endpoint, { method: 'POST', body })
      if (data?.token) return data.token
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Unable to authenticate as PocketBase admin')
}

app.get('/health', (req, res) => {
  try {
    return res.json({ ok: true, requestId: req.requestId })
  } catch (e) {
    logError(req, 'health-failure', e)
    return sendInternalError(res, req.requestId)
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const resp = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      if (resp.status >= 500) return sendUpstreamError(res, req.requestId)
      return res.status(resp.status).json(data)
    }

    return res.json({ token: data.token, userId: data.record?.id, email: data.record?.email })
  } catch (e) {
    logError(req, 'auth-login-failure', e)
    return sendUpstreamError(res, req.requestId)
  }
})

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {}
    const resp = await fetch(`${PB_URL}/api/collections/users/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, passwordConfirm: password, name }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      if (resp.status >= 500) return sendUpstreamError(res, req.requestId)
      return res.status(resp.status).json(data)
    }

    return res.status(resp.status).json(data)
  } catch (e) {
    logError(req, 'auth-register-failure', e)
    return sendUpstreamError(res, req.requestId)
  }
})

// Request password reset: accepts { email }
app.post('/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' })

    const adminToken = await authenticateAdmin()

    // find user by email
    const usersResp = await pbRequest(
      `/api/collections/users/records?filter=${encodeURIComponent(`email="${email}"`)}&perPage=1`,
      {},
      adminToken,
    )
    const user = (usersResp?.items || usersResp?.records || [])[0]

    // Do not reveal whether email exists
    if (!user) return res.json({ ok: true })

    const resetToken = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour

    // upsert setting: password-reset for this user
    const settingsFilter = encodeURIComponent(`(user="${user.id}"&&key="password-reset")`)
    const existing = await pbRequest(`/api/collections/settings/records?filter=${settingsFilter}&perPage=1`, {}, adminToken)
    const payload = { key: 'password-reset', user: user.id, value: JSON.stringify({ token: resetToken, expiresAt }) }

    if ((existing?.items || existing?.records || []).length) {
      const rec = (existing.items || existing.records)[0]
      await pbRequest(`/api/collections/settings/records/${rec.id}`, { method: 'PATCH', body: JSON.stringify({ value: JSON.stringify({ token: resetToken, expiresAt }) }) }, adminToken)
    } else {
      await pbRequest('/api/collections/settings/records', { method: 'POST', body: JSON.stringify(payload) }, adminToken)
    }

    const FRONTEND_URL = (globalThis.process?.env?.FRONTEND_URL || CORS_ALLOWED_ORIGINS[0] || 'http://localhost:5173').replace(/\/+$/, '')
    const resetLink = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}&uid=${encodeURIComponent(user.id)}`

    const html = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #1a1a1a;">
      <p>Hello ${user.name || ''},</p>
      <p>We received a request to reset the password for this account. Click the button below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>`

    await sendRecapEmail({ to: user.email, subject: 'Reset your Job Dashboard password', html })

    return res.json({ ok: true })
  } catch (e) {
    logError(req, 'auth-forgot-failure', e)
    return sendInternalError(res, req.requestId)
  }
})

// Complete password reset: accepts { uid, token, password }
app.post('/auth/reset', async (req, res) => {
  try {
    const { uid, token, password } = req.body || {}
    if (!uid || !token || !password) return res.status(400).json({ error: 'uid, token and password are required' })

    const adminToken = await authenticateAdmin()

    const settingsFilter = encodeURIComponent(`(user="${uid}"&&key="password-reset")`)
    const existing = await pbRequest(`/api/collections/settings/records?filter=${settingsFilter}&perPage=1`, {}, adminToken)
    const rec = (existing?.items || existing?.records || [])[0]
    if (!rec) return res.status(400).json({ error: 'Invalid or expired token' })

    let payload
    try {
      payload = JSON.parse(rec.value)
    } catch {
      return res.status(400).json({ error: 'Invalid token payload' })
    }

    if (payload.token !== token || new Date(payload.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    // Update user's password
    await pbRequest(`/api/collections/users/records/${uid}`, { method: 'PATCH', body: JSON.stringify({ password, passwordConfirm: password }) }, adminToken)

    // remove the setting record
    await pbRequest(`/api/collections/settings/records/${rec.id}`, { method: 'DELETE' }, adminToken)

    return res.json({ ok: true })
  } catch (e) {
    logError(req, 'auth-reset-failure', e)
    return sendInternalError(res, req.requestId)
  }
})

// POST /scrape - return structured job posting data for a URL
app.post('/scrape', async (req, res) => {
  try {
    const auth = req.headers.authorization
    if (!auth) return res.status(401).json({ error: 'Unauthorized' })

    const { url } = req.body || {}
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' })

    try {
      const result = await scrapeJobPosting(url)
      console.log(`[${req.requestId}] [SCRAPE] ${url} → ${result.source}`)
      return res.status(200).json(result)
    } catch (e) {
      console.error(`[${req.requestId}] scrape-failure`, e)
      return res.status(500).json({ error: 'Scraping failed' })
    }
  } catch (e) {
    console.error('scrape-route-failure', e)
    return res.status(500).json({ error: 'Scraping failed' })
  }
})

// POST /feature-request - accept { title, description, attachments[], userId, email }
app.post('/feature-request', async (req, res) => {
  try {
    const { title, description, attachments, userId, email } = req.body || {}

    if (!title && !description) return res.status(400).json({ error: 'Title or description required' })

    try {
      await sendFeatureRequest({ title, description, attachments, userId, email })
      return res.json({ ok: true })
    } catch (err) {
      logError(req, 'feature-request-send-failure', err)
      return sendInternalError(res, req.requestId)
    }
  } catch (e) {
    logError(req, 'feature-request-route-failure', e)
    return sendInternalError(res, req.requestId)
  }
})

app.all('/api/*', async (req, res) => {
  try {
    console.log(`[${req.requestId}] proxy ${req.method} ${req.path}`)

    // Build forward URL: strip leading '/api' from originalUrl
    const forwardUrl = PB_URL + '/api' + req.originalUrl.slice(4)

    const headers = buildProxyHeaders(req)
    if (req.method === 'DELETE' || req.method === 'HEAD') {
      delete headers['content-type']
    }

    const options = {
      method: req.method,
      headers,
    }

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
      // If JSON, stringify the parsed body; otherwise attempt to forward the parsed body.
      if (req.is('application/json')) {
        options.body = JSON.stringify(req.body)
      } else if (req.body) {
        options.body = req.body
      }
    }

    const proxied = await fetch(forwardUrl, {
      ...options,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const contentType = proxied.headers.get('content-type') || ''
    const status = proxied.status

    if (status >= 500) return sendUpstreamError(res, req.requestId)

    const text = await proxied.text()

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text || '{}')
        return res.status(status).json(json)
      } catch {
        return res.status(status).send(text)
      }
    }

    res.status(status)
    if (text) return res.send(text)
    return res.end()
  } catch (e) {
    logError(req, 'proxy-failure', e)
    return sendUpstreamError(res, req.requestId)
  }
})

app.listen(PORT, '127.0.0.1', () => {
  const pbHost = new URL(PB_URL).host
  console.log(`Server listening on ${PORT}`)
  console.log(`PocketBase target host: ${pbHost}`)
  console.log(`CORS allowlist: ${CORS_ALLOWED_ORIGINS.join(', ')}`)
  console.log(`Upstream timeout: ${UPSTREAM_TIMEOUT_MS}ms`)
  initWeeklyRecapScheduler()
})
