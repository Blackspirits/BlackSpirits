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
  const heights = [10,18,13,25,17,34,21,29,14,23,31,18,26,13,20,30,16,25,11,19,28,15,23,13,20,27,14,23,17,12,25,18,15,29,20,16]
  const bars = heights.map((h, i) => {
    const color = i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.peach
    return '<rect x="' + (262 + i * 15) + '" y="' + (246 - h) + '" width="6" height="' + h +
      '" rx="3" fill="' + color + '" opacity="' + (0.45 + (i % 4) * 0.1) + '"/>'
  }).join('')

  const coverMarkup = cover
    ? '<defs><clipPath id="cover"><rect x="24" y="78" width="196" height="196" rx="12"/></clipPath></defs>' +
      '<image href="data:image/png;base64,' + cover + '" x="24" y="78" width="196" height="196" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>'
    : '<rect x="24" y="78" width="196" height="196" rx="12" fill="' + C.deep + '" stroke="' + C.surface + '"/>' +
      '<circle cx="122" cy="176" r="52" fill="' + C.green + '" opacity=".10"/>' +
      '<path d="M100 194v-52l45-9v52M100 168c-16 0-22 19-6 23 14 3 20-8 20-18M145 160c-16 0-22 19-6 23 14 3 20-8 20-18" fill="none" stroke="' + C.green + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'

  return '<svg width="956" height="300" viewBox="0 0 956 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ' +
    esc(status) + ': ' + esc(song) + ' by ' + esc(artist) + '">' +
    '<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C.purple + '"/><stop offset=".55" stop-color="' + C.blue + '"/><stop offset="1" stop-color="' + C.peach + '"/></linearGradient></defs>' +
    '<rect x=".75" y=".75" width="954.5" height="298.5" rx="12" fill="' + C.bg + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
    '<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>' +
    '<g font-family="Segoe UI, Ubuntu, Arial, sans-serif">' +
    '<text x="22" y="48" fill="' + C.text + '" font-size="20" font-weight="700">Spotify</text>' +
    '<text x="22" y="67" fill="' + C.muted + '" font-size="11.5">Now playing / recently played</text>' +
    '<g transform="translate(796 29)"><circle cx="11" cy="11" r="11" fill="' + C.green + '"/>' +
    '<path d="M5 8c4-1 9-.7 13 1M6 12c3.5-.8 7.5-.5 11 1M7 16c3-.5 6-.2 9 .8" fill="none" stroke="' + C.deep + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<text x="31" y="15" fill="' + C.green + '" font-size="11" font-weight="700">' + esc(status) + '</text></g>' +
    coverMarkup +
    '<text x="254" y="118" fill="' + C.green + '" font-size="10.5" font-weight="800">SPOTIFY</text>' +
    '<text x="254" y="160" fill="' + C.text + '" font-size="34" font-weight="800">' + esc(song) + '</text>' +
    '<text x="254" y="190" fill="' + C.sub + '" font-size="18" font-weight="650">' + esc(artist) + '</text>' +
    '<line x1="254" y1="212" x2="912" y2="212" stroke="' + C.surface + '"/>' +
    '<text x="254" y="232" fill="' + C.muted + '" font-size="10.5">Live from your Spotify profile</text>' +
    bars +
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
