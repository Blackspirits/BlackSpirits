#!/usr/bin/env python3
from pathlib import Path
import json, os, sys

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))

from github_data import USERNAME, build_data
from cards import profile_meta, overview, streak, trophies, activity

OUT=Path(os.environ.get("PROFILE_CARD_OUTPUT","assets/generated"))
ACHIEVEMENTS_CACHE=OUT/"achievements.json"

def _last_known_achievements(scraped):
    """Keep the last successful scrape, so a failed read never shrinks the card."""
    if scraped:
        ACHIEVEMENTS_CACHE.write_text(json.dumps([{"name":n,"count":c} for n,c in scraped],indent=2)+"\n",encoding="utf-8")
        return scraped
    try:
        cached=json.loads(ACHIEVEMENTS_CACHE.read_text(encoding="utf-8"))
        print("Achievements: using the last successful read from",ACHIEVEMENTS_CACHE)
        return [(item["name"],int(item["count"])) for item in cached]
    except (OSError,ValueError,KeyError,TypeError):
        return []

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    data=build_data()
    data["achievements"]=_last_known_achievements(data.get("achievements"))
    files={
        "profile-meta.svg":profile_meta(data,USERNAME),
        "profile-overview.svg":overview(data,USERNAME),
        "profile-streak.svg":streak(data,USERNAME),
        "profile-trophies.svg":trophies(data,USERNAME),
        "profile-activity.svg":activity(data,USERNAME),
    }
    for name,svg in files.items():
        (OUT/name).write_text(svg,encoding="utf-8")
    print("Generated:",", ".join(files))

if __name__=="__main__":
    main()
