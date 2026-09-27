import http from 'node:http'

const PORT = process.env.PORT || 10000
const UID = '11175393066'
const SOURCE = `https://spotify-github-profile.kittinanx.com/api/view?uid=${UID}&cover_image=true&theme=default&background_color=1e1e2e&bar_color=cba6f7&bar_color_cover=false&border_radius=12&show_offline=false`

const C={bg:'#1e1e2e',deep:'#181825',border:'#45475a',surface:'#313244',text:'#cdd6f4',sub:'#a6adc8',muted:'#7f849c',green:'#a6e3a1',blue:'#89b4fa',purple:'#cba6f7',peach:'#fab387'}
function decodeEntities(s=''){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/<[^>]+>/g,'').trim()}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function match(svg,re){const m=svg.match(re);return m?decodeEntities(m[1]):''}

function render({artist='Spotify',song='Nothing playing right now',status='Spotify',cover=''}) {
  const heights=[12,20,16,33,22,41,27,35,18,29,38,21,31,17,25,36,19,30,14,23,34,18,28,16,24,32,17,27,20,15,30,22,18,35,25,19,28,16,24,31]
  const bars=heights.map((h,i)=>`<rect x="${260+i*14}" y="${235-h}" width="6" height="${h}" rx="3" fill="${i%3===0?C.purple:i%3===1?C.blue:C.peach}" opacity="${.5+(i%4)*.12}"/>`).join('')
  const coverMarkup=cover
    ? `<defs><clipPath id="cover"><rect x="24" y="78" width="180" height="180" rx="12"/></clipPath></defs><image href="data:image/png;base64,${cover}" x="24" y="78" width="180" height="180" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>`
    : `<rect x="24" y="78" width="180" height="180" rx="12" fill="${C.deep}" stroke="${C.surface}"/><circle cx="114" cy="168" r="46" fill="${C.green}" opacity=".12"/><path d="M96 185v-46l42-9v46M96 162c-15 0-20 18-5 22 13 2 18-8 18-17M138 154c-15 0-20 18-5 22 13 2 18-8 18-17" fill="none" stroke="${C.green}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`

  return `<svg width="956" height="282" viewBox="0 0 956 282" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ${esc(status)}: ${esc(song)} by ${esc(artist)}">
  <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.purple}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.peach}"/></linearGradient></defs>
  <rect x=".75" y=".75" width="954.5" height="280.5" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="${C.text}" font-size="20" font-weight="700">Spotify</text>
    <text x="22" y="67" fill="${C.muted}" font-size="11.5">Live from your Spotify profile</text>
    <g transform="translate(806 29)"><circle cx="11" cy="11" r="11" fill="${C.green}"/><path d="M5 8c4-1 9-.7 13 1M6 12c3.5-.8 7.5-.5 11 1M7 16c3-.5 6-.2 9 .8" fill="none" stroke="${C.deep}" stroke-width="1.8" stroke-linecap="round"/><text x="31" y="15" fill="${C.green}" font-size="11" font-weight="700">${esc(status)}</text></g>
    ${coverMarkup}
    <text x="238" y="110" fill="${C.green}" font-size="11" font-weight="800">SPOTIFY · ${esc(status).toUpperCase()}</text>
    <text x="238" y="151" fill="${C.text}" font-size="32" font-weight="800">${esc(song)}</text>
    <text x="238" y="181" fill="${C.sub}" font-size="18" font-weight="650">${esc(artist)}</text>
    <text x="238" y="208" fill="${C.muted}" font-size="10.5">Dynamic endpoint · refreshed when GitHub requests the image</text>
    ${bars}
  </g>
</svg>`
}

async function getCard(){
  const response=await fetch(SOURCE,{headers:{'User-Agent':'BlackSpirits-live-spotify-card','Cache-Control':'no-cache'}})
  if(!response.ok) throw new Error(`upstream ${response.status}`)
  const svg=await response.text()
  if(svg.startsWith('Error:')) throw new Error(svg)
  const artist=match(svg,/<div class="artist">([sS]*?)</div>/i)
  const song=match(svg,/<div class="song">([sS]*?)</div>/i)
  const status=/Now playing on/i.test(svg)?'Now playing':(/Recently played on/i.test(svg)?'Recently played':'Spotify')
  const coverMatch=svg.match(/src="data:image/png;base64,s*([^"]+)"[^>]*class="cover"/i)
  const cover=coverMatch?coverMatch[1].replace(/s+/g,''):''
  return render({artist,song,status,cover})
}

const server=http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});return res.end('ok')}
  if(req.url!=='/' && !req.url.startsWith('/card.svg')){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('not found')}
  try{
    const svg=await getCard()
    res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0','CDN-Cache-Control':'no-store','Surrogate-Control':'no-store','Access-Control-Allow-Origin':'*'})
    res.end(svg)
  }catch(error){
    res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'no-store'})
    res.end(render({status:'Offline'}))
  }
})
server.listen(PORT,'0.0.0.0',()=>console.log(`Spotify card listening on ${PORT}`))
