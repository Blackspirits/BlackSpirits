from __future__ import annotations

import math
from xml.sax.saxutils import escape
from theme import BG,BG_DEEP,SURFACE,BORDER,TEXT,SUBTEXT,MUTED,PURPLE,BLUE,PEACH,TEAL,YELLOW,SILVER,FONT,CARD_W,compact,text_width

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
    colors=(PEACH,SILVER,YELLOW,PURPLE,BLUE)
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
    code='''<path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/>'''
    items=[
        ("Views",str(d["profile_views"]),PURPLE,eye),
        ("Followers",str(d["followers"]),YELLOW,users),
        ("Updated",updated,TEAL,clock),
        ("Open Source","Contributor",PEACH,code),
    ]
    gap=12
    width=(CARD_W-gap*(len(items)-1))/len(items)
    out=[]
    for i,(label,value,color,icon) in enumerate(items):
        x=i*(width+gap)
        out.append(f'''<g transform="translate({x:.1f} 1)">
      <rect x=".6" y=".6" width="{width-1.2:.1f}" height="44.8" rx="10" fill="{BG_DEEP}" stroke="{BORDER}" stroke-width="1.2"/>
      <path d="M9 1.5a7.5 7.5 0 0 0-7.5 7.5v28A7.5 7.5 0 0 0 9 44.5" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>
      <g transform="translate(15 11) scale(.8)" fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{icon}</g>
      <text x="46" y="19" fill="{MUTED}" font-size="11" font-weight="600">{escape(label)}</text>
      <text x="46" y="35" fill="{TEXT}" font-size="14" font-weight="700">{escape(value)}</text>
    </g>''')
    return f'''<svg width="{CARD_W}" height="48" viewBox="0 0 {CARD_W} 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{escape(username)} profile views, followers, latest human update and open-source identity">
  <g font-family="{FONT}">{"".join(out)}</g>
</svg>'''

def overview(d,username):
    """GitHub totals, profile rank and language split in one full-width card."""
    W,H=CARD_W,290
    level=escape(d["rank"])
    frac=max(.08,min(.95,1-d["rank_pct"]/100))
    circ=2*math.pi*36
    dash=circ*frac

    primary=(
        ("Stars",compact(d["stars"]),PURPLE),
        ("Commits",compact(d["commits"]),BLUE),
        ("Pull requests",compact(d["prs"]),TEAL),
        ("Issues",compact(d["issues"]),YELLOW),
    )
    secondary=(
        ("Repos contributed to",d["contrib_repos"]),
        ("Public repos",d["public_repos"]),
        ("Followers",d["followers"]),
    )
    stats=[]
    for i,(label,value,color) in enumerate(primary):
        stats.append(f'''<g transform="translate({22+i*122} 92)"><text y="18" fill="{color}" font-size="24" font-weight="800">{value}</text><text y="38" fill="{SUBTEXT}" font-size="12">{label}</text></g>''')
    for i,(label,value) in enumerate(secondary):
        stats.append(f'''<g transform="translate({22+i*163} 152)"><text y="12" fill="{TEXT}" font-size="14" font-weight="700">{value}</text><text y="30" fill="{MUTED}" font-size="11">{label}</text></g>''')

    langs=list(d["languages"][:4])
    bar_w=W-44
    x=22.0
    rects=[]
    for lang in langs:
        w=bar_w*lang["pct"]/100
        rects.append(f'<rect x="{x:.2f}" y="236" width="{w:.2f}" height="10" fill="{lang["color"]}"/>')
        x+=w
    legend=[]
    col=bar_w/4
    for i,lang in enumerate(langs):
        lx=22+i*col
        name=escape(lang["name"])
        legend.append(f'''<circle cx="{lx+5:.1f}" cy="266" r="5" fill="{lang["color"]}"/><text x="{lx+16:.1f}" y="270.5" fill="{TEXT}" font-size="12.5" font-weight="700">{name}</text><text x="{lx+22+text_width(lang["name"],12.5):.1f}" y="270.5" fill="{MUTED}" font-size="12">{lang["pct"]:.1f}%</text>''')

    desc=(f'{d["stars"]} stars, {d["commits"]} commits, {d["prs"]} pull requests, {d["issues"]} issues, '
          f'{d["public_repos"]} public repositories, {d["followers"]} followers, rank {level}. Languages: '
          + ", ".join(f'{x["name"]} {x["pct"]:.1f}%' for x in langs)+".")
    return _head(W,H,f"{username} GitHub Overview",desc)+f'''
  <clipPath id="bar"><rect x="22" y="236" width="{bar_w}" height="10" rx="5"/></clipPath>'''+_frame(W,H)+f'''
  <g font-family="{FONT}">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">GitHub Overview</text>
    <text x="22" y="68" fill="{MUTED}" font-size="12" font-weight="500">@{escape(username)} · GitHub since {d["created"].year}</text>
    {"".join(stats)}
    <line x1="22" y1="140.5" x2="500" y2="140.5" stroke="{SURFACE}"/>
    <g transform="translate(616 124)">
      <circle r="46" fill="{BG_DEEP}" stroke="{BORDER}" stroke-width="1.5"/>
      <circle r="36" fill="none" stroke="{SURFACE}" stroke-width="7"/>
      <circle r="36" fill="none" stroke="{PEACH}" stroke-width="7" stroke-linecap="round" stroke-dasharray="{dash:.1f} {circ-dash:.1f}" transform="rotate(-90)"/>
      <text y="9" text-anchor="middle" fill="{TEXT}" font-size="26" font-weight="800">{level}</text>
      <text y="66" text-anchor="middle" fill="{PEACH}" font-size="11" font-weight="700" letter-spacing=".6">PROFILE RANK</text>
    </g>
    <line x1="22" y1="202.5" x2="{W-22}" y2="202.5" stroke="{SURFACE}"/>
    <text x="22" y="224" fill="{SUBTEXT}" font-size="12.5" font-weight="700">Languages</text>
    <text x="{W-22}" y="224" text-anchor="end" fill="{MUTED}" font-size="11.5">Top {len(langs)} of {d["language_count"]} · by code size</text>
    <g clip-path="url(#bar)">{"".join(rects)}</g>
    {"".join(legend)}
  </g></svg>'''

