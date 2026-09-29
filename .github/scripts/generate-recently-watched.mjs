#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUT_DIR = join(ROOT, 'assets', 'generated')
const OUT_FILE = join(OUT_DIR, 'recently-watched.svg')

const CLIENT_ID = process.env.SIMKL_CLIENT_ID
const ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN
const LIMIT = 5

// Colours come from the shared profile theme.
const THEME = JSON.parse(readFileSync(join(ROOT, 'scripts', 'profile', 'theme.json'), 'utf8'))
const C = {
  base: THEME.bg,
  deep: THEME.bgDeep,
  border: THEME.border,
  grid: THEME.surface,
  muted: THEME.muted,
  text: THEME.text,
  subtext: THEME.subtext,
  blue: THEME.blue,
  purple: THEME.purple,
  peach: THEME.peach,
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
  if (!res.ok) throw new Error(`Simkl API ${res.status} on ${path}: ${await res.text()}`)
  return res.json()
}

function posterUrl(poster) {
  if (!poster) return ''
  const source = `https://simkl.in/posters/${poster}_c.webp`
  return `https://wsrv.nl/?url=${encodeURIComponent(source)}&w=170&h=250&fit=cover&output=webp`
}

async function imageDataUrl(poster) {
  const url = posterUrl(poster)
  if (!url) return ''
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const type = res.headers.get('content-type') || 'image/webp'
    const bytes = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return ''
  }
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
      poster: m.movie?.poster ?? '',
      watchedAt: m.last_watched_at,
    }))

  const normalisedShows = [...shows, ...anime]
    .filter((s) => s.last_watched_at)
    .map((s) => ({
      type: 'show',
      title: s.show?.title ?? 'Unknown',
      year: s.show?.year ?? '',
      poster: s.show?.poster ?? '',
      watchedAt: s.last_watched_at,
    }))

  const items = [...normalisedMovies, ...normalisedShows]
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(0, LIMIT)

  return Promise.all(items.map(async (item) => ({
    ...item,
    posterData: await imageDataUrl(item.poster),
  })))
}

// Same canvas width as every other profile card, so GitHub scales them alike.
const W = THEME.cardWidth
const H = 340
const PAD = 22
const GAP = 12
const TOP = 88
const CARD_W = (W - PAD * 2 - GAP * 4) / 5
const POSTER_W = 118
const POSTER_H = 174
const FONT = THEME.font

function card(item, index) {
  const x = PAD + index * (CARD_W + GAP)
  const posterX = (CARD_W - POSTER_W) / 2
  const title = escapeXml(truncate(item.title, 17))
  const meta = escapeXml(`${item.type === 'movie' ? 'Movie' : 'Series'}${item.year ? ` · ${item.year}` : ''}`)
  const when = escapeXml(relativeDate(item.watchedAt))
  const clipId = `poster-${index}`

  const artwork = item.posterData
    ? `<image href="${item.posterData}" x="${posterX}" y="0" width="${POSTER_W}" height="${POSTER_H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
    : `<rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9" fill="${C.grid}"/>
       <text x="${CARD_W / 2}" y="${POSTER_H / 2}" text-anchor="middle" fill="${C.muted}" font-size="12">No poster</text>`

  return `<g transform="translate(${x.toFixed(1)},${TOP})">
    <defs><clipPath id="${clipId}"><rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9"/></clipPath></defs>
    ${artwork}
    <rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9" fill="none" stroke="${C.grid}"/>
    <text x="${CARD_W / 2}" y="${POSTER_H + 24}" text-anchor="middle" fill="${C.text}" font-size="12.5" font-weight="700">${title}</text>
    <text x="${CARD_W / 2}" y="${POSTER_H + 42}" text-anchor="middle" fill="${C.subtext}" font-size="11">${meta}</text>
    <text x="${CARD_W / 2}" y="${POSTER_H + 59}" text-anchor="middle" fill="${C.muted}" font-size="11">${when}</text>
  </g>`
}

function fallback(message = 'No recent history available') {
  return `<svg width="${W}" height="120" viewBox="0 0 ${W} 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(message)}">
    <rect x=".75" y=".75" width="${W - 1.5}" height="118.5" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
    <text x="${W / 2}" y="65" text-anchor="middle" fill="${C.muted}" font-family="${FONT}" font-size="14">${escapeXml(message)}</text>
  </svg>`
}

export function build(items) {
  if (!items.length) return fallback()
  return `<!-- auto-generated by .github/scripts/generate-recently-watched.mjs -->
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="BlackSpirits recently watched on Simkl: ${escapeXml(items.map((i) => i.title).join(', '))}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.purple}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.peach}"/>
    </linearGradient>
  </defs>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>
  <g font-family="${FONT}">
    <text x="22" y="48" fill="${C.text}" font-size="20" font-weight="700">Recently Watched</text>
    <text x="22" y="68" fill="${C.muted}" font-size="12">Latest ${items.length} titles from Simkl</text>
    <text x="${W - 22}" y="48" text-anchor="end" fill="${C.blue}" font-size="11.5" font-weight="700">Updated daily</text>
    ${items.map(card).join('\n')}
  </g>
</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  if (!CLIENT_ID || !ACCESS_TOKEN) throw new Error('SIMKL_CLIENT_ID or SIMKL_ACCESS_TOKEN not set')
  const items = await fetchHistory()
  writeFileSync(OUT_FILE, build(items), 'utf8')
  console.log(`Generated ${OUT_FILE} with ${items.length} items`)
}

// Only fetch when run as a script, so build() can be imported for previews.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    // Keep the last good card, but surface the failure in the workflow summary.
    console.log(`::warning title=Simkl refresh failed::${String(err?.message ?? err).split('\n')[0]}`)
    mkdirSync(OUT_DIR, { recursive: true })
    if (!existsSync(OUT_FILE)) {
      writeFileSync(OUT_FILE, fallback('Simkl history temporarily unavailable'), 'utf8')
    }
  })
}
