#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUT_DIR = join(ROOT, 'assets', 'generated')
const OUT_FILE = join(OUT_DIR, 'spotify-card.svg')
const UID = '11175393066'
const SOURCE = `https://spotify-github-profile.kittinanx.com/api/view?uid=${UID}&cover_image=true&theme=default&background_color=1e1e2e&bar_color=89b4fa&bar_color_cover=false&border_radius=10&show_offline=false`

const C={bg:'#1e1e2e',deep:'#181825',border:'#45475a',surface:'#313244',text:'#cdd6f4',sub:'#a6adc8',muted:'#7f849c',green:'#a6e3a1',blue:'#89b4fa',purple:'#cba6f7',peach:'#fab387'}

function decodeEntities(s=''){
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/<[^>]+>/g,'').trim()
}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function match(svg,re){const m=svg.match(re);return m?decodeEntities(m[1]):''}

function render({artist='Spotify',song='Nothing playing right now',status='Spotify',cover=''}) {
  const heights=[9,18,13,25,17,31,20,27,14,22,30,16,24,12,19,28,15,23,10,18,26,14,21,12,18,24,13,20,16,11]
  const bars=heights.map((h,i)=>`<rect x="${188+i*12}" y="${200-h}" width="5" height="${h}" rx="2.5" fill="${i%3===0?C.purple:i%3===1?C.blue:C.peach}" opacity="${.55+(i%4)*.1}"/>`).join('')
  const coverMarkup=cover
    ? `<defs><clipPath id="cover"><rect x="22" y="82" width="132" height="132" rx="10"/></clipPath></defs><image href="data:image/png;base64,${cover}" x="22" y="82" width="132" height="132" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)"/>`
    : `<rect x="22" y="82" width="132" height="132" rx="10" fill="${C.deep}" stroke="${C.surface}"/><circle cx="88" cy="148" r="34" fill="${C.green}" opacity=".12"/><path d="M76 160v-34l30-6v34M76 143c-12 0-16 14-4 17 10 2 14-6 14-13M106 137c-12 0-16 14-4 17 10 2 14-6 14-13" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`

  return `<svg width="956" height="240" viewBox="0 0 956 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spotify ${esc(status)}: ${esc(song)} by ${esc(artist)}">
  <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.purple}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.peach}"/></linearGradient></defs>
  <rect x=".75" y=".75" width="954.5" height="238.5" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="${C.text}" font-size="20" font-weight="700">Spotify</text>
    <text x="22" y="67" fill="${C.muted}" font-size="11.5">Music powering the current coding session</text>
    <g transform="translate(815 30)"><circle cx="11" cy="11" r="11" fill="${C.green}"/><path d="M5 8c4-1 9-.7 13 1M6 12c3.5-.8 7.5-.5 11 1M7 16c3-.5 6-.2 9 .8" fill="none" stroke="${C.deep}" stroke-width="1.8" stroke-linecap="round"/><text x="31" y="15" fill="${C.green}" font-size="11" font-weight="700">${esc(status)}</text></g>
    ${coverMarkup}
    <text x="184" y="110" fill="${C.green}" font-size="11" font-weight="700">SPOTIFY · ${esc(status).toUpperCase()}</text>
    <text x="184" y="142" fill="${C.text}" font-size="27" font-weight="800">${esc(song)}</text>
    <text x="184" y="167" fill="${C.sub}" font-size="16" font-weight="600">${esc(artist)}</text>
    <text x="184" y="190" fill="${C.muted}" font-size="10.5">Auto-refreshed from your connected Spotify profile</text>
    ${bars}
  </g>
</svg>`
}

async function main(){
  mkdirSync(OUT_DIR,{recursive:true})
  const response=await fetch(SOURCE,{headers:{'User-Agent':'BlackSpirits-profile-card'}})
  if(!response.ok) throw new Error(`Spotify profile source returned ${response.status}`)
  const svg=await response.text()
  if(svg.startsWith('Error:')) throw new Error(svg)

  const artist=match(svg,/<div class="artist">([\s\S]*?)<\/div>/i)
  const song=match(svg,/<div class="song">([\s\S]*?)<\/div>/i)
  const status=/Now playing on/i.test(svg)?'Now playing':(/Recently played on/i.test(svg)?'Recently played':'Spotify')
  const coverMatch=svg.match(/src="data:image\/png;base64,\s*([^"]+)"[^>]*class="cover"/i)
  const cover=coverMatch?coverMatch[1].replace(/\s+/g,''):''

  writeFileSync(OUT_FILE,render({artist,song,status,cover}),'utf8')
  console.log(`Generated ${OUT_FILE}: ${song || 'offline'} — ${artist || 'Spotify'}`)
}
main().catch((error)=>{
  console.error(error)
  mkdirSync(OUT_DIR,{recursive:true})
  writeFileSync(OUT_FILE,render({status:'Offline'}),'utf8')
  process.exit(1)
})
