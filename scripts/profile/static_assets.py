#!/usr/bin/env python3
"""Build the hand-curated README assets from the shared theme.

Covers the hero banner, buttons, project cards, the localization grid and the
stack. The hero also ships as profile-hero.webp, a fallback rendered from the
SVG; re-export it after changing the banner.

These assets do not depend on live data, so the scheduled workflow never runs
this script. Run it after editing a label, a colour or a layout:

    python3 scripts/profile/static_assets.py

Brand logos live in logos.py.
"""
from __future__ import annotations

import base64
import json
import math
import sys
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

from logos import PROJECTS, STACK  # noqa: E402
from theme import (  # noqa: E402
    BG, BG_DEEP, BORDER, BLUE, CARD_W, FONT, GREEN, MUTED, PEACH, PURPLE, RED,
    SUBTEXT, TEAL, TEXT, THEME, YELLOW, text_width,
)

# Lucide icons (24×24, stroke based) shared by buttons and cards.
LUCIDE = {
    "arrow": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "code": '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/>',
    "coffee": '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    # Lucide "hand", tilted, with two motion strokes: a wave.
    "wave": '<g transform="translate(-.6 .8) rotate(-18 12 12) scale(.92) translate(1 1)"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></g><path d="M19.2 2.2c1.3.4 2.2 1.3 2.6 2.6"/><path d="M18.6 4.6c.5.2.9.6 1.1 1.1"/>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
}

# Hand-drawn stroke glyphs on an 18×18 grid, closer to the brands than Lucide.
GLYPH18 = {
    "stripe": '<rect x="1" y="2" width="16" height="12" rx="2"/><path d="M1 6h16M4 10h4"/>',
    "bmc": '<path d="M4 2h10l-1 13H5L4 2Z"/><path d="M3 5h12M7 0h4"/>',
}

# Filled brand glyphs (24×24).
BRAND = {
    "paypal": '<path d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"/>',
    "kofi": '<path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298"/>',
}


def icon(name: str, color: str, x: float, y: float, size: float = 18, width: float = 2) -> str:
    """Place a Lucide icon of the given pixel size at (x, y)."""
    return (f'<g transform="translate({x:g} {y:g}) scale({size / 24:.4f})" fill="none" stroke="{color}" '
            f'stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round">{LUCIDE[name]}</g>')


def svg(w: float, h: float, label: str, body: str, defs: str = "") -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:g}" height="{h:g}" viewBox="0 0 {w:g} {h:g}" '
            f'role="img" aria-label="{escape(label)}">{defs}{body}</svg>\n')


ACCENT = (f'<defs><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{PURPLE}"/>'
          f'<stop offset=".55" stop-color="{BLUE}"/><stop offset="1" stop-color="{PEACH}"/></linearGradient></defs>')


def frame(w: float, h: float, title: str, subtitle: str) -> str:
    return (f'<rect x=".75" y=".75" width="{w - 1.5:g}" height="{h - 1.5:g}" rx="12" fill="{BG}" stroke="{BORDER}" stroke-width="1.5"/>'
            f'<rect x="22" y="20" width="88" height="3" rx="1.5" fill="url(#accent)"/>'
            f'<text x="22" y="48" fill="{TEXT}" font-size="20" font-weight="700">{escape(title)}</text>'
            f'<text x="22" y="68" fill="{MUTED}" font-size="12">{escape(subtitle)}</text>')


# --------------------------------------------------------------------------- buttons

BUTTONS = {
    "localization-portfolio": ("Localization Portfolio", PURPLE, "globe"),
    "simkl-history": ("Full History on Simkl", BLUE, "history"),
    "stripe": ("Stripe", PURPLE, "stripe"),
    "paypal": ("PayPal", BLUE, "paypal"),
    "kofi": ("Ko-fi", RED, "kofi"),
    "buy-me-a-coffee": ("Buy Me a Coffee", YELLOW, "bmc"),
    "email": ("Email", TEAL, "mail"),
}


