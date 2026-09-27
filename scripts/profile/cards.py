from __future__ import annotations

import math
from datetime import date
from xml.sax.saxutils import escape
from theme import BG,BG_DEEP,SURFACE,BORDER,TEXT,SUBTEXT,MUTED,PURPLE,BLUE,PEACH,TEAL,YELLOW,compact

def _head(w,h,title,desc):
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>
  <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{PURPLE}"/><stop offset=".55" stop-color="{BLUE}"/><stop offset="1" stop-color="{PEACH}"/>
  </linearGradient></defs>'''

def _frame(w,h):
    return f'''<rect x=".75" y=".75" width="{w-1.5}" height="{h-1.5}" rx="12" fill="{BG}" stroke="{BORDER}" stroke-width="1.5"/>
  <rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>'''

def _fmt(d):
    return "—" if not d else f"{d.day} {d.strftime('%b')}"

def _range(a,b):
    if not a or not b: return "No active streak"
    return _fmt(a) if a==b else f"{_fmt(a)} · {_fmt(b)}"

def overview(d,username):
    level=escape(d["rank"])
    frac=max(.08,min(.95,1-d["rank_pct"]/100))
    circ=2*math.pi*34; dash=circ*frac; gap=circ-dash
    desc=f'{d["stars"]} stars, {d["commits"]} commits, {d["prs"]} pull requests, {d["issues"]} issues, rank {level}.'
    return _head(467,195,f"{username} GitHub Overview",desc)+_frame(467,195)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">GitHub Overview</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">@{escape(username)} · live profile snapshot</text>
    <g transform="translate(22 89)">
      <g><text x="0" y="14" fill="{PURPLE}" font-size="19" font-weight="750">{compact(d["stars"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Stars</text></g>
      <g transform="translate(82 0)"><text x="0" y="14" fill="{BLUE}" font-size="19" font-weight="750">{compact(d["commits"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Commits</text></g>
      <g transform="translate(178 0)"><text x="0" y="14" fill="{TEAL}" font-size="19" font-weight="750">{compact(d["prs"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Pull requests</text></g>
      <g transform="translate(260 0)"><text x="0" y="14" fill="{YELLOW}" font-size="19" font-weight="750">{compact(d["issues"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Issues</text></g>
    </g>
    <line x1="22" y1="137.5" x2="330" y2="137.5" stroke="{SURFACE}"/>
    <text x="22" y="160" fill="{TEXT}" font-size="13" font-weight="600">{d["contrib_repos"]} repositories</text>
    <text x="121" y="160" fill="{MUTED}" font-size="11.5">contributed to in the last year</text>
    <g transform="translate(407 98)">
      <circle cx="0" cy="0" r="42" fill="{BG_DEEP}" stroke="{BORDER}" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="34" fill="none" stroke="{SURFACE}" stroke-width="7"/>
      <circle cx="0" cy="0" r="34" fill="none" stroke="{PEACH}" stroke-width="7" stroke-linecap="round" stroke-dasharray="{dash:.1f} {gap:.1f}" transform="rotate(-90)"/>
      <text x="0" y="7" text-anchor="middle" fill="{TEXT}" font-size="25" font-weight="800">{level}</text>
      <text x="0" y="60" text-anchor="middle" fill="{PEACH}" font-size="10.5" font-weight="700">PROFILE RANK</text>
    </g>
  </g></svg>'''

