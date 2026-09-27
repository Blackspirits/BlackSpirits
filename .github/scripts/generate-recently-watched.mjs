#!/usr/bin/env node
/**
 * Fetch the latest Simkl history and render it using the BlackSpirits
 * profile design system.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUT_DIR = join(ROOT, 'assets', 'generated')
const OUT_FILE = join(OUT_DIR, 'recently-watched.svg')

const CLIENT_ID = process.env.SIMKL_CLIENT_ID
const ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN
const LIMIT = 6

const C = {
  base: '#1e1e2e',
  deep: '#181825',
  border: '#45475a',
  grid: '#313244',
  muted: '#7f849c',
  text: '#cdd6f4',
  subtext: '#a6adc8',
  blue: '#89b4fa',
  purple: '#cba6f7',
  peach: '#fab387',
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(str, max) {
  const value = String(str ?? '')
  return value.length > max ? value.slice(0, max - 1) + '…' : value
}

function relativeDate(iso) {
  if (!iso) return ''
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return ''
  const diff = Date.now() - timestamp
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

async function simklGet(path) {
  const res = await fetch(`https://api.simkl.com${path}`, {
    headers: {
      'simkl-api-key': CLIENT_ID,
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Simkl API ${res.status} on ${path}: ${await res.text()}`)
  }
  return res.json()
}

async function fetchHistory() {
  const allRaw = await simklGet('/sync/all-items/')
  const movies = Array.isArray(allRaw?.movies) ? allRaw.movies : []
  const shows = Array.isArray(allRaw?.shows) ? allRaw.shows : []
  const anime = Array.isArray(allRaw?.anime) ? allRaw.anime : []

  const normalisedMovies = movies
    .filter((m) => m.last_watched_at)
    .map((m) => ({
      type: 'movie',
      title: m.movie?.title ?? 'Unknown',
      year: m.movie?.year ?? '',
      watchedAt: m.last_watched_at,
    }))

  const normalisedShows = [...shows, ...anime]
    .filter((s) => s.last_watched_at)
    .map((s) => ({
      type: 'show',
      title: s.show?.title ?? 'Unknown',
      year: s.show?.year ?? '',
      watchedAt: s.last_watched_at,
    }))

  return [...normalisedMovies, ...normalisedShows]
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(0, LIMIT)
}

const W = 956
const H = 260
const PAD = 22
const TOP = 88
const COLS = 3
const GAP = 10
const CARD_W = (W - PAD * 2 - GAP * 2) / COLS
const CARD_H = 70

function typeIcon(type, color) {
  if (type === 'movie') {
    return `<g transform="translate(17 14)" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m0 2 13-3 1 4-13 3z"/><path d="M1 6h13v9H1z"/><path d="m4 1 2 4m3-5 2 4"/>
    </g>`
  }
  return `<g transform="translate(17 14)" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="1" width="14" height="11" rx="2"/><path d="m4-2 3 3 3-3M4 15h6"/>
  </g>`
}

function buildCard(item, col, row) {
  const x = PAD + col * (CARD_W + GAP)
  const y = TOP + row * (CARD_H + GAP)
  const color = item.type === 'movie' ? C.blue : C.peach
  const typeLabel = item.type === 'movie' ? 'Movie' : 'Show'
  const title = escapeXml(truncate(item.title, 30))
  const year = escapeXml(String(item.year || ''))
  const when = escapeXml(relativeDate(item.watchedAt))

  return `<g transform="translate(${x},${y})">
    <rect width="${CARD_W}" height="${CARD_H}" rx="9" fill="${C.deep}" stroke="${C.grid}" stroke-width="1"/>
    <rect width="3" height="${CARD_H}" rx="1.5" fill="${color}"/>
    ${typeIcon(item.type, color)}
    <text x="38" y="24" fill="${color}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="10.5" font-weight="700">${typeLabel}</text>
    <text x="14" y="46" fill="${C.text}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="13" font-weight="700">${title}</text>
    <text x="14" y="61" fill="${C.subtext}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="10.5">${year}</text>
    <text x="${CARD_W - 12}" y="61" text-anchor="end" fill="${C.muted}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="10.5">${when}</text>
  </g>`
}

function buildFallbackSVG(message = 'No recent history available') {
  return `<svg width="${W}" height="120" viewBox="0 0 ${W} 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Recently watched unavailable">
  <rect x=".75" y=".75" width="${W - 1.5}" height="118.5" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
  <text x="${W / 2}" y="65" text-anchor="middle" fill="${C.muted}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="14">${escapeXml(message)}</text>
</svg>`
}

function buildSVG(items) {
  if (!items.length) return buildFallbackSVG()

  const cards = items.map((item, i) => buildCard(item, i % COLS, Math.floor(i / COLS))).join('\n')
  return `<!-- auto-generated by .github/scripts/generate-recently-watched.mjs -->
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="BlackSpirits recently watched on Simkl">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.purple}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.peach}"/>
    </linearGradient>
  </defs>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="${C.text}" font-size="20" font-weight="700">Recently Watched</text>
    <text x="22" y="67" fill="${C.muted}" font-size="11.5">Latest 6 items from Simkl</text>
    <text x="${W - 22}" y="48" text-anchor="end" fill="${C.blue}" font-size="10.5" font-weight="700">Auto-updated daily</text>
  </g>
  ${cards}
</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  if (!CLIENT_ID || !ACCESS_TOKEN) {
    throw new Error('SIMKL_CLIENT_ID or SIMKL_ACCESS_TOKEN not set')
  }

  const items = await fetchHistory()
  const svg = buildSVG(items)
  writeFileSync(OUT_FILE, svg, 'utf8')
  console.log(`Generated ${OUT_FILE} with ${items.length} items`)
}

main().catch((err) => {
  console.error(err)
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, buildFallbackSVG('Failed to load Simkl history'), 'utf8')
  process.exit(1)
})