def button(label: str, color: str, glyph: str) -> str:
    h = 38
    text_x = 38
    w = round(text_x + text_width(label, 13) + 12 + 14 + 14)
    if glyph in BRAND:
        mark = f'<g transform="translate(12 10) scale(.75)" fill="{color}">{BRAND[glyph]}</g>'
    elif glyph in GLYPH18:
        mark = (f'<g transform="translate(12 11)" fill="none" stroke="{color}" stroke-width="1.7" '
                f'stroke-linecap="round" stroke-linejoin="round">{GLYPH18[glyph]}</g>')
    else:
        mark = icon(glyph, color, 12, 10, 18, 2.1)
    body = (f'<rect x=".75" y=".75" width="{w - 1.5}" height="{h - 1.5}" rx="9" fill="#232334" stroke="{BORDER}" stroke-width="1.5"/>'
            f'<path d="M9 1.5a7.5 7.5 0 0 0-7.5 7.5v20A7.5 7.5 0 0 0 9 36.5" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round"/>'
            f'{mark}'
            f'<text x="{text_x}" y="23.5" fill="{TEXT}" font-family="{FONT}" font-size="13" font-weight="650">{escape(label)}</text>'
            f'{icon("arrow", color, w - 28, 12, 14, 2.4)}')
    return svg(w, h, label, body)


# --------------------------------------------------------------------------- selected work

# The mark is a Lucide icon name, or a raster logo in assets/logos/ that is
# embedded so the card stays self-contained when GitHub serves it as an image.
WORK = {
    "userscripts": ("UserScripts", "Maintainer", GREEN, "code",
                    ("Browser tools for automation,", "media and everyday UX."), "View repository"),
    "pipocas": ("Pipocas.tv", "Owner · Admin", PEACH, "pipocas.png",
                ("Portuguese subtitle community:", "development and moderation."), "Visit pipocas.tv"),
    "thetvdb": ("TheTVDB", "Moderator", TEAL, "thetvdb.png",
                ("Keeping Portuguese metadata", "accurate and consistent."), "Visit thetvdb.com"),
}
LOGOS_DIR = ROOT / "assets" / "logos"
FRAMED_LOGOS = {"thetvdb.png"}
LOGO_TILES = {"pipocas.png": "#fbb150"}  # brand background behind a transparent logo


def raster(name: str) -> str:
    data = base64.b64encode((LOGOS_DIR / name).read_bytes()).decode()
    return f"data:image/png;base64,{data}"


def work_mark(mark: str, color: str) -> str:
    """The 40px tile in the top-left corner of a work card."""
    if mark in FRAMED_LOGOS:
        # TheTVDB's app icon already carries its own dark tile.
        return (f'<defs><clipPath id="mark"><rect x="18" y="18" width="40" height="40" rx="10"/></clipPath></defs>'
                f'<image href="{raster(mark)}" x="18" y="18" width="40" height="40" clip-path="url(#mark)"/>'
                f'<rect x="18.5" y="18.5" width="39" height="39" rx="9.5" fill="none" stroke="{BORDER}"/>')
    tile = f'<rect x="18" y="18" width="40" height="40" rx="10" fill="{color}" fill-opacity=".12" stroke="{color}" stroke-opacity=".35"/>'
    if mark in LOGO_TILES:
        return (f'<rect x="18" y="18" width="40" height="40" rx="10" fill="{LOGO_TILES[mark]}"/>'
                f'<image href="{raster(mark)}" x="22" y="22" width="32" height="32"/>')
    return tile + icon(mark, color, 27, 27, 22, 1.9)
WORK_W = (CARD_W - 2 * 12) / 3


