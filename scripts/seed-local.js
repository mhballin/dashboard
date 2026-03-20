 
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
  // Use the PocketBase superuser auth endpoint (compatible with local binary)
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
function replaceUserFields(record, userId) {
  if (!record || typeof record !== 'object') return record
  // shallow replace for common fields
  if ('user' in record) record.user = userId
  if ('userId' in record) record.userId = userId
  // also traverse arrays/objects to catch nested user fields
  for (const k of Object.keys(record)) {
    const v = record[k]
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (v[i] && typeof v[i] === 'object') replaceUserFields(v[i], userId)
      }
    } else if (v && typeof v === 'object') {
      replaceUserFields(v, userId)
    }
  }
  return record
}

async function createOrFindDemoUser(baseUrl, token) {
  const email = 'demo@local.dev'
  const password = 'password123'

  // Try to create
  try {
    const res = await fetch(`${baseUrl}/api/collections/users/records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, passwordConfirm: password, name: 'Demo User' })
    })
    const payload = await parseJsonResponse(res)
    if (res.ok) {
      const id = payload?.id || payload?.record?.id
      return { id, email, password }
    }
    // If create failed because user exists or other validation, fall through to lookup
    console.log('Demo user create result:', res.status)
  } catch (e) {
    console.error('Demo user create error', e)
  }

  // Find existing user by email
  try {
    const filter = encodeURIComponent(`(email='${email}')`)
    const res2 = await fetch(`${baseUrl}/api/collections/users/records?filter=${filter}&perPage=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const p2 = await parseJsonResponse(res2)
    const items = Array.isArray(p2?.items || p2?.records) ? (p2.items || p2.records) : []
    if (items.length) {
      return { id: items[0].id, email, password }
    }
  } catch (e) {
    console.error('Demo user lookup error', e)
  }

  throw new Error('Failed to create or find demo user')
}

async function run() {
  const baseUrl = PB_URL.replace(/\/+$/, '')
  console.log('Seeding local PocketBase at', baseUrl)
  const seedPath = path.resolve(globalThis.process.cwd(), 'data/sampleSeed.json')
  const content = JSON.parse(await fs.readFile(seedPath, 'utf8'))
  const contentRaw = JSON.parse(await fs.readFile(seedPath, 'utf8'))
  const data = (contentRaw && contentRaw.version && contentRaw.data) ? contentRaw.data : contentRaw

  const token = await authAdmin(baseUrl)

  // create/find demo user
  const demo = await createOrFindDemoUser(baseUrl, token)
  console.log('Demo user:', demo.email)

  const summary = {}

  // Helper to seed with user replacement and count
  async function seedCollection(collectionName, records) {
    if (!records || !records.length) {
      summary[collectionName] = 0
      return
    }
    // replace user fields
    const prepared = records.map(r => replaceUserFields(Object.assign({}, r), demo.id))
    await ensureAndSeed(baseUrl, token, collectionName, prepared)
    summary[collectionName] = prepared.length
  }

  // a. cards
  await seedCollection('cards', data.cards || [])
  // b. tasks
  await seedCollection('tasks', data.tasks || [])
  // c. activity_log (maps from activityLog)
  await seedCollection('activity_log', data.activityLog || [])
  // d. weekly_stats (maps from weeklyStats)
  await seedCollection('weekly_stats', data.weeklyStats || [])
  // e. notes
  await seedCollection('notes', data.notes || [])

  // f. settings — data.settings may be an object
  const settingsRecords = []
  if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
    for (const [k, v] of Object.entries(data.settings)) {
      const value = (typeof v === 'string') ? v : JSON.stringify(v)
      settingsRecords.push({ key: k, value, user: demo.id })
    }
  }

  // Also add the additional top-level keys requested
  if (data.jobBoards !== undefined) settingsRecords.push({ key: 'job-dashboard-boards', value: JSON.stringify(data.jobBoards), user: demo.id })
  if (data.searchStrings !== undefined) settingsRecords.push({ key: 'job-dashboard-search-strings', value: JSON.stringify(data.searchStrings), user: demo.id })
  if (data.keywords !== undefined) settingsRecords.push({ key: 'job-dashboard-keywords', value: JSON.stringify(data.keywords), user: demo.id })
  if (data.profileAsk !== undefined) settingsRecords.push({ key: 'profile-ask', value: data.profileAsk, user: demo.id })
  if (data.profileLookingFor !== undefined) settingsRecords.push({ key: 'profile-looking', value: data.profileLookingFor, user: demo.id })
  if (data.profileProofPoints !== undefined) settingsRecords.push({ key: 'profile-proof', value: data.profileProofPoints, user: demo.id })

  if (settingsRecords.length) {
    await ensureAndSeed(baseUrl, token, 'settings', settingsRecords)
    summary.settings = settingsRecords.length
  } else {
    summary.settings = 0
  }

  console.log('\nSeeding complete.')
  console.log(`Demo credentials: ${demo.email} / ${demo.password}`)
  for (const k of Object.keys(summary)) {
    console.log(`${k}: ${summary[k]} records`)
  }
  console.log('Log in at http://localhost:5173 with demo@local.dev / password123')

  console.log('Seeding complete.')
}

run().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  globalThis.process.exitCode = 1
})
