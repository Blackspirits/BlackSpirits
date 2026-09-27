from __future__ import annotations

BG="#1e1e2e"; BG_DEEP="#181825"; SURFACE="#313244"; BORDER="#45475a"
TEXT="#cdd6f4"; SUBTEXT="#a6adc8"; MUTED="#7f849c"
PURPLE="#cba6f7"; BLUE="#89b4fa"; PEACH="#fab387"; TEAL="#94e2d5"; YELLOW="#f9e2af"

LANG_FALLBACK={
    "JavaScript":"#f1e05a","TypeScript":"#3178c6","Python":"#3572A5",
    "CSS":"#663399","HTML":"#e34c26","C#":"#178600","C++":"#f34b7d","Shell":"#89e051",
}

def compact(n:int)->str:
    if n<1000: return f"{n:,}"
    if n<1_000_000:
        v=n/1000
        return f"{v:.1f}k" if v<100 else f"{v:.0f}k"
    return f"{n/1_000_000:.1f}m"

def _exp(x): return 1-2**(-x)
def _log(x): return x/(1+x) if x>=0 else 0

def calculate_rank(commits,prs,issues,reviews,stars,followers):
    cfg=((commits,1000,2,_exp),(prs,50,3,_exp),(issues,25,1,_exp),
         (reviews,2,1,_exp),(stars,50,4,_log),(followers,10,1,_log))
    score=sum(w*f(v/m) for v,m,w,f in cfg)
    pct=(1-score/sum(w for _,_,w,_ in cfg))*100
    levels=[(1,"S"),(12.5,"A+"),(25,"A"),(37.5,"A-"),(50,"B+"),
            (62.5,"B"),(75,"B-"),(87.5,"C+"),(100,"C")]
    return next((level for threshold,level in levels if pct<=threshold),"C"),pct