def work_card(title: str, role: str, color: str, glyph: str, lines: tuple[str, str], cta: str) -> str:
    w, h = WORK_W, 156
    body = [
        f'<rect x=".75" y=".75" width="{w - 1.5:g}" height="{h - 1.5}" rx="12" fill="{BG}" stroke="{BORDER}" stroke-width="1.5"/>',
        work_mark(glyph, color),
        f'<g font-family="{FONT}">',
        f'<text x="70" y="35" fill="{TEXT}" font-size="15" font-weight="700">{escape(title)}</text>',
        f'<text x="70" y="53" fill="{color}" font-size="12" font-weight="600">{escape(role)}</text>',
        f'<text x="18" y="86" fill="{SUBTEXT}" font-size="12.5">{escape(lines[0])}</text>',
        f'<text x="18" y="104" fill="{SUBTEXT}" font-size="12.5">{escape(lines[1])}</text>',
        f'<line x1="18" y1="120.5" x2="{w - 18:g}" y2="120.5" stroke="#313244"/>',
        f'<text x="18" y="142" fill="{color}" font-size="12.5" font-weight="700">{escape(cta)}</text>',
        '</g>',
        icon("arrow", color, w - 34, 129, 16, 2.2),
    ]
    return svg(round(w, 1), h, f"{title} — {role}. {' '.join(lines)}", "".join(body))


# --------------------------------------------------------------------------- logo grids

def place_logo(markup: str, native: float, x: float, y: float, box: float) -> str:
    """Draw a logo from logos.py so its native box fills `box` pixels at (x, y)."""
    return f'<g transform="translate({x:g} {y:g}) scale({box / native:.4f})">{markup}</g>'


