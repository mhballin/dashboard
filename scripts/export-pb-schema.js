/* global process */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PB_URL = process.env.PB_URL
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD
const OUTPUT_PATH = process.env.PB_SCHEMA_PATH || 'schema/pocketbase-collections.json'

function normalizeBaseUrl(url) {
  return (url || '').replace(/\/+$/, '')
}

async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function sanitizeField(field) {
  if (!field || typeof field !== 'object') return field
  const { id: _id, created: _created, updated: _updated, collectionId: _collectionId, ...rest } = field
  return rest
}

function sanitizeCollection(collection) {
  if (!collection || typeof collection !== 'object') return collection

  const {
    id,
    name,
    type,
    system,
    listRule,
    viewRule,
    createRule,
    updateRule,
    deleteRule,
    fields,
    indexes,
    options,
  } = collection

  const normalizedFields = Array.isArray(fields)
    ? fields.map(sanitizeField).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
    : []

  const normalizedIndexes = Array.isArray(indexes) ? [...indexes].sort() : []

  return {
    id: id || null,
    name: name || '',
    type: type || '',
    system: Boolean(system),
    listRule: listRule ?? null,
    viewRule: viewRule ?? null,
    createRule: createRule ?? null,
    updateRule: updateRule ?? null,
    deleteRule: deleteRule ?? null,
    options: options || {},
    fields: normalizedFields,
    indexes: normalizedIndexes,
  }
}

async function authenticateAdmin(baseUrl) {
  const response = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: PB_ADMIN_EMAIL,
      password: PB_ADMIN_PASSWORD,
    }),
  })

  const payload = await parseJsonResponse(response)
  if (!response.ok) {
    throw new Error(`Admin auth failed: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`)
  }

  const token = payload?.token
  if (!token) {
    throw new Error('Admin auth succeeded but no token was returned.')
  }

  return token
}

async function fetchAllCollections(baseUrl, token) {
  const perPage = 200
  let page = 1
  let totalPages = 1
  const allCollections = []

  while (page <= totalPages) {
    const response = await fetch(`${baseUrl}/api/collections?page=${page}&perPage=${perPage}&sort=name`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const payload = await parseJsonResponse(response)
    if (!response.ok) {
      throw new Error(`Failed to fetch collections page ${page}: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`)
    }

    const pageItems = payload?.items || payload?.records || []
    if (!Array.isArray(pageItems)) {
      throw new Error('PocketBase collections response is not in expected list format.')
    }

    allCollections.push(...pageItems)
    totalPages = Number(payload?.totalPages || 1)
    page += 1
  }

  return allCollections
}

async function run() {
  if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error('Environment variables PB_URL, PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD are required.')
  }

  const baseUrl = normalizeBaseUrl(PB_URL)
  if (!baseUrl) {
    throw new Error('PB_URL is required and must not be empty.')
  }

  console.log(`Exporting schema from: ${baseUrl}`)

  const token = await authenticateAdmin(baseUrl)
  const collections = await fetchAllCollections(baseUrl, token)

  const normalizedCollections = collections
    .map(sanitizeCollection)
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))

  const payload = {
    schemaVersion: 1,
    collectionCount: normalizedCollections.length,
    collections: normalizedCollections,
  }

  const outPath = path.resolve(process.cwd(), OUTPUT_PATH)
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Schema exported to ${OUTPUT_PATH}`)
  console.log(`Collections exported: ${normalizedCollections.length}`)
}

run().catch((error) => {
  console.error('Schema export failed.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
