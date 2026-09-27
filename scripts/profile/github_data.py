from __future__ import annotations

import json, os, urllib.parse, urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from theme import LANG_FALLBACK, PURPLE, calculate_rank

USERNAME=os.environ.get("PROFILE_USERNAME","Blackspirits")
TOKEN=os.environ.get("GITHUB_TOKEN","")

def _request(url,method="GET",body=None):
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN is required")
    data=json.dumps(body).encode() if body is not None else None
    headers={
        "Authorization":f"Bearer {TOKEN}",
        "Accept":"application/vnd.github+json, application/vnd.github.cloak-preview+json",
        "User-Agent":"BlackSpirits-profile-cards",
        "X-GitHub-Api-Version":"2022-11-28",
    }
    if body is not None:
        headers["Content-Type"]="application/json"
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=30) as response:
        return json.load(response)

def _graphql(query,variables):
    payload=_request("https://api.github.com/graphql","POST",{"query":query,"variables":variables})
    if payload.get("errors"):
        raise RuntimeError("GitHub GraphQL error: "+json.dumps(payload["errors"],ensure_ascii=False))
    return payload["data"]

REPO_QUERY=r"""
query($login:String!,$cursor:String){
  user(login:$login){
    createdAt
    followers(first:1){totalCount}
    issues(first:1){totalCount}
    pullRequests(first:1){totalCount}
    publicRepositories: repositories(first:1,ownerAffiliations:OWNER,privacy:PUBLIC){totalCount}
    sourceRepositories: repositories(
      first:100,
      after:$cursor,
      ownerAffiliations:OWNER,
      isFork:false,
      privacy:PUBLIC,
      orderBy:{field:UPDATED_AT,direction:DESC}
    ){
      nodes{
        name
        stargazerCount
        languages(first:100,orderBy:{field:SIZE,direction:DESC}){
          edges{size node{name color}}
        }
      }
      pageInfo{hasNextPage endCursor}
    }
  }
}
"""

CONTRIB_QUERY=r"""
query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){
    contributionsCollection(from:$from,to:$to){
      totalPullRequestReviewContributions
      commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}
      issueContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}
      pullRequestContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}
      pullRequestReviewContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}
      contributionCalendar{
        totalContributions
        weeks{contributionDays{date contributionCount}}
      }
    }
  }
}
"""

def _iso(d,end=False):
    t=datetime.max.time().replace(microsecond=0) if end else datetime.min.time()
    return datetime.combine(d,t,tzinfo=timezone.utc).isoformat().replace("+00:00","Z")

def _repo_data():
    cursor=None
    repos=[]
    meta=None
    while True:
        user=_graphql(REPO_QUERY,{"login":USERNAME,"cursor":cursor})["user"]
        meta=meta or user
        conn=user["sourceRepositories"]
        repos.extend(conn["nodes"])
        if not conn["pageInfo"]["hasNextPage"]:
            break
        cursor=conn["pageInfo"]["endCursor"]
    return meta,repos

def _contributions(created):
    today=datetime.now(timezone.utc).date()
    daily={}
    reviews=0
    total=0
    start=created.date()

    while start<=today:
        end=min(start+timedelta(days=364),today)
        c=_graphql(CONTRIB_QUERY,{"login":USERNAME,"from":_iso(start),"to":_iso(end,True)})["user"]["contributionsCollection"]
        reviews+=int(c.get("totalPullRequestReviewContributions",0))
        total+=int(c["contributionCalendar"].get("totalContributions",0))
        for week in c["contributionCalendar"]["weeks"]:
            for item in week["contributionDays"]:
                d=date.fromisoformat(item["date"])
                if start<=d<=end:
                    daily[d]=int(item["contributionCount"])
        start=end+timedelta(days=1)

    cutoff=today-timedelta(days=364)
    c=_graphql(CONTRIB_QUERY,{"login":USERNAME,"from":_iso(cutoff),"to":_iso(today,True)})["user"]["contributionsCollection"]
    repos=set()
    for key in (
        "commitContributionsByRepository",
        "issueContributionsByRepository",
        "pullRequestContributionsByRepository",
        "pullRequestReviewContributionsByRepository",
    ):
        repos.update(item["repository"]["nameWithOwner"] for item in c.get(key,[]))

    return daily,total,repos,reviews

