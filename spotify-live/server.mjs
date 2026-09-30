import http from 'node:http'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

const PORT = Number(process.env.PORT || 10000)
const UID = '11175393066'
const LEGACY_SOURCE =
  'https://spotify-github-profile.kittinanx.com/api/view?uid=' +
  UID +
  '&cover_image=true&theme=default&background_color=1e1e2e&bar_color=cba6f7&bar_color_cover=false&border_radius=12&show_offline=true'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || ''
const LOGIN_SECRET = process.env.LOGIN_SECRET || ''
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  'https://blackspirits-spotify-card.onrender.com/callback'
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://blackspirits.github.io'
const SPOTIFY_PROFILE = 'https://open.spotify.com/user/' + UID
const SCOPES = ['user-read-currently-playing', 'user-read-recently-played']

// Copy of scripts/profile/theme.json, written by static_assets.py.
const THEME = JSON.parse(readFileSync(new URL('./theme.json', import.meta.url), 'utf8'))
const C = {
  bg: THEME.bg,
  deep: THEME.bgDeep,
  border: THEME.border,
  surface: THEME.surface,
  text: THEME.text,
  sub: THEME.subtext,
  muted: THEME.muted,
  green: THEME.green,
  blue: THEME.blue,
  purple: THEME.purple,
  peach: THEME.peach,
}

let tokenCache = { value: '', expiresAt: 0 }
let nowCache = { value: null, expiresAt: 0 }
let staleNow = null
const coverCache = new Map()

function spotifyConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && refreshToken)
}

function decodeEntities(s = '') {
  let value = String(s)

  // Legacy upstream data can be encoded more than once (for example,
  // &amp;#x27;). Decode a few bounded passes so numeric and named entities
  // become real Unicode before the SVG layer escapes them again.
  for (let pass = 0; pass < 3; pass++) {
    const next = value
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
        const codePoint = Number.parseInt(hex, 16)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : _
      })
      .replace(/&#([0-9]+);?/g, (_, decimal) => {
        const codePoint = Number.parseInt(decimal, 10)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : _
      })
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')

    if (next === value) break
    value = next
  }

  return value.replace(/<[^>]+>/g, '').trim()
}

function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeHtml(s = '') {
  return esc(s).replaceAll("'", '&#39;')
}

function shorten(s = '', max = 40) {
  const value = String(s)
  return value.length > max ? value.slice(0, max - 1) + '…' : value
}

function between(source, left, right) {
  const start = source.indexOf(left)
  if (start < 0) return ''
  const from = start + left.length
  const end = source.indexOf(right, from)
  return end < 0 ? '' : decodeEntities(source.slice(from, end))
}

function legacyCoverFrom(svg) {
  const classPos = svg.indexOf('class="cover"')
  if (classPos < 0) return ''
  const tagStart = svg.lastIndexOf('<img', classPos)
  const tagEnd = svg.indexOf('>', classPos)
  if (tagStart < 0 || tagEnd < 0) return ''
  const tag = svg.slice(tagStart, tagEnd + 1)
  const token = 'data:image/png;base64,'
  const start = tag.indexOf(token)
  if (start < 0) return ''
  const from = start + token.length
  const end = tag.indexOf('"', from)
  if (end < 0) return ''
  return 'data:image/png;base64,' + tag.slice(from, end).replace(/\s+/g, '')
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': PUBLIC_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

function html(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(body)
}

function redirect(res, target) {
  res.writeHead(302, {
    Location: target,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  })
  res.end()
}

function signState(timestamp) {
  return crypto.createHmac('sha256', LOGIN_SECRET).update(timestamp).digest('hex')
}

function makeState() {
  const timestamp = String(Date.now())
  return timestamp + '.' + signState(timestamp)
}

function validState(state) {
  if (!LOGIN_SECRET || !state || !state.includes('.')) return false
  const [timestamp, signature] = state.split('.', 2)
  if (!/^\d+$/.test(timestamp) || Date.now() - Number(timestamp) > 10 * 60 * 1000) {
    return false
  }
  const expected = signState(timestamp)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function tokenRequest(params) {
  const auth = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10_000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      'Spotify token request failed: ' +
        response.status +
        ' ' +
        (payload.error_description || payload.error || ''),
    )
  }
  return payload
}

