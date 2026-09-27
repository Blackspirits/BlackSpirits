#!/usr/bin/env python3
from pathlib import Path
import os, sys

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))

from github_data import USERNAME, build_data
from cards import overview, languages, streak, trophies, activity

OUT=Path(os.environ.get("PROFILE_CARD_OUTPUT","assets/generated"))

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    data=build_data()
    files={
        "profile-overview.svg":overview(data,USERNAME),
        "profile-languages.svg":languages(data,USERNAME),
        "profile-streak.svg":streak(data,USERNAME),
        "profile-trophies.svg":trophies(data,USERNAME),
        "profile-activity.svg":activity(data,USERNAME),
    }
    for name,svg in files.items():
        (OUT/name).write_text(svg,encoding="utf-8")
    print("Generated:",", ".join(files))

if __name__=="__main__":
    main()
