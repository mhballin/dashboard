 
import fs from 'node:fs/promises'
import path from 'node:path'

const PB_URL = (globalThis.process?.env?.PB_URL) || 'http://127.0.0.1:8090'
const PB_ADMIN_EMAIL = (globalThis.process?.env?.PB_ADMIN_EMAIL) || ''
const PB_ADMIN_PASSWORD = (globalThis.process?.env?.PB_ADMIN_PASSWORD) || ''

async function parseJsonResponse(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

async function authAdmin(baseUrl) {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in env')
  }
  const res = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD })
  })
  const p = await parseJsonResponse(res)
  if (!res.ok) throw new Error('Admin auth failed: ' + JSON.stringify(p))
  return p.token
}

async function ensureAndSeed(baseUrl, token, collection, records) {
  const listRes = await fetch(`${baseUrl}/api/collections/${collection}/records?page=1&perPage=1`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const listPayload = await parseJsonResponse(listRes)
  const existing = Array.isArray(listPayload?.items || listPayload?.records) ? (listPayload.items || listPayload.records) : []
  if (existing.length > 0) {
    console.log(`${collection} not empty — skipping seed`)
    return
  }

  for (const r of records) {
    const res = await fetch(`${baseUrl}/api/collections/${collection}/records`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    })
    const payload = await parseJsonResponse(res)
    if (!res.ok) {
      console.error(`Failed to seed ${collection}:`, payload)
    } else {
      console.log(`Seeded ${collection} id=${payload?.id || payload?.record?.id || '<unknown>'}`)
    }
  }
}

async function run() {
  const baseUrl = PB_URL.replace(/\/+$/, '')
  console.log('Seeding local PocketBase at', baseUrl)
  const seedPath = path.resolve(globalThis.process.cwd(), 'data/sampleSeed.json')
  const content = JSON.parse(await fs.readFile(seedPath, 'utf8'))
  const token = await authAdmin(baseUrl)

  if (content.settings && content.settings.length) {
    // settings collection uses key/value shape
    await ensureAndSeed(baseUrl, token, 'settings', content.settings.map(s => ({ key: s.key, value: s.value, userId: s.userId || null })))
  }
  if (content.tasks && content.tasks.length) {
    await ensureAndSeed(baseUrl, token, 'tasks', content.tasks)
  }
  if (content.cards && content.cards.length) {
    await ensureAndSeed(baseUrl, token, 'cards', content.cards)
  }

  console.log('Seeding complete.')
}

run().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  globalThis.process.exitCode = 1
})
