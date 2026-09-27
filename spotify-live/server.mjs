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

function render({ artist = 'Spotify', song = 'Nothing playing right now', status = 'Spotify', cover = '' }) {
  const songText = shorten(song, 38)
  const artistText = shorten(artist, 42)
  const coverMarkup = cover
    ? '<defs><clipPath id="cover"><rect x="24" y="72" width="214" height="214" rx="13"/></clipPath></defs>' +
      '<image href="data:image/png;base64,' + cover + '" x="24" y="72" width="214" height="214" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>'
    : '<rect x="24" y="72" width="214" height="214" rx="13" fill="' + C.deep + '" stroke="' + C.surface + '"/>' +
      '<circle cx="131" cy="179" r="58" fill="' + C.green + '" opacity=".10"/>' +
      '<path d="M104 202v-58l50-10v58M104 174c-18 0-24 21-6 26 15 3 21-9 21-20M154 165c-18 0-24 21-6 26 15 3 21-9 21-20" fill="none" stroke="' + C.green + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
  const heights = [10,17,13,26,19,34,22,29,14,24,32,17,27,13,21,30,17,25,11,20,28,15,24,13,19,26,14,22,17,12,25,18,14,29,20,15,23,13]
  const waveform = status === 'Now playing'
    ? heights.map((h, i) => {
        const color = i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.peach
        return '<rect x="' + (282 + i * 12) + '" y="' + (252 - h) + '" width="5" height="' + h + '" rx="2.5" fill="' + color + '" opacity="' + (0.52 + (i % 4) * 0.1) + '"/>'
      }).join('')
    : '<line x1="282" y1="234" x2="740" y2="234" stroke="' + C.surface + '"/>'
  const spotifyLogo = '<circle cx="0" cy="0" r="25" fill="' + C.green + '"/>' +
    '<path d="M-13 -6c9-3 20-2 28 2M-11 2c7-2 16-1 23 2M-9 9c5.5-1 12-.4 17 1.5" fill="none" stroke="' + C.deep + '" stroke-width="3" stroke-linecap="round"/>'
  return '<svg width="956" height="310" viewBox="0 0 956 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) + ': ' + esc(songText) + ' by ' + esc(artistText) + '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.purple + '"/><stop offset=".55" stop-color="' + C.blue + '"/><stop offset="1" stop-color="' + C.peach + '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="954.5" height="308.5" rx="12" fill="' + C.bg + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="Segoe UI, Ubuntu, Arial, sans-serif">' +
    '<text x="22" y="48" fill="' + C.text + '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="64" fill="' + C.muted + '" font-size="10.5">Now playing / recently played</text>' +
    coverMarkup +
    '<text x="282" y="112" fill="' + C.green + '" font-size="10.5" font-weight="800">' + esc(status).toUpperCase() + '</text>' +
    '<text x="282" y="158" fill="' + C.text + '" font-size="34" font-weight="800">' + esc(songText) + '</text>' +
    '<text x="282" y="190" fill="' + C.sub + '" font-size="18" font-weight="650">' + esc(artistText) + '</text>' +
    waveform +
    '<text x="282" y="278" fill="' + C.muted + '" font-size="10.5">Click the card to open my Spotify profile</text>' +
    '<g transform="translate(875 46)">' + spotifyLogo + '</g>' +
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