# Material "whatshot" flame, the same mark github-readme-streak-stats uses.
FLAME=("M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36"
       "C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"
       "M11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58"
       ".39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z")

def streak(d,username):
    created=d["created"]
    desc=f'{d["total"]} total contributions, current streak {d["current"]} days, longest streak {d["longest"]} days.'
    return _head(720,200,f"{username} Contribution Streak",desc)+_frame(720,200)+f'''
  <g font-family="{FONT}">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Streak</text>
    <text x="22" y="67" fill="{MUTED}" font-size="12" font-weight="500">Consistency across my GitHub history</text>
    <line x1="240" y1="84" x2="240" y2="166" stroke="{SURFACE}"/>
    <line x1="480" y1="84" x2="480" y2="166" stroke="{SURFACE}"/>
    <g text-anchor="middle">
      <g transform="translate(120 0)">
        <text x="0" y="117" fill="{TEXT}" font-size="31" font-weight="800">{compact(d["total"])}</text>
        <text x="0" y="142" fill="{SUBTEXT}" font-size="13" font-weight="600">Total Contributions</text>
        <text x="0" y="161" fill="{MUTED}" font-size="11">{created.day} {created.strftime("%b %Y")} · Present</text>
      </g>
      <g transform="translate(360 0)">
        <defs><mask id="ring-gap" maskUnits="userSpaceOnUse" x="-60" y="50" width="120" height="120">
          <rect x="-60" y="50" width="120" height="120" fill="#fff"/>
          <ellipse cx="0" cy="78" rx="14" ry="17" fill="#000"/>
        </mask></defs>
        <circle cx="0" cy="112" r="34" fill="none" stroke="{PEACH}" stroke-width="5" mask="url(#ring-gap)"/>
        <path transform="translate(-12 63)" fill="{PEACH}" d="{FLAME}"/>
        <text x="0" y="121" fill="{TEXT}" font-size="27" font-weight="800">{d["current"]}</text>
        <text x="0" y="164" fill="{PURPLE}" font-size="13" font-weight="700">Current Streak</text>
        <text x="0" y="181" fill="{MUTED}" font-size="11">{_range(d["current_start"],d["current_end"])}</text>
      </g>
      <g transform="translate(600 0)">
        <text x="0" y="117" fill="{TEXT}" font-size="31" font-weight="800">{d["longest"]}</text>
        <text x="0" y="142" fill="{SUBTEXT}" font-size="13" font-weight="600">Longest Streak</text>
        <text x="0" y="161" fill="{MUTED}" font-size="11">{_range(d["longest_start"],d["longest_end"])}</text>
      </g>
    </g>
  </g></svg>'''

FALLBACK_ACHIEVEMENTS=(("Pull Shark",3),("Pair Extraordinaire",3))

