import fs from 'fs/promises'

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const ADMIN_TOKEN = process.env.PB_ADMIN_TOKEN || ''
if (!ADMIN_TOKEN) {
  console.error('Set PB_ADMIN_TOKEN in env')
  process.exit(1)
}

const WANT = new Set(['cards','tasks','activity_log','weekly_stats','notes','settings'])

async function main(){
  const raw = await fs.readFile('pb-collections.json','utf8')
  const parsed = JSON.parse(raw)
  const items = parsed.items || []

  for (const item of items) {
    if (!WANT.has(item.name)) continue
    console.log('→ importing collection', item.name)
    try {
      const res = await fetch(PB_URL + '/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ADMIN_TOKEN },
        body: JSON.stringify(item)
      })
      const text = await res.text()
      console.log(res.status, text)
    } catch (e) {
      console.error('ERR', e)
    }
  }
}

main().catch(e=>{console.error(e); process.exit(1)})
