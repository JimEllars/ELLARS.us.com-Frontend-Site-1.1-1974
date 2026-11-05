# Self-hosted typefaces

Four families, four files, 108 kB in total. `src/fonts.css` declares them; this note
records where they came from, because a binary in `public/` that nobody can identify is
how a project ends up afraid to touch its own assets.

## Provenance

Derived from Google Fonts on 5 November 2026 by requesting the same CSS the site used
to `@import`, with a WOFF2-capable user agent, and keeping only the `/* latin */`
blocks:

```
https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&family=Cinzel:wght@400;700;900&family=Marcellus&family=VT323&display=swap
```

| File | Family | Weights | Google version | Bytes |
|---|---|---|---|---|
| `inter-variable.woff2` | Inter | 300–800 | v20 | 48,256 |
| `cinzel-variable.woff2` | Cinzel | 400–900 | v26 | 25,904 |
| `marcellus-400.woff2` | Marcellus | 400 | v14 | 14,552 |
| `vt323-400.woff2` | VT323 | 400 | v18 | 17,936 |

**One file per family, not per weight.** Google answers a weight list with a single
variable font and repeats its URL in each `@font-face` rule. Downloading per weight
produced five byte-identical 48 kB Inter files — 351 kB of duplicates for 108 kB of
typeface. `src/fonts.css` therefore declares `font-weight: 300 800` once.

Latin only, on purpose: the site is English. A page that needs Cyrillic or Greek
coverage will render in the fallback face for those characters rather than downloading a
subset nobody reads — to fix that properly, add the subset's blocks to `src/fonts.css`
and the corresponding `.woff2` here.

`unicode-range` and `font-display: swap` are copied from Google's CSS unchanged, so the
browser still downloads nothing for characters a page does not use, and text paints in
the fallback face rather than staying invisible while the file loads.

## Licensing

All four families are licensed under the SIL Open Font License 1.1, which permits
self-hosting, bundling and redistribution — including commercially — provided the font
is not sold on its own and any derivative keeps the same license:

- Inter — © The Inter Project Authors
- Cinzel — © The Cinzel Project Authors
- Marcellus — © The Marcellus Project Authors
- VT323 — © The VT323 Project Authors

License texts: <https://openfontlicense.org>. The fonts are unmodified, so the reserved
font names are unaffected.

## Why not `@fontsource`

`@fontsource` is the usual answer and would work. It was not used because four families
would add four npm dependencies (and their transitive `@fontsource/*` packages) to
ship 108 kB of static files that never change — and their versioning is separate from
the deployed CSS that references them. Pinning the bytes here means a font cannot change
under a rebuild, which is the same reason the social card is a committed PNG.