async function getAccessToken(force = false) {
  if (!spotifyConfigured()) {
    const error = new Error('Spotify is not configured')
    error.code = 'NOT_CONFIGURED'
    throw error
  }
  if (!force && tokenCache.value && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.value
  }

  const payload = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  if (payload.refresh_token) refreshToken = payload.refresh_token
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
  }
  return tokenCache.value
}

async function spotifyFetch(path, retry = true) {
  const token = await getAccessToken()
  const response = await fetch('https://api.spotify.com/v1' + path, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(10_000),
  })
  if (response.status === 401 && retry) {
    tokenCache = { value: '', expiresAt: 0 }
    await getAccessToken(true)
    return spotifyFetch(path, false)
  }
  return response
}

function trackPayload(item) {
  if (!item) return null
  const album = item.album || item.show || {}
  const artists =
    Array.isArray(item.artists) && item.artists.length
      ? item.artists.map((artist) => artist.name)
      : item.show?.name
        ? [item.show.name]
        : []
  const images = album.images || item.images || []
  return {
    name: item.name || '',
    artists,
    album: album.name || '',
    image: images[0]?.url || '',
    url: item.external_urls?.spotify || SPOTIFY_PROFILE,
  }
}

async function fetchNowPlaying() {
  if (nowCache.value && Date.now() < nowCache.expiresAt) return nowCache.value

  try {
    const current = await spotifyFetch('/me/player/currently-playing')
    if (current.status === 200) {
      const data = await current.json()
      const track = trackPayload(data.item)
      if (track) {
        const value = {
          state: data.is_playing ? 'playing' : 'paused',
          track,
          progress_ms: Number(data.progress_ms) || 0,
          duration_ms: Number(data.item?.duration_ms) || 0,
          fetched_at: new Date().toISOString(),
        }
        staleNow = value
        nowCache = { value, expiresAt: Date.now() + 15_000 }
        return value
      }
    } else if (current.status !== 204) {
      throw new Error('Spotify currently-playing failed: ' + current.status)
    }

    const recent = await spotifyFetch('/me/player/recently-played?limit=1')
    if (!recent.ok) throw new Error('Spotify recently-played failed: ' + recent.status)
    const data = await recent.json()
    const latest = data.items?.[0]
    const value = latest?.track
      ? {
          state: 'recent',
          track: trackPayload(latest.track),
          progress_ms: 0,
          duration_ms: Number(latest.track.duration_ms) || 0,
          played_at: latest.played_at || null,
          fetched_at: new Date().toISOString(),
        }
      : {
          state: 'offline',
          track: null,
          progress_ms: 0,
          duration_ms: 0,
          fetched_at: new Date().toISOString(),
        }
    staleNow = value
    nowCache = { value, expiresAt: Date.now() + 15_000 }
    return value
  } catch (error) {
    if (staleNow) return staleNow
    throw error
  }
}

async function coverDataUri(url) {
  if (!url) return ''
  const cached = coverCache.get(url)
  if (cached && Date.now() < cached.expiresAt) return cached.value

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!response.ok) return ''
  const type = response.headers.get('content-type') || 'image/jpeg'
  const bytes = Buffer.from(await response.arrayBuffer())
  const value = 'data:' + type + ';base64,' + bytes.toString('base64')
  coverCache.clear()
  coverCache.set(url, { value, expiresAt: Date.now() + 30 * 60 * 1000 })
  return value
}

// Simple Icons "spotify" mark (24×24).
const SPOTIFY_ICON =
  'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'

const W = THEME.cardWidth
const H = 258
const COVER = { x: 22, y: 86, size: 150 }
const TEXT_X = 196

