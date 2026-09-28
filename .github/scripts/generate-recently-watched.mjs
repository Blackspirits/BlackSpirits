#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUT_DIR = join(ROOT, 'assets', 'generated')
const OUT_FILE = join(OUT_DIR, 'recently-watched.svg')

const CLIENT_ID = process.env.SIMKL_CLIENT_ID
const ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN
const LIMIT = 5

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

const W = 956
const H = 370
const PAD = 20
const GAP = 12
const TOP = 82
const CARD_W = (W - PAD * 2 - GAP * 4) / 5
const POSTER_W = 142
const POSTER_H = 210

function card(item, index) {
  const x = PAD + index * (CARD_W + GAP)
  const posterX = (CARD_W - POSTER_W) / 2
  const color = item.type === 'movie' ? C.blue : C.peach
  const title = escapeXml(truncate(item.title, 20))
  const meta = escapeXml(`${item.type === 'movie' ? 'Movie' : 'Series'}${item.year ? ` · ${item.year}` : ''}`)
  const when = escapeXml(relativeDate(item.watchedAt))
  const clipId = `poster-${index}`

  const artwork = item.posterData
    ? `<image href="${item.posterData}" x="${posterX}" y="0" width="${POSTER_W}" height="${POSTER_H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
    : `<rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9" fill="${C.grid}"/>
       <text x="${CARD_W / 2}" y="94" text-anchor="middle" fill="${C.muted}" font-size="11">No poster</text>`

  return `<g transform="translate(${x},${TOP})">
    <defs><clipPath id="${clipId}"><rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9"/></clipPath></defs>
    ${artwork}
    <rect x="${posterX}" width="${POSTER_W}" height="${POSTER_H}" rx="9" fill="none" stroke="${C.grid}"/>
    <circle cx="${posterX + 10}" cy="12" r="4" fill="${color}"/>
    <text x="${CARD_W / 2}" y="233" text-anchor="middle" fill="${C.text}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="12" font-weight="700">${title}</text>
    <text x="${CARD_W / 2}" y="252" text-anchor="middle" fill="${C.subtext}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="9.5">${meta}</text>
    <text x="${CARD_W / 2}" y="270" text-anchor="middle" fill="${C.muted}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="9.5">${when}</text>
  </g>`
}

function fallback(message = 'No recent history available') {
  return `<svg width="${W}" height="120" viewBox="0 0 ${W} 120" xmlns="http://www.w3.org/2000/svg">
    <rect x=".75" y=".75" width="${W - 1.5}" height="118.5" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
    <text x="${W / 2}" y="65" text-anchor="middle" fill="${C.muted}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="14">${escapeXml(message)}</text>
  </svg>`
}

function build(items) {
  if (!items.length) return fallback()
  return `<!-- auto-generated by .github/scripts/generate-recently-watched.mjs -->
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="BlackSpirits recently watched on Simkl">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.purple}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.peach}"/>
    </linearGradient>
  </defs>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="${C.base}" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="20" y="18" width="78" height="3" rx="1.5" fill="url(#accent)"/>
  <text x="20" y="46" fill="${C.text}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="19" font-weight="700">Recently Watched</text>
  <text x="20" y="64" fill="${C.muted}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="10.5">Latest 5 items from Simkl</text>
  <text x="${W - 20}" y="46" text-anchor="end" fill="${C.blue}" font-family="Segoe UI, Ubuntu, Arial, sans-serif" font-size="10" font-weight="700">Auto-updated daily</text>
  ${items.map(card).join('\n')}
</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  if (!CLIENT_ID || !ACCESS_TOKEN) throw new Error('SIMKL_CLIENT_ID or SIMKL_ACCESS_TOKEN not set')
  const items = await fetchHistory()
  writeFileSync(OUT_FILE, build(items), 'utf8')
  console.log(`Generated ${OUT_FILE} with ${items.length} items`)
}

main().catch((err) => {
  console.error('Simkl refresh failed; keeping the last good card:', err)
  mkdirSync(OUT_DIR, { recursive: true })

  if (!existsSync(OUT_FILE)) {
    writeFileSync(OUT_FILE, fallback('Simkl history temporarily unavailable'), 'utf8')
  }

  process.exitCode = 0
})
