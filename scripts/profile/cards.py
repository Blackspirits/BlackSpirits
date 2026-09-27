from __future__ import annotations

import math
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
    if not a or not b:
        return "No active streak"
    return _fmt(a) if a==b else f"{_fmt(a)} · {_fmt(b)}"

def _tier(value,thresholds):
    names=("Bronze","Silver","Gold","Platinum","Diamond")
    colors=("#fab387","#bac2de","#f9e2af","#cba6f7","#89b4fa")
    idx=0
    for i,t in enumerate(thresholds):
        if value>=t:
            idx=i
    if idx>=len(thresholds)-1:
        return names[-1],colors[-1],1.0
    lo=thresholds[idx]
    hi=thresholds[idx+1]
    progress=max(0.0,min(1.0,(value-lo)/(hi-lo)))
    return names[idx],colors[idx],progress

def profile_meta(d,username):
    updated=d["last_update"].strftime("%d %b")
    eye='''<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>'''
    users='''<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'''
    clock='''<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'''
    globe='''<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'''
    code='''<path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/>'''
    items=[
        ("Views",str(d["profile_views"]),PURPLE,eye,164),
        ("Followers",str(d["followers"]),YELLOW,users,164),
        ("Updated",updated,TEAL,clock,164),
        ("Website","blackspirits.github.io",BLUE,globe,218),
        ("Open Source","100+ projects",PEACH,code,206),
    ]
    gap=10
    total=sum(item[4] for item in items)+gap*(len(items)-1)
    x=(956-total)/2
    out=[]
    for label,value,color,icon,width in items:
        out.append(f'''<g transform="translate({x:.1f} 5)">
      <rect width="{width}" height="38" rx="9" fill="{BG_DEEP}" stroke="{BORDER}" stroke-width="1.2"/>
      <path d="M8 1.5a6.5 6.5 0 0 0-6.5 6.5v22A6.5 6.5 0 0 0 8 36.5" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>
      <g transform="translate(13 8) scale(.72)" fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{icon}</g>
      <text x="40" y="15" fill="{MUTED}" font-size="9.2" font-weight="600">{escape(label)}</text>
      <text x="40" y="28" fill="{TEXT}" font-size="11.2" font-weight="700">{escape(value)}</text>
    </g>''')
        x+=width+gap
    return f'''<svg width="956" height="48" viewBox="0 0 956 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{escape(username)} profile summary">
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">{"".join(out)}</g>
</svg>'''