function render({
  artist = 'Spotify',
  song = 'Nothing playing right now',
  status = 'Spotify',
  cover = '',
}) {
  const songText = shorten(song, 28)
  const artistText = shorten(artist, 40)
  const { x: cx, y: cy, size } = COVER
  const coverMarkup = cover
    ? '<rect x="' +
      cx +
      '" y="' +
      cy +
      '" width="' +
      size +
      '" height="' +
      size +
      '" rx="12" fill="' +
      C.deep +
      '"/>' +
      '<image href="' +
      esc(cover) +
      '" x="' +
      cx +
      '" y="' +
      cy +
      '" width="' +
      size +
      '" height="' +
      size +
      '" preserveAspectRatio="xMidYMid meet"/>' +
      '<rect x="' +
      cx +
      '" y="' +
      cy +
      '" width="' +
      size +
      '" height="' +
      size +
      '" rx="12" fill="none" stroke="' +
      C.surface +
      '"/>'
    : '<rect x="' +
      cx +
      '" y="' +
      cy +
      '" width="' +
      size +
      '" height="' +
      size +
      '" rx="12" fill="' +
      C.deep +
      '" stroke="' +
      C.surface +
      '"/>' +
      '<g transform="translate(' +
      (cx + size / 2 - 30) +
      ' ' +
      (cy + size / 2 - 30) +
      ') scale(2.5)" fill="none" stroke="' +
      C.green +
      '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g>'

  const heights = [
    10, 17, 13, 26, 19, 34, 22, 29, 14, 24, 32, 17, 27, 13, 21, 30, 17, 25, 11,
    20, 28, 15, 24, 13, 19, 26, 14, 22, 17, 12, 25, 18, 14, 29, 20, 15, 23, 13,
  ]
  const bottom = cy + size - 10
  const waveform =
    status === 'Now playing'
      ? heights
          .map((h, i) => {
            const color = i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.peach
            const h2 = Math.max(7, Math.round(h * (0.45 + (i % 5) * 0.08)))
            const h3 = Math.max(8, Math.round(h * (0.65 + (i % 3) * 0.1)))
            const dur = (0.72 + (i % 7) * 0.09).toFixed(2)
            return (
              '<rect x="' +
              (TEXT_X + i * 12) +
              '" y="' +
              (bottom - h) +
              '" width="5" height="' +
              h +
              '" rx="2.5" fill="' +
              color +
              '" opacity="' +
              (0.52 + (i % 4) * 0.1) +
              '">' +
              '<animate attributeName="height" values="' +
              h +
              ';' +
              h2 +
              ';' +
              h3 +
              ';' +
              h +
              '" dur="' +
              dur +
              's" repeatCount="indefinite"/>' +
              '<animate attributeName="y" values="' +
              (bottom - h) +
              ';' +
              (bottom - h2) +
              ';' +
              (bottom - h3) +
              ';' +
              (bottom - h) +
              '" dur="' +
              dur +
              's" repeatCount="indefinite"/>' +
              '</rect>'
            )
          })
          .join('')
      : '<line x1="' +
        TEXT_X +
        '" y1="' +
        (bottom - 12) +
        '" x2="' +
        (W - 22) +
        '" y2="' +
        (bottom - 12) +
        '" stroke="' +
        C.surface +
        '"/>'

  const spotifyLogo =
    '<circle r="19" fill="#000"/>' +
    '<path transform="translate(-20 -20) scale(1.6667)" fill="#1ED760" d="' +
    SPOTIFY_ICON +
    '"/>'

  return (
    '<svg width="' +
    W +
    '" height="' +
    H +
    '" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) +
    ': ' +
    esc(songText) +
    ' by ' +
    esc(artistText) +
    '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' +
    C.purple +
    '"/><stop offset=".55" stop-color="' +
    C.blue +
    '"/><stop offset="1" stop-color="' +
    C.peach +
    '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="' +
    (W - 1.5) +
    '" height="' +
    (H - 1.5) +
    '" rx="12" fill="' +
    C.bg +
    '" stroke="' +
    C.border +
    '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="' +
    THEME.font +
    '">' +
    '<text x="22" y="48" fill="' +
    C.text +
    '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="68" fill="' +
    C.muted +
    '" font-size="12">Now playing / recently played</text>' +
    coverMarkup +
    '<text x="' +
    TEXT_X +
    '" y="110" fill="#1ED760" font-size="11.5" font-weight="800" letter-spacing=".8">' +
    esc(status).toUpperCase() +
    '</text>' +
    '<text x="' +
    TEXT_X +
    '" y="146" fill="' +
    C.text +
    '" font-size="28" font-weight="800">' +
    esc(songText) +
    '</text>' +
    '<text x="' +
    TEXT_X +
    '" y="174" fill="' +
    C.sub +
    '" font-size="15" font-weight="650">' +
    esc(artistText) +
    '</text>' +
    waveform +
    '<g transform="translate(' +
    (W - 44) +
    ' 44)">' +
    spotifyLogo +
    '</g>' +
    '</g></svg>'
  )
}

