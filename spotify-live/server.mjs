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
  const coverMarkup = cover
    ? '<defs><clipPath id="cover"><rect x="24" y="70" width="170" height="170" rx="12"/></clipPath></defs>' +
      '<image href="data:image/png;base64,' + cover + '" x="24" y="70" width="170" height="170" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>'
    : '<rect x="24" y="70" width="170" height="170" rx="12" fill="' + C.deep + '" stroke="' + C.surface + '"/>' +
      '<circle cx="109" cy="155" r="48" fill="' + C.green + '" opacity=".10"/>' +
      '<path d="M87 174v-48l43-9v48M87 151c-15 0-20 18-5 22 13 2 18-8 18-17M130 143c-15 0-20 18-5 22 13 2 18-8 18-17" fill="none" stroke="' + C.green + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'

  const spotifyLogo = '<circle cx="0" cy="0" r="34" fill="' + C.green + '" fill-opacity=".10"/>' +
    '<circle cx="0" cy="0" r="26" fill="' + C.green + '"/>' +
    '<path d="M-14 -6c10-3 22-2 31 2M-12 2c8-2 18-1 25 2M-10 10c6-1 13-.5 19 2" fill="none" stroke="' + C.deep + '" stroke-width="3.2" stroke-linecap="round"/>'

  const heights = [9,16,12,24,18,31,20,27,13,22,29,15,25,12,19,28,16,23,10,18,26,14,22,12,18,24,13,21,16,11]
  const waveform = status === 'Now playing'
    ? heights.map((h, i) => {
        const color = i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.peach
        return '<rect x="' + (224 + i * 13) + '" y="' + (220 - h) + '" width="5" height="' + h +
          '" rx="2.5" fill="' + color + '" opacity="' + (0.55 + (i % 4) * 0.1) + '"/>'
      }).join('')
    : '<line x1="224" y1="205" x2="610" y2="205" stroke="' + C.surface + '"/>'

  return '<svg width="956" height="260" viewBox="0 0 956 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) + ': ' + esc(song) + ' by ' + esc(artist) + '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.purple + '"/><stop offset=".55" stop-color="' + C.blue + '"/><stop offset="1" stop-color="' + C.peach + '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="954.5" height="258.5" rx="12" fill="' + C.bg + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="Segoe UI, Ubuntu, Arial, sans-serif">' +
    '<text x="22" y="48" fill="' + C.text + '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="64" fill="' + C.muted + '" font-size="10.5">Now playing / recently played</text>' +
    coverMarkup +
    '<text x="224" y="104" fill="' + C.green + '" font-size="10.5" font-weight="800">' + esc(status).toUpperCase() + '</text>' +
    '<text x="224" y="146" fill="' + C.text + '" font-size="32" font-weight="800">' + esc(song) + '</text>' +
    '<text x="224" y="176" fill="' + C.sub + '" font-size="18" font-weight="650">' + esc(artist) + '</text>' +
    waveform +
    '<text x="224" y="239" fill="' + C.muted + '" font-size="10.5">Click the card to open my Spotify profile</text>' +
    '<g transform="translate(846 137)">' + spotifyLogo + '</g>' +
    '<text x="846" y="188" text-anchor="middle" fill="' + C.green + '" font-size="10.5" font-weight="700">SPOTIFY</text>' +
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