def overview(d,username):
    level=escape(d["rank"])
    frac=max(.08,min(.95,1-d["rank_pct"]/100))
    circ=2*math.pi*34
    dash=circ*frac
    gap=circ-dash
    desc=f'{d["stars"]} stars, {d["commits"]} commits, {d["prs"]} pull requests, {d["issues"]} issues, {d["public_repos"]} public repositories, {d["followers"]} followers, rank {level}.'
    return _head(467,195,f"{username} GitHub Overview",desc)+_frame(467,195)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">GitHub Overview</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">@{escape(username)} · GitHub since {d["created"].year}</text>
    <g transform="translate(22 89)">
      <g><text x="0" y="14" fill="{PURPLE}" font-size="19" font-weight="750">{compact(d["stars"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Stars</text></g>
      <g transform="translate(82 0)"><text x="0" y="14" fill="{BLUE}" font-size="19" font-weight="750">{compact(d["commits"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Commits</text></g>
      <g transform="translate(178 0)"><text x="0" y="14" fill="{TEAL}" font-size="19" font-weight="750">{compact(d["prs"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Pull requests</text></g>
      <g transform="translate(260 0)"><text x="0" y="14" fill="{YELLOW}" font-size="19" font-weight="750">{compact(d["issues"])}</text><text x="0" y="32" fill="{SUBTEXT}" font-size="11.5">Issues</text></g>
    </g>
    <line x1="22" y1="137.5" x2="330" y2="137.5" stroke="{SURFACE}"/>
    <g transform="translate(22 146)">
      <g><text x="0" y="10" fill="{TEXT}" font-size="12.5" font-weight="700">{d["contrib_repos"]}</text><text x="0" y="26" fill="{MUTED}" font-size="9.5">Contributed</text></g>
      <g transform="translate(100 0)"><text x="0" y="10" fill="{TEXT}" font-size="12.5" font-weight="700">{d["public_repos"]}</text><text x="0" y="26" fill="{MUTED}" font-size="9.5">Public repos</text></g>
      <g transform="translate(205 0)"><text x="0" y="10" fill="{TEXT}" font-size="12.5" font-weight="700">{d["followers"]}</text><text x="0" y="26" fill="{MUTED}" font-size="9.5">Followers</text></g>
    </g>
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
    while len(langs)<4:
        langs.append({"name":"—","pct":0.0,"color":SURFACE})
    x=22
    rects=[]
    for lang in langs:
        w=423*lang["pct"]/100
        rects.append(f'<rect x="{x:.2f}" y="80" width="{w:.2f}" height="10" fill="{lang["color"]}"/>')
        x+=w
    positions=((22,112),(242,112),(22,148),(242,148))
    items=[]
    for lang,(x,y) in zip(langs,positions):
        items.append(f'''<circle cx="{x+5}" cy="{y+5}" r="5" fill="{lang["color"]}"/>
    <text x="{x+18}" y="{y+9}" fill="{TEXT}" font-size="13" font-weight="650">{escape(lang["name"])}</text>
    <text x="{x+132}" y="{y+9}" fill="{MUTED}" font-size="12">{lang["pct"]:.2f}%</text>''')
    coverage=sum(lang["pct"] for lang in langs)
    desc=", ".join(f'{x["name"]} {x["pct"]:.2f} percent' for x in langs if x["name"]!="—")
    return _head(467,195,f"{username} Languages",desc)+f'''
  <clipPath id="bar"><rect x="22" y="80" width="423" height="10" rx="5"/></clipPath>'''+_frame(467,195)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Languages</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Top 4 of {d["language_count"]} detected languages</text>
    <text x="445" y="67" text-anchor="end" fill="{MUTED}" font-size="10.5">{coverage:.1f}% coverage</text>
    <g clip-path="url(#bar)">{"".join(rects)}</g>{"".join(items)}
    <text x="22" y="184" fill="{MUTED}" font-size="10.5">{d["public_repos"]} public repositories · {d["language_count"]} languages detected</text>
  </g></svg>'''

def streak(d,username):
    created=d["created"]
    ring=163 if d["current"] else 0
    desc=f'{d["total"]} total contributions, current streak {d["current"]} days, longest streak {d["longest"]} days.'
    return _head(956,235,f"{username} Contribution Streak",desc)+_frame(956,235)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Streak</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Consistency across your GitHub history</text>
    <line x1="318.5" y1="88" x2="318.5" y2="166" stroke="{SURFACE}"/>
    <line x1="637.5" y1="88" x2="637.5" y2="166" stroke="{SURFACE}"/>
    <g text-anchor="middle">
      <g transform="translate(159 0)">
        <text x="0" y="116" fill="{TEXT}" font-size="30" font-weight="800">{compact(d["total"])}</text>
        <text x="0" y="140" fill="{SUBTEXT}" font-size="13" font-weight="600">Total Contributions</text>
        <text x="0" y="159" fill="{MUTED}" font-size="10.5">{created.day} {created.strftime("%b %Y")} · Present</text>
      </g>
      <g transform="translate(478 0)">
        <circle cx="0" cy="108" r="31" fill="{BG_DEEP}" stroke="{SURFACE}" stroke-width="6"/>
        <circle cx="0" cy="108" r="31" fill="none" stroke="{PEACH}" stroke-width="6" stroke-linecap="round" stroke-dasharray="{ring} {195-ring}" transform="rotate(-90 0 108)"/>
        <path d="M0 72 C-5 77 -7 82 -4 87 C-1 83 2 81 4 76 C8 81 9 86 6 90 C12 87 14 81 11 75 C8 71 4 68 4 64 C1 66 -1 69 0 72Z" fill="{PEACH}"/>
        <text x="0" y="116" fill="{TEXT}" font-size="27" font-weight="800">{d["current"]}</text>
        <text x="0" y="158" fill="{PURPLE}" font-size="12.5" font-weight="700">Current Streak</text>
        <text x="0" y="174" fill="{MUTED}" font-size="10.5">{_range(d["current_start"],d["current_end"])}</text>
      </g>
      <g transform="translate(797 0)">
        <text x="0" y="116" fill="{TEXT}" font-size="30" font-weight="800">{d["longest"]}</text>
        <text x="0" y="140" fill="{SUBTEXT}" font-size="13" font-weight="600">Longest Streak</text>
        <text x="0" y="159" fill="{MUTED}" font-size="10.5">{_range(d["longest_start"],d["longest_end"])}</text>
      </g>
    </g>
    <line x1="22" y1="184" x2="934" y2="184" stroke="{SURFACE}"/>
    <g text-anchor="middle">
      <g transform="translate(118 0)">
        <text x="0" y="207" fill="{BLUE}" font-size="15" font-weight="800">{d["activity_total_31"]:,}</text>
        <text x="0" y="222" fill="{MUTED}" font-size="9.5">Last 31 days</text>
      </g>
      <g transform="translate(358 0)">
        <text x="0" y="207" fill="{TEAL}" font-size="15" font-weight="800">{d["active_days_31"]}/31</text>
        <text x="0" y="222" fill="{MUTED}" font-size="9.5">Active days</text>
      </g>
      <g transform="translate(598 0)">
        <text x="0" y="207" fill="{PURPLE}" font-size="15" font-weight="800">{d["average_31"]:.1f}</text>
        <text x="0" y="222" fill="{MUTED}" font-size="9.5">Contributions / day</text>
      </g>
      <g transform="translate(838 0)">
        <text x="0" y="207" fill="{PEACH}" font-size="15" font-weight="800">{d["peak_31"]}</text>
        <text x="0" y="222" fill="{MUTED}" font-size="9.5">Peak · {_fmt(d["peak_date_31"])}</text>
      </g>
    </g>
  </g></svg>'''
def trophies(d,username):
    cup='''<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3M4 22h16M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>'''
    items=[
        ("Commits",compact(d["commits"]),PURPLE,"Lifetime"),
        ("Pull Requests",compact(d["prs"]),BLUE,"Lifetime"),
        ("Contributions",compact(d["total"]),YELLOW,"Lifetime"),
        ("Reviews",compact(d["reviews"]),TEAL,"Pull-request reviews"),
        ("Open Source",f'{d["contrib_repos"]} repos',PEACH,"Contributed last year"),
        ("GitHub Veteran",f'{d["account_years"]} yrs',PURPLE,f'Since {d["created"].year}'),
    ]
    positions=((22,86),(332,86),(642,86),(22,180),(332,180),(642,180))
    trophy_cards=[]
    for (x,y),(label,value,color,subtitle) in zip(positions,items):
        trophy_cards.append(f'''<g transform="translate({x} {y})">
      <rect width="292" height="82" rx="11" fill="{BG_DEEP}" stroke="{BORDER}"/>
      <circle cx="44" cy="41" r="24" fill="{color}" fill-opacity=".10" stroke="{color}" stroke-width="1.3"/>
      <g transform="translate(32 29) scale(.52)" fill="none" stroke="{color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{cup}</g>
      <text x="82" y="27" fill="{SUBTEXT}" font-size="10.5" font-weight="700">{escape(label)}</text>
      <text x="82" y="52" fill="{TEXT}" font-size="22" font-weight="800">{escape(value)}</text>
      <text x="82" y="68" fill="{MUTED}" font-size="9.5">{escape(subtitle)}</text>
    </g>''')
    return _head(956,320,f"{username} GitHub Trophies & Achievements","Custom live trophies plus official GitHub achievements.")+_frame(956,320)+f'''
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">GitHub Trophies &amp; Achievements</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Live trophies from your GitHub activity · official achievements below</text>
    {"".join(trophy_cards)}
    <line x1="22" y1="270" x2="934" y2="270" stroke="{SURFACE}"/>
    <text x="22" y="292" fill="{SUBTEXT}" font-size="10.5" font-weight="700">Official GitHub achievements</text>
    <g transform="translate(190 278)"><rect width="134" height="28" rx="8" fill="{BG_DEEP}" stroke="{BORDER}"/><circle cx="15" cy="14" r="4" fill="{PURPLE}"/><text x="28" y="18" fill="{TEXT}" font-size="10.5" font-weight="700">Pull Shark ×3</text></g>
    <g transform="translate(334 278)"><rect width="184" height="28" rx="8" fill="{BG_DEEP}" stroke="{BORDER}"/><circle cx="15" cy="14" r="4" fill="{BLUE}"/><text x="28" y="18" fill="{TEXT}" font-size="10.5" font-weight="700">Pair Extraordinaire ×3</text></g>
  </g></svg>'''

def activity(d,username):
    data=d["activity"]
    W,H=956,330
    left,right,top,bottom=62,25,95,50
    pw=W-left-right
    ph=H-top-bottom
    peak=max((x["count"] for x in data),default=0)
    ymax=max(50,int(math.ceil(peak/50))*50)
    if peak>500:
        ymax=int(math.ceil(peak/100))*100
    pts=[(left+pw*i/(len(data)-1),top+ph*(1-item["count"]/ymax)) for i,item in enumerate(data)]
    line="M "+" L ".join(f"{x:.2f},{y:.2f}" for x,y in pts)
    area=line+f" L {pts[-1][0]:.2f},{top+ph:.2f} L {pts[0][0]:.2f},{top+ph:.2f} Z"
    step=100 if ymax>=500 else 50
    grid=[]
    labels=[]
    for value in range(0,ymax+1,step):
        y=top+ph*(1-value/ymax)
        grid.append(f'<line x1="{left}" x2="{W-right}" y1="{y:.2f}" y2="{y:.2f}" stroke="{SURFACE}" stroke-width="1"/>')
        labels.append(f'<text x="{left-12}" y="{y+4:.2f}" text-anchor="end" fill="{MUTED}" font-size="10.5">{value}</text>')
    xlabels=[]
    for idx in (0,4,8,12,16,20,24,28,30):
        x,_=pts[idx]
        xlabels.append(f'<text x="{x:.2f}" y="{H-24}" text-anchor="middle" fill="{MUTED}" font-size="10.5">{data[idx]["date"].day}</text>')
    max_idx=max(range(len(data)),key=lambda i:data[i]["count"])
    points=[]
    for i,(x,y) in enumerate(pts):
        points.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{3.6 if i==max_idx else 2.4}" fill="{PEACH if i==max_idx else BLUE}" stroke="{BG}" stroke-width="1.5"/>')
    mx,my=pts[max_idx]
    total=sum(x["count"] for x in data)
    return f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">{escape(username)} Contribution Activity</title><desc id="desc">GitHub contribution activity for the last 31 days. Peak {peak} contributions.</desc>
  <defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{PURPLE}"/><stop offset=".55" stop-color="{BLUE}"/><stop offset="1" stop-color="{PEACH}"/></linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{PURPLE}" stop-opacity=".28"/><stop offset="1" stop-color="{PURPLE}" stop-opacity="0"/></linearGradient></defs>
  {_frame(W,H)}
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Activity</text>
    <text x="22" y="67" fill="{MUTED}" font-size="11.5" font-weight="500">Last 31 days · {total:,} contributions in this window</text>
    <text x="{W-right}" y="48" text-anchor="end" fill="{PEACH}" font-size="11.5" font-weight="700">Peak · {peak}</text>
    <text x="{W-right}" y="66" text-anchor="end" fill="{MUTED}" font-size="10.5">{d["active_days_31"]} active days · {d["average_31"]:.1f}/day avg</text>
    {"".join(grid)}{"".join(labels)}{"".join(xlabels)}
    <path d="{area}" fill="url(#area)"/><path d="{line}" fill="none" stroke="{PURPLE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    {"".join(points)}
    <g transform="translate({mx:.2f} {my:.2f})"><rect x="-25" y="-34" width="50" height="22" rx="7" fill="{BG_DEEP}" stroke="{PEACH}"/><text x="0" y="-19" text-anchor="middle" fill="{PEACH}" font-size="11" font-weight="700">{peak}</text></g>
  </g></svg>'''