def languages(d,username):
    langs=list(d["languages"][:4])
    while len(langs)<4: langs.append({"name":"—","pct":0.0,"color":SURFACE})
    x=22; rects=[]
    for lang in langs:
        w=423*lang["pct"]/100
        rects.append(f'<rect x="{x:.2f}" y="80" width="{w:.2f}" height="10" fill="{lang["color"]}"/>')
        x+=w
    positions=((22,112),(242,112),(22,148),(242,148)); items=[]
    for lang,(x,y) in zip(langs,positions):
        items.append(f'''<circle cx="{x+5}" cy="{y+5}" r="5" fill="{lang["color"]}"/>
    <text x="{x+18}" y="{y+9}" fill="{TEXT}" font-size="13" font-weight="650">{escape(lang["name"])}</text>
    <text x="{x+132}" y="{y+9}" fill="{MUTED}" font-size="12">{lang["pct"]:.2f}%</text>''')
    desc=", ".join(f'{x["name"]} {x["pct"]:.2f} percent' for x in langs if x["name"]!="—")
    return _head(467,195,f"{username} Languages",desc)+f'''
  <clipPath id="bar"><rect x="22" y="80" width="423" height="10" rx="5"/></clipPath>'''+_frame(467,195)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Languages</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Repository language distribution</text>
    <g clip-path="url(#bar)">{"".join(rects)}</g>{"".join(items)}
  </g></svg>'''

def streak(d,username):
    created=d["created"]; ring=163 if d["current"] else 0
    desc=f'{d["total"]} total contributions, current streak {d["current"]} days, longest streak {d["longest"]} days.'
    return _head(956,195,f"{username} Contribution Streak",desc)+_frame(956,195)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Streak</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Consistency across your GitHub history</text>
    <line x1="318.5" y1="91" x2="318.5" y2="170" stroke="{SURFACE}"/><line x1="637.5" y1="91" x2="637.5" y2="170" stroke="{SURFACE}"/>
    <g text-anchor="middle">
      <g transform="translate(159 0)">
        <text x="0" y="119" fill="{TEXT}" font-size="30" font-weight="800">{compact(d["total"])}</text>
        <text x="0" y="143" fill="{SUBTEXT}" font-size="13" font-weight="600">Total Contributions</text>
        <text x="0" y="164" fill="{MUTED}" font-size="10.5">{created.day} {created.strftime("%b %Y")} · Present</text>
      </g>
      <g transform="translate(478 0)">
        <circle cx="0" cy="109" r="31" fill="{BG_DEEP}" stroke="{SURFACE}" stroke-width="6"/>
        <circle cx="0" cy="109" r="31" fill="none" stroke="{PEACH}" stroke-width="6" stroke-linecap="round" stroke-dasharray="{ring} {195-ring}" transform="rotate(-90 0 109)"/>
        <path d="M0 73 C-5 78 -7 83 -4 88 C-1 84 2 82 4 77 C8 82 9 87 6 91 C12 88 14 82 11 76 C8 72 4 69 4 65 C1 67 -1 70 0 73Z" fill="{PEACH}"/>
        <text x="0" y="117" fill="{TEXT}" font-size="27" font-weight="800">{d["current"]}</text>
        <text x="0" y="166" fill="{PURPLE}" font-size="12.5" font-weight="700">Current Streak</text>
        <text x="0" y="181" fill="{MUTED}" font-size="10.5">{_range(d["current_start"],d["current_end"])}</text>
      </g>
      <g transform="translate(797 0)">
        <text x="0" y="119" fill="{TEXT}" font-size="30" font-weight="800">{d["longest"]}</text>
        <text x="0" y="143" fill="{SUBTEXT}" font-size="13" font-weight="600">Longest Streak</text>
        <text x="0" y="164" fill="{MUTED}" font-size="10.5">{_range(d["longest_start"],d["longest_end"])}</text>
      </g>
    </g>
  </g></svg>'''
def activity(d,username):
    data=d["activity"]; W,H=956,330; left,right,top,bottom=62,25,95,50
    pw=W-left-right; ph=H-top-bottom; peak=max((x["count"] for x in data),default=0)
    ymax=max(50,int(math.ceil(peak/50))*50)
    if peak>500: ymax=int(math.ceil(peak/100))*100
    pts=[(left+pw*i/(len(data)-1),top+ph*(1-item["count"]/ymax)) for i,item in enumerate(data)]
    line="M "+" L ".join(f"{x:.2f},{y:.2f}" for x,y in pts)
    area=line+f" L {pts[-1][0]:.2f},{top+ph:.2f} L {pts[0][0]:.2f},{top+ph:.2f} Z"
    step=100 if ymax>=500 else 50; grid=[]; labels=[]
    for value in range(0,ymax+1,step):
        y=top+ph*(1-value/ymax)
        grid.append(f'<line x1="{left}" x2="{W-right}" y1="{y:.2f}" y2="{y:.2f}" stroke="{SURFACE}" stroke-width="1"/>')
        labels.append(f'<text x="{left-12}" y="{y+4:.2f}" text-anchor="end" fill="{MUTED}" font-size="10.5">{value}</text>')
    xlabels=[]
    for idx in (0,4,8,12,16,20,24,28,30):
        x,_=pts[idx]
        xlabels.append(f'<text x="{x:.2f}" y="{H-24}" text-anchor="middle" fill="{MUTED}" font-size="10.5">{data[idx]["date"].day}</text>')
    max_idx=max(range(len(data)),key=lambda i:data[i]["count"]); points=[]
    for i,(x,y) in enumerate(pts):
        points.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{3.6 if i==max_idx else 2.4}" fill="{PEACH if i==max_idx else BLUE}" stroke="{BG}" stroke-width="1.5"/>')
    mx,my=pts[max_idx]; total=sum(x["count"] for x in data)
    return f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">{escape(username)} Contribution Activity</title><desc id="desc">GitHub contribution activity for the last 31 days. Peak {peak} contributions.</desc>
  <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{PURPLE}"/><stop offset=".55" stop-color="{BLUE}"/><stop offset="1" stop-color="{PEACH}"/></linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{PURPLE}" stop-opacity=".28"/><stop offset="1" stop-color="{PURPLE}" stop-opacity="0"/></linearGradient></defs>
  {_frame(W,H)}
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Activity</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Last 31 days · {total:,} contributions in this window</text>
    {"".join(grid)}{"".join(labels)}{"".join(xlabels)}
    <path d="{area}" fill="url(#area)"/><path d="{line}" fill="none" stroke="{PURPLE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    {"".join(points)}
    <g transform="translate({mx:.2f} {my:.2f})"><rect x="-25" y="-34" width="50" height="22" rx="7" fill="{BG_DEEP}" stroke="{PEACH}"/><text x="0" y="-19" text-anchor="middle" fill="{PEACH}" font-size="11" font-weight="700">{peak}</text></g>
    <text x="{W-right}" y="48" text-anchor="end" fill="{PEACH}" font-size="11.5" font-weight="700">Peak · {peak}</text>
  </g></svg>'''
