/**
 * server/scraper.js
 *
 * Scrapes a job posting URL and returns structured job data.
 * Implements SSRF protection via DNS lookups and private-range checks.
 * Extraction tiers: Greenhouse/Lever APIs, JSON-LD, OpenGraph, meta/DOM.
 */
import dns from 'node:dns'
import * as cheerio from 'cheerio'

const MAX_DESCRIPTION_LENGTH = 5000

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function isPrivateIPv4(ip) {
  try {
    const i = ipv4ToInt(ip)
    // Ranges (inclusive): 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8
    const ranges = [
      [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
      [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
      [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
      [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
      [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
      [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
    ]
    return ranges.some(([a, b]) => i >= a && i <= b)
  } catch {
    return false
  }
}

function isPrivateIPv6(ip) {
  const a = ip.split('%')[0].toLowerCase()
  if (a === '::1') return true
  if (a.startsWith('fc') || a.startsWith('fd')) return true // fc00::/7
  // fe80::/10 covers fe80 - febf (approx). Check fe8/fe9/fea/feb starts
  if (a.startsWith('fe8') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb')) return true
  return false
}

async function validateUrl(urlString) {
  let parsed
  try {
    parsed = new URL(urlString)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')

  const hostname = parsed.hostname
  if (!hostname) throw new Error('Invalid hostname')
  if (hostname === 'localhost' || hostname.endsWith('.local')) throw new Error('Hostname not allowed')

  let lookup
  try {
    lookup = await dns.promises.lookup(hostname)
  } catch {
    throw new Error('DNS lookup failed')
  }

  const addr = lookup.address
  if (!addr) throw new Error('Unable to resolve host')

  if (addr.includes('.')) {
    if (isPrivateIPv4(addr)) throw new Error('IP address in private/reserved range')
  } else if (addr.includes(':')) {
    if (isPrivateIPv6(addr)) throw new Error('IP address in private/reserved range')
  }

  return parsed.toString()
}

function stripHtml(html) {
  if (!html) return ''
  const $ = cheerio.load(html)
  const text = $.root().text().replace(/\s+/g, ' ').trim()
  return text.slice(0, MAX_DESCRIPTION_LENGTH)
}

function safeString(v) {
  if (!v && v !== 0) return ''
  if (typeof v === 'string') return v
  try {
    return String(v)
  } catch {
    return ''
  }
}

function formatSalaryFromJsonLd(baseSalary) {
  if (!baseSalary) return ''
  try {
    const value = baseSalary.value || baseSalary
    if (typeof value === 'object') {
      const min = value.minValue || value.min || ''
      const max = value.maxValue || value.max || ''
      const unit = value.unitText || value.unit || ''
      if (min && max) return `${min}-${max} ${unit}`.trim()
      if (min) return `${min} ${unit}`.trim()
      if (max) return `${max} ${unit}`.trim()
    }
    return String(value || '')
  } catch {
    return ''
  }
}

function isBlockedOrLoginPage({ title = '', description = '', html = '', hostname = '' }) {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const h = (html || '').toLowerCase();

  // Common login/title markers
  if (/\b(sign in|sign-in|login|log in|please sign in|access denied|403 forbidden)\b/.test(t)) return true;
  if (/\b(sign in|sign-in|login|log in|please sign in|access denied|403 forbidden)\b/.test(d)) return true;

  // Known host-specific markers
  if (hostname && hostname.includes('linkedin')) return true; // LinkedIn requires auth/JS

  // Hydration or large JS blobs indicate a non-HTML job page
  if (h.includes('window.__como_rehydration__') || h.includes('__NEXT_DATA__') || h.includes('__INITIAL_STATE__')) return true;

  // Short titles like "LinkedIn Login" or generic "Sign in" already caught above
  return false;
}

export async function scrapeJobPosting(url) {
  const emptyData = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: safeString(url),
    salary: '',
    employmentType: '',
    workMode: '',
  }

  try {
    const validated = await validateUrl(url)

    // TIER 1 — ATS API detection (Greenhouse / Lever)
    const greenhouseRe = /(?:boards|job-boards)\.greenhouse\.io\/([^/]+)\/jobs\/([^/?#]+)/i
    const greenhouseMatch = validated.match(greenhouseRe)
    if (greenhouseMatch) {
      const company = greenhouseMatch[1]
      const jobId = greenhouseMatch[2]
      const api = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
      const resp = await fetch(api, { signal: AbortSignal.timeout(10000) })
      if (!resp.ok) return { success: false, source: 'greenhouse_api', data: { ...emptyData, url: validated }, error: `Page returned HTTP ${resp.status}` }
      const json = await resp.json().catch(() => ({}))
      const data = {
        title: safeString(json.title || ''),
        company: safeString(json.company?.name || company),
        location: safeString(json.location?.name || ''),
        description: stripHtml(json.content || ''),
        url: validated,
        salary: safeString(json.pay || ''),
        employmentType: Array.isArray(json.metadata) ? (json.metadata.find((m) => /employment/i.test(m?.name || ''))?.value || '') : '',
        workMode: '',
      }
      return { success: Boolean(data.title), source: 'greenhouse_api', data, error: null }
    }

    const leverRe = /jobs\.lever\.co\/([^/]+)\/([^/?#]+)/i
    const leverMatch = validated.match(leverRe)
    if (leverMatch) {
      const company = leverMatch[1]
      const jobId = leverMatch[2]
      const api = `https://api.lever.co/v0/postings/${company}/${jobId}`
      const resp = await fetch(api, { signal: AbortSignal.timeout(10000) })
      if (!resp.ok) return { success: false, source: 'lever_api', data: { ...emptyData, url: validated }, error: `Page returned HTTP ${resp.status}` }
      const json = await resp.json().catch(() => ({}))
      const data = {
        title: safeString(json.text || ''),
        company: safeString(json.categories?.team || company),
        location: safeString(json.categories?.location || ''),
        description: stripHtml(json.descriptionPlain || json.description || ''),
        url: validated,
        salary: '',
        employmentType: '',
        workMode: safeString(json.categories?.commitment || json.workplaceType || ''),
      }
      return { success: Boolean(data.title), source: 'lever_api', data, error: null }
    }

    // TIER 2 — Static fetch + structured extraction
    const resp = await fetch(validated, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSearchHQ/1.0)' },
      signal: AbortSignal.timeout(10000),
    })

    if (!resp.ok) {
      return { success: false, source: 'error', data: { ...emptyData, url: validated }, error: `Page returned HTTP ${resp.status}` }
    }

    const html = await resp.text()
    const $ = cheerio.load(html)
    const hostname = new URL(validated).hostname.replace(/^www\./, '')

    // A) JSON-LD
    const ldScripts = $('script[type="application/ld+json"]').toArray()
    for (const el of ldScripts) {
      const txt = $(el).contents().text()
      if (!txt) continue
      try {
        const parsed = JSON.parse(txt)
        const candidates = Array.isArray(parsed) ? parsed : [parsed]
        for (const cand of candidates) {
          // handle @graph
          const graph = cand['@graph'] || (Array.isArray(cand) ? cand : null)
          const items = graph ? (Array.isArray(graph) ? graph : [graph]) : [cand]
          for (const item of items) {
            const type = item['@type'] || (item && item['@type'] && Array.isArray(item['@type']) ? item['@type'][0] : '')
            if (!type && item) {
              // sometimes type is nested
            }
            if (type === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))) {
              const title = safeString(item.title || '')
              const company = safeString(item.hiringOrganization?.name || item.hiringOrganization || '')
              let location = ''
              if (item.jobLocation) {
                const jl = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation
                location = safeString(jl?.address?.addressLocality || jl?.address || '')
              }
              const description = stripHtml(item.description || '')
              const salary = formatSalaryFromJsonLd(item.baseSalary || item.estimatedSalary)
              const employmentType = Array.isArray(item.employmentType) ? item.employmentType.join(', ') : safeString(item.employmentType || '')
              let workMode = ''
              const jobLocType = safeString(item.jobLocationType || '')
              if (/TELECOMMUTE|REMOTE/i.test(jobLocType)) workMode = 'Remote'

              const data = { title, company, location, description, url: validated, salary, employmentType, workMode }
              if (title) return { success: true, source: 'jsonld', data, error: null }
            }
          }
        }
        } catch {
          // ignore malformed JSON-LD
        }
    }

    // B) OpenGraph
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    if (ogTitle) {
      const data = {
        title: safeString(ogTitle),
        company: safeString($('meta[property="og:site_name"]').attr('content') || ''),
        location: '',
        description: safeString($('meta[property="og:description"]').attr('content') || ''),
        url: validated,
        salary: '',
        employmentType: '',
        workMode: '',
      }
      if (isBlockedOrLoginPage({ title: data.title, description: data.description, html, hostname })) {
        return { success: false, source: 'opengraph', data: { ...emptyData, url: validated }, error: "Couldn't extract from this site" }
      }
      return { success: true, source: 'opengraph', data, error: null }
    }

    // C) meta + DOM fallback
    const pageTitle = ($('title').first().text() || '').trim()
    const h1 = ($('h1').first().text() || '').trim()
    const metaDesc = $('meta[name="description"]').attr('content') || ''

    let finalTitle = h1 || pageTitle
    // try to strip common separators like ' - ' or ' | '
    if (finalTitle && / - | \| /.test(finalTitle)) {
      const parts = finalTitle.split(/ - | \| /).map((p) => p.trim())
      // prefer shorter left-most piece as title
      finalTitle = parts[0]
    }

    let companyGuess = ''
    if (pageTitle && pageTitle.includes(' - ')) companyGuess = pageTitle.split(' - ').pop().trim()
    if (!companyGuess) companyGuess = hostname.split('.').slice(-2).join('.')

    const data = {
      title: safeString(finalTitle),
      company: safeString(companyGuess),
      location: '',
      description: stripHtml(metaDesc || ($('body').text() || '').slice(0, 2000)),
      url: validated,
      salary: '',
      employmentType: '',
      workMode: '',
    }

    const source = data.title ? 'meta' : 'minimal'
    if (isBlockedOrLoginPage({ title: data.title, description: data.description, html, hostname })) {
      return { success: false, source, data: { ...emptyData, url: validated }, error: "Couldn't extract from this site" }
    }
    return { success: Boolean(data.title), source, data, error: null }
  } catch (err) {
    return { success: false, source: 'error', data: { title: '', company: '', location: '', description: '', url: safeString(url), salary: '', employmentType: '', workMode: '' }, error: err?.message || String(err) }
  }
}