def trophies(d,username):
    cup='''<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3M4 22h16M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>'''
    tier_names=("Bronze","Silver","Gold","Platinum","Diamond")
    items=[
        ("Committer",d["commits"],compact(d["commits"]),(100,500,1000,5000,10000)),
        ("Pull Requests",d["prs"],compact(d["prs"]),(10,50,100,500,1000)),
        ("Contributor",d["total"],compact(d["total"]),(250,1000,2500,5000,10000)),
        ("Reviewer",d["reviews"],compact(d["reviews"]),(1,10,50,200,500)),
        ("Open Source",d["contrib_repos"],f'{d["contrib_repos"]} repos',(5,15,30,60,100)),
        ("GitHub Veteran",d["account_years"],f'{d["account_years"]} yrs',(1,3,5,10,15)),
    ]
    positions=((22,88),(367,88),(22,180),(367,180),(22,272),(367,272))
    trophy_cards=[]
    for (x,y),(label,value,metric,thresholds) in zip(positions,items):
        tier,color,frac=_tier(value,thresholds)
        idx=tier_names.index(tier)
        if idx < len(tier_names)-1:
            next_tier=tier_names[idx+1]
            next_value=thresholds[idx+1]
            detail=f'Next · {next_tier} at {compact(next_value)}'
        else:
            detail='Top tier reached'
        trophy_cards.append(f'''<g transform="translate({x} {y})">
      <rect width="331" height="80" rx="11" fill="{BG_DEEP}" stroke="{BORDER}"/>
      <g transform="translate(15 13) scale(.72)" fill="none" stroke="{color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">{cup}</g>
      <text x="50" y="23" fill="{SUBTEXT}" font-size="11" font-weight="700">{escape(label)}</text>
      <text x="50" y="49" fill="{color}" font-size="20" font-weight="800">{tier}</text>
      <text x="317" y="49" text-anchor="end" fill="{SUBTEXT}" font-size="12">{escape(metric)}</text>
      <text x="317" y="23" text-anchor="end" fill="{MUTED}" font-size="11">{escape(detail)}</text>
      <rect x="14" y="66" width="303" height="4" rx="2" fill="{SURFACE}"/>
      <rect x="14" y="66" width="{303*frac:.1f}" height="4" rx="2" fill="{color}"/>
    </g>''')
    # Scraped from the public profile on each run; generate.py falls back to the
    # last successful read, and FALLBACK_ACHIEVEMENTS only covers a first run
    # with no cache at all. Badges wrap onto extra rows as more are earned.
    earned=d.get("achievements") or FALLBACK_ACHIEVEMENTS
    palette=(PURPLE,BLUE,TEAL,PEACH,YELLOW)
    ach_label="Official achievements"
    row_x=22+text_width(ach_label,12)+16
    bx,by=row_x,377
    badges=[]
    for i,(name,count) in enumerate(earned):
        label=f"{name} ×{count}" if count>1 else name
        bw=text_width(label,11.5)+42
        if bx+bw>698 and bx>row_x:
            bx,by=row_x,by+38
        badges.append(f'<g transform="translate({bx:.1f} {by})"><rect width="{bw:.1f}" height="28" rx="8" fill="{BG_DEEP}" stroke="{BORDER}"/><circle cx="15" cy="14" r="4" fill="{palette[i%len(palette)]}"/><text x="28" y="18.5" fill="{TEXT}" font-size="11.5" font-weight="700">{escape(label)}</text></g>')
        bx+=bw+10
    H=by+28+15
    return _head(720,H,f"{username} GitHub Trophies & Achievements","Custom milestone tiers plus the official GitHub achievements on the profile.")+_frame(720,H)+f'''
  <g font-family="{FONT}">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">GitHub Trophies &amp; Achievements</text>
    <text x="22" y="67" fill="{MUTED}" font-size="12" font-weight="500">Milestones · Bronze → Silver → Gold → Platinum → Diamond</text>
    {"".join(trophy_cards)}
    <line x1="22" y1="365" x2="698" y2="365" stroke="{SURFACE}"/>
    <text x="22" y="394" fill="{SUBTEXT}" font-size="12" font-weight="700">{ach_label}</text>
    {"".join(badges)}
  </g></svg>'''

def activity(d,username):
    data=d["activity"]
    W,H=720,330
    left,right,top,bottom=58,20,95,50
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
        labels.append(f'<text x="{left-10}" y="{y+4:.2f}" text-anchor="end" fill="{MUTED}" font-size="11.5">{value}</text>')
    xlabels=[]
    for idx in (0,4,8,12,16,20,24,28,30):
        x,_=pts[idx]
        xlabels.append(f'<text x="{x:.2f}" y="{H-24}" text-anchor="middle" fill="{MUTED}" font-size="11.5">{data[idx]["date"].day}</text>')
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
  <g font-family="{FONT}">
    <text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">Contribution Activity</text>
    <text x="22" y="68" fill="{MUTED}" font-size="12" font-weight="500">Last 31 days · {total:,} contributions in this window</text>
    <text x="{W-right}" y="48" text-anchor="end" fill="{PEACH}" font-size="12" font-weight="700">Peak · {peak}</text>
    <text x="{W-right}" y="68" text-anchor="end" fill="{MUTED}" font-size="11">{d["active_days_31"]} active days · {d["average_31"]:.1f}/day avg</text>
    {"".join(grid)}{"".join(labels)}{"".join(xlabels)}
    <path d="{area}" fill="url(#area)"/><path d="{line}" fill="none" stroke="{PURPLE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    {"".join(points)}
    <g transform="translate({mx:.2f} {my:.2f})"><rect x="-25" y="-34" width="50" height="22" rx="7" fill="{BG_DEEP}" stroke="{PEACH}"/><text x="0" y="-19" text-anchor="middle" fill="{PEACH}" font-size="11.5" font-weight="700">{peak}</text></g>
  </g></svg>'''
