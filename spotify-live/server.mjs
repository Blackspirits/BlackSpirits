import http from 'node:http'
import { readFileSync } from 'node:fs'

const PORT = process.env.PORT || 10000
const UID = '11175393066'
const SOURCE =
  'https://spotify-github-profile.kittinanx.com/api/view?uid=' +
  UID +
  '&cover_image=true&theme=default&background_color=1e1e2e&bar_color=cba6f7&bar_color_cover=false&border_radius=12&show_offline=false'

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

function decodeEntities(s = '') {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
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

function coverFrom(svg) {
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
  return tag.slice(from, end).replace(/\s+/g, '')
}

// Simple Icons "spotify" mark (24×24).
const SPOTIFY_ICON = 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'

// Same 720px canvas as the other profile cards, so GitHub scales them alike.
const W = THEME.cardWidth
const H = 258
const COVER = { x: 22, y: 86, size: 150 }
const TEXT_X = 196

function render({ artist = 'Spotify', song = 'Nothing playing right now', status = 'Spotify', cover = '' }) {
  const songText = shorten(song, 28)
  const artistText = shorten(artist, 40)
  const { x: cx, y: cy, size } = COVER
  const coverMarkup = cover
    ? '<defs><clipPath id="cover"><rect x="' + cx + '" y="' + cy + '" width="' + size + '" height="' + size + '" rx="12"/></clipPath></defs>' +
      '<image href="data:image/png;base64,' + cover + '" x="' + cx + '" y="' + cy + '" width="' + size + '" height="' + size + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>' +
      '<rect x="' + cx + '" y="' + cy + '" width="' + size + '" height="' + size + '" rx="12" fill="none" stroke="' + C.surface + '"/>'
    : '<rect x="' + cx + '" y="' + cy + '" width="' + size + '" height="' + size + '" rx="12" fill="' + C.deep + '" stroke="' + C.surface + '"/>' +
      '<g transform="translate(' + (cx + size / 2 - 30) + ' ' + (cy + size / 2 - 30) + ') scale(2.5)" fill="none" stroke="' + C.green + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g>'
  const heights = [10,17,13,26,19,34,22,29,14,24,32,17,27,13,21,30,17,25,11,20,28,15,24,13,19,26,14,22,17,12,25,18,14,29,20,15,23,13]
  const bottom = cy + size - 10
  const waveform = status === 'Now playing'
    ? heights.map((h, i) => {
        const color = i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.peach
        const h2 = Math.max(7, Math.round(h * (0.45 + (i % 5) * 0.08)))
        const h3 = Math.max(8, Math.round(h * (0.65 + (i % 3) * 0.10)))
        const dur = (0.72 + (i % 7) * 0.09).toFixed(2)
        return '<rect x="' + (TEXT_X + i * 12) + '" y="' + (bottom - h) + '" width="5" height="' + h + '" rx="2.5" fill="' + color + '" opacity="' + (0.52 + (i % 4) * 0.1) + '">' +
          '<animate attributeName="height" values="' + h + ';' + h2 + ';' + h3 + ';' + h + '" dur="' + dur + 's" repeatCount="indefinite"/>' +
          '<animate attributeName="y" values="' + (bottom - h) + ';' + (bottom - h2) + ';' + (bottom - h3) + ';' + (bottom - h) + '" dur="' + dur + 's" repeatCount="indefinite"/>' +
          '</rect>'
      }).join('')
    : '<line x1="' + TEXT_X + '" y1="' + (bottom - 12) + '" x2="' + (W - 22) + '" y2="' + (bottom - 12) + '" stroke="' + C.surface + '"/>'
  // Official Spotify icon: brand green with black sound waves.
  const spotifyLogo = '<circle r="19" fill="#000"/>' +
    '<path transform="translate(-20 -20) scale(1.6667)" fill="#1ED760" d="' + SPOTIFY_ICON + '"/>'
  return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) + ': ' + esc(songText) + ' by ' + esc(artistText) + '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.purple + '"/><stop offset=".55" stop-color="' + C.blue + '"/><stop offset="1" stop-color="' + C.peach + '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="' + (W - 1.5) + '" height="' + (H - 1.5) + '" rx="12" fill="' + C.bg + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="' + THEME.font + '">' +
    '<text x="22" y="48" fill="' + C.text + '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="68" fill="' + C.muted + '" font-size="12">Now playing / recently played</text>' +
    coverMarkup +
    '<text x="' + TEXT_X + '" y="110" fill="#1ED760" font-size="11.5" font-weight="800" letter-spacing=".8">' + esc(status).toUpperCase() + '</text>' +
    '<text x="' + TEXT_X + '" y="146" fill="' + C.text + '" font-size="28" font-weight="800">' + esc(songText) + '</text>' +
    '<text x="' + TEXT_X + '" y="174" fill="' + C.sub + '" font-size="15" font-weight="650">' + esc(artistText) + '</text>' +
    waveform +
    '<g transform="translate(' + (W - 44) + ' 44)">' + spotifyLogo + '</g>' +
    '</g></svg>'
}

async function getCard() {
  const response = await fetch(SOURCE, {
    headers: {
      'User-Agent': 'BlackSpirits-live-spotify-card',
      'Cache-Control': 'no-cache',
    },
  })
  if (!response.ok) throw new Error('upstream ' + response.status)

  const svg = await response.text()
  if (svg.startsWith('Error:')) throw new Error(svg)

  const artist = between(svg, '<div class="artist">', '</div>')
  const song = between(svg, '<div class="song">', '</div>')
  const status = svg.includes('Now playing on')
    ? 'Now playing'
    : svg.includes('Recently played on')
      ? 'Recently played'
      : 'Spotify'
  const cover = coverFrom(svg)

  return render({ artist, song, status, cover })
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
    return res.end('ok')
  }

  if (req.url !== '/' && !req.url.startsWith('/card.svg')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('not found')
  }

  try {
    const svg = await getCard()
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(svg)
  } catch {
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(render({ status: 'Offline' }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('Spotify card listening on ' + PORT)
})