def _streaks(daily):
    if not daily:
        return 0,None,None,0,None,None

    longest=run=0
    long_start=long_end=run_start=None
    prev=None

    for d in sorted(daily):
        if daily[d]>0:
            if prev is None or d!=prev+timedelta(days=1) or run==0:
                run=1
                run_start=d
            else:
                run+=1
            if run>=longest:
                longest,long_start,long_end=run,run_start,d
        else:
            run=0
            run_start=None
        prev=d

    today=datetime.now(timezone.utc).date()
    anchor=today if daily.get(today,0)>0 else today-timedelta(days=1)
    current=0
    current_end=None
    d=anchor
    while daily.get(d,0)>0:
        current_end=current_end or d
        current+=1
        d-=timedelta(days=1)
    current_start=d+timedelta(days=1) if current else None

    return current,current_start,current_end,longest,long_start,long_end

def build_data():
    user,repos=_repo_data()
    created=datetime.fromisoformat(user["createdAt"].replace("Z","+00:00"))
    daily,total,contrib_repos,reviews=_contributions(created)

    q=urllib.parse.quote(f"author:{USERNAME}")
    commits=int(_request(f"https://api.github.com/search/commits?q={q}&per_page=1").get("total_count",0))
    stars=sum(int(repo.get("stargazerCount",0)) for repo in repos)

    sizes=defaultdict(int)
    colors={}
    for repo in repos:
        for edge in repo.get("languages",{}).get("edges",[]):
            name=edge["node"]["name"]
            sizes[name]+=int(edge["size"])
            colors[name]=edge["node"].get("color") or colors.get(name)

    total_bytes=sum(sizes.values()) or 1
    languages=[
        {
            "name":name,
            "pct":size/total_bytes*100,
            "color":colors.get(name) or LANG_FALLBACK.get(name,PURPLE),
        }
        for name,size in sorted(sizes.items(),key=lambda x:x[1],reverse=True)[:4]
    ]

    prs=int(user["pullRequests"]["totalCount"])
    issues=int(user["issues"]["totalCount"])
    followers=int(user["followers"]["totalCount"])
    public_repos=int(user["publicRepositories"]["totalCount"])

    level,pct=calculate_rank(commits,prs,issues,reviews,stars,followers)
    current,cs,ce,longest,ls,le=_streaks(daily)

    today=datetime.now(timezone.utc).date()
    activity=[
        {"date":today-timedelta(days=i),"count":daily.get(today-timedelta(days=i),0)}
        for i in range(30,-1,-1)
    ]
    window_total=sum(item["count"] for item in activity)
    active_days=sum(1 for item in activity if item["count"]>0)
    peak_item=max(activity,key=lambda item:item["count"])
    account_years=max(0,(today-created.date()).days//365)

    return {
        "created":created.date(),
        "account_years":account_years,
        "stars":stars,
        "commits":commits,
        "prs":prs,
        "issues":issues,
        "followers":followers,
        "public_repos":public_repos,
        "contrib_repos":len(contrib_repos),
        "rank":level,
        "rank_pct":pct,
        "languages":languages,
        "language_count":len(sizes),
        "total":total,
        "current":current,
        "current_start":cs,
        "current_end":ce,
        "longest":longest,
        "longest_start":ls,
        "longest_end":le,
        "activity":activity,
        "activity_total_31":window_total,
        "active_days_31":active_days,
        "average_31":window_total/len(activity),
        "peak_31":peak_item["count"],
        "peak_date_31":peak_item["date"],
    }
