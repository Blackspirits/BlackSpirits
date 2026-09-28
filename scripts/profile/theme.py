from __future__ import annotations

BG = "#1e1e2e"
BG_DEEP = "#181825"
SURFACE = "#313244"
BORDER = "#45475a"

TEXT = "#cdd6f4"
SUBTEXT = "#a6adc8"
MUTED = "#7f849c"

PURPLE = "#cba6f7"
BLUE = "#89b4fa"
PEACH = "#fab387"
TEAL = "#94e2d5"
YELLOW = "#f9e2af"
GREEN = "#a6e3a1"
PINK = "#f5c2e7"

FONT = "Segoe UI, Ubuntu, Arial, sans-serif"

# Every card shares one canvas width so GitHub scales them identically.
CARD_W = 720

LANG_FALLBACK = {
    "JavaScript": "#f1e05a",
    "TypeScript": "#3178c6",
    "Python": "#3572A5",
    "CSS": "#663399",
    "HTML": "#e34c26",
    "C#": "#178600",
    "C++": "#f34b7d",
    "Shell": "#89e051",
}


def compact(n: int) -> str:
    if n < 1000:
        return f"{n:,}"
    if n < 1_000_000:
        value = n / 1000
        return f"{value:.1f}k" if value < 100 else f"{value:.0f}k"
    return f"{n / 1_000_000:.1f}m"


def _exp(x):
    return 1 - 2 ** (-x)


def _log(x):
    return x / (1 + x) if x >= 0 else 0


def calculate_rank(commits, prs, issues, reviews, stars, followers):
    config = (
        (commits, 1000, 2, _exp),
        (prs, 50, 3, _exp),
        (issues, 25, 1, _exp),
        (reviews, 2, 1, _exp),
        (stars, 50, 4, _log),
        (followers, 10, 1, _log),
    )
    score = sum(weight * func(value / minimum) for value, minimum, weight, func in config)
    pct = (1 - score / sum(weight for _, _, weight, _ in config)) * 100
    levels = [
        (1, "S"),
        (12.5, "A+"),
        (25, "A"),
        (37.5, "A-"),
        (50, "B+"),
        (62.5, "B"),
        (75, "B-"),
        (87.5, "C+"),
        (100, "C"),
    ]
    return next((level for threshold, level in levels if pct <= threshold), "C"), pct


# Advance widths of Arial Bold (per 1000 em). Segoe UI Semibold and Ubuntu Bold
# are slightly narrower, so layouts sized with this table never clip text.
_BOLD_WIDTHS = {
    " ": 278, "!": 333, "&": 722, "'": 238, "(": 333, ")": 333, "+": 584, ",": 278,
    "-": 333, ".": 278, "/": 278, ":": 333, "@": 975, "?": 611, "#": 556, "%": 889,
    "A": 722, "B": 722, "C": 722, "D": 722, "E": 667, "F": 611, "G": 778, "H": 722,
    "I": 278, "J": 556, "K": 722, "L": 611, "M": 833, "N": 722, "O": 778, "P": 667,
    "Q": 778, "R": 722, "S": 667, "T": 611, "U": 722, "V": 667, "W": 944, "X": 667,
    "Y": 667, "Z": 611, "a": 556, "b": 611, "c": 556, "d": 611, "e": 556, "f": 333,
    "g": 611, "h": 611, "i": 278, "j": 278, "k": 556, "l": 278, "m": 889, "n": 611,
    "o": 611, "p": 611, "q": 611, "r": 389, "s": 556, "t": 333, "u": 611, "v": 556,
    "w": 778, "x": 556, "y": 556, "z": 500, "·": 333, "→": 1000, "²": 333, "—": 1000,
    "×": 584,
}


def text_width(text: str, size: float) -> float:
    """Conservative rendered width of bold text at the given font size."""
    return sum(_BOLD_WIDTHS.get(ch, 556) for ch in text) * size / 1000