def projects(logos: list[tuple[str, float, str]]) -> str:
    cols, gap, tile_h, top = 3, 12, 46, 88
    tile_w = (CARD_W - 44 - gap * (cols - 1)) / cols
    rows = -(-len(logos) // cols)
    h = top + rows * tile_h + (rows - 1) * 10 + 46
    tiles = []
    for i, (name, native, logo) in enumerate(logos):
        x = 22 + (i % cols) * (tile_w + gap)
        y = top + (i // cols) * (tile_h + 10)
        tiles.append(f'<g transform="translate({x:.1f} {y})"><rect x=".5" y=".5" width="{tile_w - 1:.1f}" height="{tile_h - 1}" rx="10" fill="{BG_DEEP}" stroke="{BORDER}"/>'
                     f'{place_logo(logo, native, 13, 12, 22)}<text x="46" y="28" fill="{TEXT}" font-size="13.5" font-weight="650">{escape(name)}</text></g>')
    body = (frame(CARD_W, h, "Selected Localization Projects", "European Portuguese (pt-PT) · translation, review and linguistic QA")
            + "".join(tiles)
            + f'<text x="22" y="{h - 20}" fill="{MUTED}" font-size="12">Selected examples from 100+ software and open-source projects</text>')
    return svg(CARD_W, h, "Selected localization projects: " + ", ".join(n for n, _, _ in logos),
               f'<g font-family="{FONT}">{body}</g>', ACCENT)


STACK_ROWS = (("Languages", 6), ("Tools", 6), ("Focus", 5))


def _balanced_lines(widths: list[float], room: float, gap: float) -> list[int]:
    """Split chips into the fewest lines that fit, keeping line lengths even."""
    for lines in range(1, len(widths) + 1):
        per_line = -(-len(widths) // lines)
        sizes = [per_line] * (len(widths) // per_line)
        if len(widths) % per_line:
            sizes.append(len(widths) % per_line)
        start, fits = 0, True
        for size in sizes:
            chunk = widths[start:start + size]
            fits &= sum(chunk) + gap * (len(chunk) - 1) <= room
            start += size
        if fits:
            return sizes
    return [1] * len(widths)


def stack(logos: list[tuple[str, float, str]]) -> str:
    chip_h, gap, label_w = 34, 8, 104
    x0 = 22 + label_w
    room = CARD_W - 22 - x0
    y = 88
    rows_svg = []
    index = 0
    for label, count in STACK_ROWS:
        chips = logos[index:index + count]
        index += count
        widths = [round(38 + text_width(name, 12.5) + 12) for name, _, _ in chips]
        rows_svg.append(f'<text x="22" y="{y + 22}" fill="{SUBTEXT}" font-size="12.5" font-weight="700">{label}</text>')
        start = 0
        for size in _balanced_lines(widths, room, gap):
            x = x0
            for (name, native, logo), w in zip(chips[start:start + size], widths[start:start + size]):
                mark = place_logo(logo, native, 10, 8, 18)
                rows_svg.append(f'<g transform="translate({x} {y})"><rect x=".5" y=".5" width="{w - 1}" height="{chip_h - 1}" rx="9" fill="{BG_DEEP}" stroke="{BORDER}"/>'
                                f'{mark}<text x="38" y="21.5" fill="{TEXT}" font-size="12.5" font-weight="650">{escape(name)}</text></g>')
                x += w + gap
            start += size
            y += chip_h + gap
        y += 14 - gap
    h = y + 8
    body = frame(CARD_W, h, "Stack & Focus", "Languages · tools · areas of work") + "".join(rows_svg)
    return svg(CARD_W, h, "Technology stack and focus areas: " + ", ".join(n for n, _, _ in logos),
               f'<g font-family="{FONT}">{body}</g>', ACCENT)


# --------------------------------------------------------------------------- hero banner

HERO_W, HERO_H = 1200, 360
HERO_PILLS = (("Programmer", PURPLE), ("Owner / Admin Pipocas.tv", BLUE), ("Mod TheTVDB", PEACH))


def hero() -> str:
    """Left column for who I am, right column for where to find me."""
    sans = "system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Liberation Sans,Arial,sans-serif"
    mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,Liberation Mono,monospace"
    x = 80
    pills = []
    for label, color in HERO_PILLS:
        # Heavy system fonts run ~15% wider than the Arial Bold table.
        w = round(text_width(label, 16) * 1.15 + 36)
        pills.append(f'<g transform="translate({x} 222)"><rect width="{w}" height="38" rx="12" fill="{color}"/>'
                     f'<text x="{w / 2:g}" y="25" text-anchor="middle" fill="#11111b" font-family="{sans}" font-size="16" font-weight="800">{escape(label)}</text></g>')
        x += w + 14
    ring_x, ring_y = 1030, 150
    body = f'''<defs>
  <clipPath id="round"><rect width="{HERO_W}" height="{HERO_H}" rx="24"/></clipPath>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#181825"/><stop offset="1" stop-color="{BG}"/></linearGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{PURPLE}"/><stop offset=".5" stop-color="{BLUE}"/><stop offset="1" stop-color="{PEACH}"/></linearGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
</defs>
<g clip-path="url(#round)">
  <rect width="{HERO_W}" height="{HERO_H}" fill="url(#bg)"/>
  <circle cx="180" cy="60" r="150" fill="#b4befe" opacity=".10" filter="url(#soft)"/>
  <circle cx="{ring_x}" cy="{ring_y}" r="170" fill="{BLUE}" opacity=".08" filter="url(#soft)"/>
  <circle cx="720" cy="330" r="130" fill="{PEACH}" opacity=".06" filter="url(#soft)"/>
  <g font-family="{sans}">
    <text x="80" y="92" fill="{MUTED}" font-family="{mono}" font-size="17" font-weight="600" letter-spacing="1.2">CINEMA, TV &amp; MUSIC · ADVENTURE &amp; TRAVEL · PORTUGAL</text>
    <text x="80" y="150" fill="{TEXT}" font-size="46" font-weight="800">Hello, World! I’m BlackSpirits</text>
    <text x="80" y="193" fill="{SUBTEXT}" font-size="20" font-weight="500">Developer · open-source contributor · pt-PT translator &amp; reviewer</text>
    {"".join(pills)}
    <text x="80" y="312" fill="#9399b2" font-family="{mono}" font-size="18" font-weight="700">JavaScript · TypeScript · Python · C# · Userscripts · Media &amp; Metadata</text>
  </g>
  <g transform="translate({ring_x} {ring_y})">
    <circle r="92" fill="none" stroke="url(#ring)" stroke-width="2" opacity=".35"/>
    <circle r="62" fill="none" stroke="url(#ring)" stroke-width="13"/>
  </g>
  <g font-family="{sans}" text-anchor="middle">
    <text x="{ring_x}" y="{ring_y + 140}" fill="{PURPLE}" font-size="17" font-weight="700">blackspirits.github.io</text>
    <text x="{ring_x}" y="{ring_y + 164}" fill="{MUTED}" font-size="14" font-weight="600">@blackspirits</text>
  </g>
</g>
<rect x=".5" y=".5" width="{HERO_W - 1}" height="{HERO_H - 1}" rx="24" fill="none" stroke="{TEXT}" stroke-opacity=".16"/>'''
    return svg(HERO_W, HERO_H, "BlackSpirits — Portuguese developer, open-source contributor and pt-PT translator & reviewer", body)


# --------------------------------------------------------------------------- flags

# 3:2 flags, simplified so they stay legible at 14px high.
FLAG_W, FLAG_H = 30, 20
FLAGS = {
    "pt-flag": ("Portugal",
                '<rect width="12" height="20" fill="#046A38"/><rect x="12" width="18" height="20" fill="#DA291C"/>'
                '<circle cx="12" cy="10" r="5.2" fill="none" stroke="#FFD100" stroke-width="1.6"/>'
                '<path d="M9.6 6.9h4.8v4.3c0 1.6-1.1 2.5-2.4 2.9-1.3-.4-2.4-1.3-2.4-2.9Z" fill="#fff" stroke="#DA291C" stroke-width=".9"/>'
                '<path d="M12 8.6v3.4M10.8 10.3h2.4" stroke="#003399" stroke-width="1.1" stroke-linecap="round"/>'),
    "fr-flag": ("France",
                '<rect width="10" height="20" fill="#002654"/><rect x="10" width="10" height="20" fill="#fff"/>'
                '<rect x="20" width="10" height="20" fill="#ED2939"/>'),
    "korean-flag": ("South Korea", None),  # drawn by korean_flag()
}


def korean_flag() -> str:
    """Taegeuk tilted along the flag diagonal, with the four trigrams around it."""
    cx, cy = FLAG_W / 2, FLAG_H / 2
    angle = math.degrees(math.atan2(FLAG_H, FLAG_W))
    body = [f'<rect width="{FLAG_W}" height="{FLAG_H}" fill="#fff"/>',
            f'<g transform="translate({cx:g} {cy:g}) rotate({angle:.1f})">'
            '<path d="M-5 0A5 5 0 0 1 5 0A2.5 2.5 0 0 0 0 0A2.5 2.5 0 0 1-5 0Z" fill="#CD2E3A"/>'
            '<path d="M-5 0A5 5 0 0 0 5 0A2.5 2.5 0 0 0 0 0A2.5 2.5 0 0 1-5 0Z" fill="#0047A0"/></g>']
    # (corner direction, bars from the centre outwards: True = solid, False = broken)
    trigrams = (((-1, -1), (True, True, True)), ((1, 1), (False, False, False)),
                ((1, -1), (False, True, False)), ((-1, 1), (True, False, True)))
    diag = math.hypot(FLAG_W, FLAG_H)
    for (sx, sy), bars in trigrams:
        ux, uy = sx * FLAG_W / diag, sy * FLAG_H / diag      # towards the corner
        px, py = -uy, ux                                      # along each bar
        for i, solid in enumerate(bars):
            d = 8.2 + i * 1.9
            bx, by = cx + ux * d, cy + uy * d
            half, gap = 2.6, 0.45
            spans = ((-half, half),) if solid else ((-half, -gap), (gap, half))
            for s0, s1 in spans:
                body.append(f'<path d="M{bx + px * s0:.2f} {by + py * s0:.2f}L{bx + px * s1:.2f} {by + py * s1:.2f}" '
                            'stroke="#000" stroke-width="1.15"/>')
    return "".join(body)


def flag(label: str, body: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{FLAG_W}" height="{FLAG_H}" viewBox="0 0 {FLAG_W} {FLAG_H}" '
            f'role="img" aria-label="{label}"><defs><clipPath id="f"><rect width="{FLAG_W}" height="{FLAG_H}" rx="3"/></clipPath></defs>'
            f'<g clip-path="url(#f)">{body}</g>'
            f'<rect x=".5" y=".5" width="{FLAG_W - 1}" height="{FLAG_H - 1}" rx="2.5" fill="none" stroke="#000" stroke-opacity=".25"/></svg>\n')


# --------------------------------------------------------------------------- tagline globe

def globe_icon(width: float = 1.7, inner: float = 1.25, tilt: float = -20) -> str:
    """Classic globe grid (rim, centre meridian, meridian ellipse, equator and
    two curved parallels) tilted on its axis, stroked with one
    cyan -> blue -> lilac -> peach gradient. The rim is heavier than the grid
    and the lower parallel is quieter, so it stays readable at 20px."""
    grid = ('<ellipse cx="12" cy="12" rx="4.6" ry="10"/>'
            '<path d="M12 2v20"/><path d="M2 12h20"/>'
            '<path d="M4 6q8 5.2 16 0"/><path d="M4 18q8-5.2 16 0" stroke-opacity=".55"/>')
    sky = "#89dceb"
    grad = (f'<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="2" y1="8" x2="22" y2="16">'
            f'<stop offset="0" stop-color="{sky}"/><stop offset=".45" stop-color="{BLUE}"/>'
            f'<stop offset=".8" stop-color="{PURPLE}"/><stop offset="1" stop-color="{PEACH}"/></linearGradient>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
            f'role="img" aria-label="Globe"><defs>{grad}</defs>'
            f'<g stroke="url(#g)" stroke-linecap="round" stroke-linejoin="round">'
            f'<circle cx="12" cy="12" r="10" stroke-width="{width}"/>'
            f'<g transform="rotate({tilt} 12 12)" stroke-width="{inner}">{grid}</g></g></svg>\n')


# --------------------------------------------------------------------------- section icons

SECTION_ICONS = {"support": ("heart", RED), "coffee": ("coffee", YELLOW), "wave": ("wave", PEACH)}


def section_icon(glyph: str, color: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
            f'stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{LUCIDE[glyph]}</svg>\n')


def main() -> None:
    assets = ROOT / "assets"
    for name, (label, color, glyph) in BUTTONS.items():
        (assets / "buttons" / f"{name}.svg").write_text(button(label, color, glyph), encoding="utf-8")

    (assets / "work").mkdir(exist_ok=True)
    for name, spec in WORK.items():
        (assets / "work" / f"{name}.svg").write_text(work_card(*spec), encoding="utf-8")

    if sum(n for _, n in STACK_ROWS) != len(STACK):
        raise SystemExit("STACK_ROWS does not match the logos in logos.py.")
    (assets / "localization" / "projects.svg").write_text(projects(PROJECTS), encoding="utf-8")
    (assets / "tech" / "stack.svg").write_text(stack(STACK), encoding="utf-8")

    (assets / "profile-hero.svg").write_text(hero(), encoding="utf-8")
    # The Spotify service deploys from spotify-live/ alone, so it gets its own copy.
    (ROOT / "spotify-live" / "theme.json").write_text(json.dumps(THEME, indent=2) + "\n", encoding="utf-8")
    for name, (label, body) in FLAGS.items():
        (assets / "icons" / f"{name}.svg").write_text(flag(label, body or korean_flag()), encoding="utf-8")

    (assets / "icons" / "globe.svg").write_text(globe_icon(), encoding="utf-8")
    for name, (glyph, color) in SECTION_ICONS.items():
        (assets / "icons" / f"{name}.svg").write_text(section_icon(glyph, color), encoding="utf-8")
    print("Static assets written.")


if __name__ == "__main__":
    main()