async function getLegacyData() {
  const response = await fetch(LEGACY_SOURCE, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'BlackSpirits-live-spotify-card',
      'Cache-Control': 'no-cache',
    },
  })
  if (!response.ok) throw new Error('legacy upstream ' + response.status)

  const svg = await response.text()
  if (svg.startsWith('Error:')) throw new Error(svg)

  return {
    artist: between(svg, '<div class="artist">', '</div>'),
    song: between(svg, '<div class="song">', '</div>'),
    status: svg.includes('Now playing on')
      ? 'Now playing'
      : svg.includes('Recently played on')
        ? 'Recently played'
        : 'Spotify',
    cover: legacyCoverFrom(svg),
  }
}

async function getOfficialCardData() {
  const data = await fetchNowPlaying()
  if (!data.track) return { status: 'Offline' }
  const status =
    data.state === 'playing'
      ? 'Now playing'
      : data.state === 'paused'
        ? 'Paused'
        : 'Recently played'
  return {
    artist: data.track.artists.join(', '),
    song: data.track.name,
    status,
    cover: await coverDataUri(data.track.image),
  }
}

async function getCardData() {
  if (spotifyConfigured()) {
    try {
      return await getOfficialCardData()
    } catch (error) {
      console.error('official Spotify API:', error.message)
    }
  }
  return getLegacyData()
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})

  const url = new URL(req.url, 'http://localhost')

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
    return res.end('ok')
  }

  if (url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      spotify_configured: spotifyConfigured(),
      login_configured: Boolean(LOGIN_SECRET),
      source: spotifyConfigured() ? 'spotify-web-api' : 'legacy-fallback',
    })
  }

  if (url.pathname === '/now-playing') {
    if (!spotifyConfigured()) {
      return json(res, 503, { state: 'offline', configured: false })
    }
    try {
      return json(res, 200, await fetchNowPlaying())
    } catch (error) {
      console.error('now-playing:', error.message)
      return json(res, 502, { state: 'offline' })
    }
  }

  if (url.pathname === '/open') {
    if (spotifyConfigured()) {
      try {
        const data = await fetchNowPlaying()
        if (data.track?.url) return redirect(res, data.track.url)
      } catch (error) {
        console.error('open:', error.message)
      }
    }
    return redirect(res, SPOTIFY_PROFILE)
  }

  if (url.pathname === '/login') {
    if (!LOGIN_SECRET || url.searchParams.get('token') !== LOGIN_SECRET) {
      return html(res, 403, '<h1>Forbidden</h1>')
    }
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return html(res, 503, '<h1>Spotify client credentials are not configured.</h1>')
    }

    const authorize = new URL('https://accounts.spotify.com/authorize')
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('client_id', CLIENT_ID)
    authorize.searchParams.set('scope', SCOPES.join(' '))
    authorize.searchParams.set('redirect_uri', REDIRECT_URI)
    authorize.searchParams.set('state', makeState())
    authorize.searchParams.set('show_dialog', 'true')
    return redirect(res, authorize.toString())
  }

  if (url.pathname === '/callback') {
    const state = url.searchParams.get('state') || ''
    const code = url.searchParams.get('code') || ''
    if (!validState(state) || !code) {
      return html(res, 400, '<h1>Invalid OAuth callback.</h1>')
    }

    try {
      const payload = await tokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      })
      if (!payload.refresh_token) {
        return html(res, 500, '<h1>No refresh token was returned.</h1>')
      }

      refreshToken = payload.refresh_token
      tokenCache = {
        value: payload.access_token || '',
        expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
      }

      const safe = escapeHtml(payload.refresh_token)
      return html(
        res,
        200,
        '<!doctype html><meta charset="utf-8"><title>Spotify connected</title>' +
          '<body style="font-family:system-ui;background:#11111b;color:#cdd6f4;padding:32px;max-width:760px;margin:auto">' +
          '<h1>Spotify connected</h1>' +
          '<p>Copy this refresh token directly into the Render environment variable <code>SPOTIFY_REFRESH_TOKEN</code>. Do not share it in chat or commit it to GitHub.</p>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;background:#181825;padding:16px;border-radius:10px">' +
          safe +
          '</pre><p>After saving the environment variable, the official Spotify API becomes the source for both the README card and the portfolio Now Playing block.</p></body>',
      )
    } catch (error) {
      console.error('callback:', error.message)
      return html(res, 502, '<h1>Spotify authorization failed.</h1>')
    }
  }

  if (url.pathname !== '/' && url.pathname !== '/card.svg') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('not found')
  }

  try {
    const data = await getCardData()
    const svg = render(data)
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(svg)
  } catch (error) {
    console.error('card:', error.message)
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(render({ status: 'Offline' }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('Spotify card listening on ' + PORT)
})
