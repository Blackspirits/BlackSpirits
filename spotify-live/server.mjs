import http from 'node:http'

const PORT = process.env.PORT || 10000
const UID = '11175393066'
const SOURCE =
  'https://spotify-github-profile.kittinanx.com/api/view?uid=' +
  UID +
  '&cover_image=true&theme=default&background_color=1e1e2e&bar_color=cba6f7&bar_color_cover=false&border_radius=12&show_offline=false'

const C = {
  bg: '#1e1e2e',
  deep: '#181825',
  border: '#45475a',
  surface: '#313244',
  text: '#cdd6f4',
  sub: '#a6adc8',
  muted: '#7f849c',
  green: '#a6e3a1',
  blue: '#89b4fa',
  purple: '#cba6f7',
  peach: '#fab387',
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

// Same 720px canvas as the other profile cards, so GitHub scales them alike.
const W = 720
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
  const spotifyLogo = '<circle r="20" fill="' + C.green + '"/>' +
    '<path d="M-10.5 -5c7.5-2.4 16-1.6 22.4 1.6M-8.8 1.6c5.6-1.6 12.8-.8 18.4 1.6M-7.2 7.2c4.4-.8 9.6-.3 13.6 1.2" fill="none" stroke="' + C.deep + '" stroke-width="2.6" stroke-linecap="round"/>'
  return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) + ': ' + esc(songText) + ' by ' + esc(artistText) + '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.purple + '"/><stop offset=".55" stop-color="' + C.blue + '"/><stop offset="1" stop-color="' + C.peach + '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="' + (W - 1.5) + '" height="' + (H - 1.5) + '" rx="12" fill="' + C.bg + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="Segoe UI, Ubuntu, Arial, sans-serif">' +
    '<text x="22" y="48" fill="' + C.text + '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="68" fill="' + C.muted + '" font-size="12">Now playing / recently played</text>' +
    coverMarkup +
    '<text x="' + TEXT_X + '" y="110" fill="' + C.green + '" font-size="11.5" font-weight="800" letter-spacing=".8">' + esc(status).toUpperCase() + '</text>' +
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
