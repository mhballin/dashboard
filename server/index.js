import express from 'express'
import cors from 'cors'

const PB_URL = 'https://pocketbase.michaelballin.com'
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  try {
    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const resp = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return res.status(resp.status).json(data)

    return res.json({ token: data.token, userId: data.record?.id, email: data.record?.email })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {}
    const resp = await fetch(`${PB_URL}/api/collections/users/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, passwordConfirm: password, name }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return res.status(resp.status).json(data)

    return res.status(resp.status).json(data)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

app.all('/api/*', async (req, res) => {
  try {
    console.log(`[PROXY] ${req.method} ${req.path}`)

    // Build forward URL: strip leading '/api' from originalUrl
    const forwardUrl = PB_URL + '/api' + req.originalUrl.slice(4)

    // Clone headers, but remove hop-by-hop headers that should not be forwarded
    const headers = { ...req.headers }
    delete headers.host
    delete headers['content-length']
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

    const proxied = await fetch(forwardUrl, options)

    const contentType = proxied.headers.get('content-type') || ''
    const status = proxied.status

    const text = await proxied.text()

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text || '{}')
        return res.status(status).json(json)
      } catch (e) {
        return res.status(status).send(text)
      }
    }

    res.status(status)
    if (text) return res.send(text)
    return res.end()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`)
})
