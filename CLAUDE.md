# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A stock **reveal.js 6.0.1** checkout (from master, `dist/` pre-built) used as the base for a conference slide deck: **"Understanding Cognitive Complexity in Python"** — PyCon Colombia 2026, 30 min + 10 min Q&A, slides in English.

The deck lives entirely in:

- `index.html` — all slides as plain HTML `<section>`s (no markdown), organized in 5 commented "acts"
- `assets/css/pycon-theme.css` — theme + all custom component styles
- `assets/js/cogc-scorer.js` — the "live complexity scorer" component
- `assets/fonts/`, `assets/img/` — locally bundled fonts (Space Grotesk, JetBrains Mono) and PyCon logos, so the deck works offline / via `file://`
- `talk.py` — every Python snippet shown in the deck, used to verify the complexity numbers

**Do not modify reveal.js core** (`dist/`, `css/`, `js/`, `plugin/`, `react/`, `test/`) — it is untouched upstream code. `pycon-colombia-logos/` is the logo source-of-truth; `assets/img/` holds the copies actually referenced.

## Commands

```bash
# Run the deck (no install needed — dist/ is pre-built)
python3 -m http.server 8321        # then open http://localhost:8321

# Dev server with live reload (optional; Node >= 20.19)
npm install && npm run dev

# Verify every complexity number shown on the slides
pip install complexipy radon
complexipy talk.py                 # cognitive complexity per function
python3 -m radon cc -s talk.py     # cyclomatic complexity

# PDF export: open http://localhost:8321/?print-pdf and print to PDF
# (Chrome inserts a handful of blank spill pages — known cosmetic quirk)
```

There are no tests for the deck itself; verification is visual (headless Chrome screenshots work well: `--headless=new --window-size=1280,720 --virtual-time-budget=6000 --screenshot=... "http://localhost:8321/#/<h>/0/<fragment>"`).

## Architecture: the live scorer

The deck's signature component steps through code fragments, popping `+N` badges next to lines, lighting nesting bars, and counting a running total. Its design is dictated by two verified reveal.js behaviors:

1. With `data-line-numbers="a|b|c"`, the highlight plugin **clones the whole `<code>` element once per step** (absolutely stacked, toggled as ordinary fragments). There is no single block to mutate.
2. PDF export (`?print-pdf`) toggles fragment visibility classes **without firing fragment events** — any state created by event listeners is invisible in the PDF.

Therefore `cogc-scorer.js` **bakes each step's full cumulative state statically into the corresponding clone** at `Reveal.on('ready')`: badge `<td>`s appended to the line table, nesting classes, and an in-flow total strip stamped with `data-cogc-total`. Reveal's native fragment machinery then handles forward/backward/jump/overview/PDF with zero scorer logic. The only live behavior is a cosmetic count-up tween on `fragmentshown`/`fragmenthidden`.

Authoring a scorer slide is declarative:

```html
<pre class="code-sm"><code class="language-python hljs cogc-block" data-trim
    data-line-numbers="|3|5"
    data-cogc-steps='[
      {"total": 0},
      {"total": 1, "line": 3, "inc": 1, "nest": 0, "label": "for"},
      {"total": 3, "line": 5, "inc": 2, "nest": 1, "label": "if, nested"}
    ]'>
```

Invariants that will break the scorer if violated:

- `data-cogc-steps` entries must align **1:1** with the `|`-separated `data-line-numbers` steps (entry 0 = base state). A step may carry multiple `marks: [...]` instead of a single `line`.
- Line numbers refer to post-`data-trim` lines (1-indexed).
- The highlight plugin's clones carry **no** `data-fragment-index`, so **never** put an explicit `data-fragment-index` on sibling fragments in a scorer slide — reveal's sort would reorder them ahead of the code steps. DOM order alone gives the right sequence.
- `pre.code-wrapper` must keep **zero padding** (clones are absolutely positioned to the pre's padding box; padding offsets them from the base) and `code` must keep an **opaque background** (each visible clone covers the states beneath it).
- `data-cogc-mode="cc"` + `data-cogc-label` switch the component to cyclomatic-counting style (neutral color, no nesting bars).

## Layout constraints

- Design canvas is **1280×720 (16:9)**; reveal scales it to any screen (`maxScale: 3.0` fills 4K). Everything on a slide must fit the 720px design height — overflow is silently cut. Long snippets (≥ ~10 lines) or scorer slides with a takeaway below use `<pre class="code-sm">`.
- Reusable patterns in `pycon-theme.css`: `.takeaway` (rule banner), `.cogc-versus` (big-number comparison; its `.cogc-versus-note` is a full-row caption), `.terminal` (CLI mockup), `.card`/`.cols`, `.statement` (breathing-beat slides), `.score-chip` (used with `data-auto-animate` on the refactor before/after pairs).
- Palette is PyCon Colombia brand: `#FFFFFF`, `#F2F3FD`, `#B6BDF0`, `#614AD3` (tokens in `:root`), with a severity ramp for scores (green ≤ 5, amber 6–10, red ≥ 11).

## Content rule

Every complexity number displayed on a slide must be reproducible: add the snippet to `talk.py` and check it with `complexipy` (and `radon` if the slide claims a cyclomatic number) before putting the number on the slide. All current numbers are verified against complexipy 6.2.0.
