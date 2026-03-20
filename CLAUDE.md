# CLAUDE.md — The Cody Boys Website

## Project Overview

A personal family photo/video website for Brian Cody, documenting sons Nate (born 3/12/2010) and Finn (born 4/18/2013). Photos are served from the local filesystem; videos integrate with Vimeo.

**Stack:** Vanilla JS, plain CSS, PHP backend. No frameworks.

---

## File Map

### HTML Pages
| File | Purpose |
|---|---|
| `index.html` | Landing page — 2×2 navigation tile grid |
| `pictures.html` | Photo album browser with lightbox |
| `videos.html` | Vimeo video player + paginated picker |
| `milestones.html` | Static developmental milestone tables for both boys |
| `pictureFrame.html` | Full-screen slideshow popup (opened by pictures.html) |
| `suggestions.html` | Contact/feedback form |
| `suggestions_sent.html` | Success redirect page |
| `suggestions_notsent.html` | Error redirect page (invalid email) |

### CSS
| File | Purpose |
|---|---|
| `css/reset.css` | HTML5 Doctor reset (v1.6.1) — do not modify |
| `css/bkp.css` | Main stylesheet — all pages, all breakpoints |
| `css/bkpVideos.css` | Video page-specific styles |
| `css/pictureFrame.css` | Slideshow popup styles |

### JavaScript
| File | Purpose |
|---|---|
| `js/BKPConstants.js` | Global config (appName, startingYear, endingYear) |
| `js/decoration.js` | Fetches up to 10 random photos (one per album) and fills the sidebar strip |
| `js/albumBrowser.js` | Two-level photo browser: year → album → photos |
| `js/lightbox.js` | Custom lightbox image viewer with keyboard nav |
| `js/pictureFrame.js` | Auto-cycling slideshow (5-min intervals) |
| `js/videoLoader.js` | Vimeo video loader + paginated picker UI |

### PHP
| File | Purpose |
|---|---|
| `BKPConstants.php` | Server-side config — Vimeo credentials and email address |
| `loadPhotos.php` | Local filesystem photo proxy (3 actions: decoration, albums, photos) |
| `loadVideos.php` | Vimeo API v3 proxy (paginated) |
| `suggestions.php` | Email handler for feedback form |
| `processPhotos.php` | CLI tool — generates `display/` and `thumb/` images from source files |

### Docs
| File | Purpose |
|---|---|
| `SETUP.md` | Full deployment guide |
| `ImprovedLayoutChanges.md` | Changelog for responsive layout improvements |

---

## Architecture

### Common HTML Structure (all pages)

```html
<header>The Cody Boys</header>                          <!-- link on all pages except index -->
<aside id="decoration" class="decoration"></aside>       <!-- sidebar; only shown ≥1024px -->
<ul class="buttonContainer">                             <!-- nav bar; hidden on index -->
  <li><a class="button [page]Button selectedbutton">    <!-- selectedbutton = active page -->
<div id="content" class="[page]Content">                <!-- main content area -->
<footer>Copyright © 2010-2026 ...</footer>
```

### JavaScript Module Pattern

All JS files except `BKPConstants.js` and `lightbox.js` are IIFEs:
```javascript
(function () { "use strict"; ... })();
```

`lightbox.js` uses the revealing module pattern and exports a global `Lightbox` object:
```javascript
var Lightbox = (function () { ... return { open, close }; })();
```

All modules depend on `BKPConstants.js`, which must be loaded first. No ES6 modules — all scripts use `var` and globals.

### Frontend → Backend Integration Points

| JS File | Calls | Purpose |
|---|---|---|
| `decoration.js` | `loadPhotos.php?action=decoration` | Up to 10 random photos for sidebar |
| `albumBrowser.js` | `loadPhotos.php?action=albums` | All album metadata |
| `albumBrowser.js` | `loadPhotos.php?action=photos&albumId=XXX` | Photos in one album |
| `pictureFrame.js` | Both photo actions above | Slideshow data |
| `videoLoader.js` | `loadVideos.php` (POST, `set=[page]`) | Paginated video list |
| `videoLoader.js` | `https://vimeo.com/api/oembed.json` | Embed iframe for selected video |
| `suggestions.html` | `suggestions.php` (form POST) | Send feedback email |

---

## CSS Breakpoint Architecture

Five tiers, cascading in `bkp.css`:

| Breakpoint | Content Width | Key Additions |
|---|---|---|
| `@media only screen` (base) | 600px | Tablet portrait / small desktop baseline |
| `max-width: 600px` | 95% | Mobile phones |
| `min-width: 1024px` | 600px | Decoration sidebar appears (180px wide, full viewport height) |
| `min-width: 1200px` | 800px | Wider content, larger UI elements |
| `min-width: 2000px` | 1600px | XL displays, larger decoration (270px wide, full viewport height) |

**The 1600px content cap is intentional. Do not add wider breakpoints without discussion.**

### Decoration Strip + Content Centering

The decoration strip and content column are centered **as a unit** using `calc()`. The formula:

```
combo = decoration_width + 50px_gap + content_width
decoration left  = calc(50vw - combo/2)
body margin-left = calc(50vw - combo/2 + decoration_width + 50px)
body margin-right = calc(50vw - combo/2)
```

| Tier | Combo | Decoration `left` | Body `margin-left` | Body `margin-right` |
|---|---|---|---|---|
| 1024px+ | 830px | `calc(50vw - 415px)` | `calc(50vw - 185px)` | `calc(50vw - 415px)` |
| 1200px+ | 1030px | `calc(50vw - 515px)` | `calc(50vw - 285px)` | `calc(50vw - 515px)` |
| 2000px+ | 1920px | `calc(50vw - 960px)` | `calc(50vw - 640px)` | `calc(50vw - 960px)` |

**Do not change decoration strip sizing or centering math without recalculating all three tiers.**

### Color Palette

| Color | Hex | Use |
|---|---|---|
| Primary blue | `#1100aa` | Headings, links |
| Orange | `#ff8800` | Hover, active states |
| White | `#ffffff` | Header, footer backgrounds |
| Light blue | `#eeeeff` | Decoration strip background |
| Dark gray | `#333333` | Body text, descriptions |
| Lightbox overlay | `rgba(0,0,0,0.85)` | Lightbox backdrop |

### Typography

Self-hosted fonts (no CDN dependency):
- **Raleway** (Regular 400) — Headings, large display text
- **Oswald** (Light 300) — Navigation, UI buttons
- **Times New Roman** — Body copy

Font files live in `/fonts/` as `.woff2` + `.ttf` pairs.

---

## Responsive Sizing Reference

### Photo Thumbnails (`bkp.css` — `.album-thumb`)

Thumbnail sizing is CSS-driven via the `.album-thumb` class. `albumBrowser.js` no longer sets
`width` or `height` on thumbnail elements; the JS `thumbnailSize` variable has been removed.

| Breakpoint | Content Width | Thumbnail Size | Target Columns |
|---|---|---|---|
| `≥2000px` | 1600px | 256px | 6 |
| `≥1200px` | 800px | 256px | 3 |
| `≥1024px` (base + sidebar) | 600px | 186px | 3 |
| `<600px` (mobile) | 95% | 72px | 3+ |

The same breakpoints also size `.album-title` (width), `.album-back-btn` (width + height), and
`.album-back-inner` (width, height, line-height) to keep the back button tile consistent with
photo and album-cover thumbnails.

### Video Player (`videoLoader.js` — `getPlayerSize()`)
```
≥2000px : 1280×720
≥1200px : 800×600
≥1024px : 600×450
<1024px : 320×240
```

### Video Picker Thumbnails (`bkpVideos.css`)
Percentage-based — always 5 thumbnails per row:
```css
.video_picker { width: 18%; margin-right: 2%; }
.video_picker img { width: 100%; height: auto; display: block; }
```

---

## Local Photo Backend

Photos are served entirely from the local filesystem — no external API calls.

### Directory Structure

```
photos/albums/
└── Nate 2013/                 ← album directory; title = directory name
    ├── IMG_001.jpg            ← source images (jpg, jpeg, png)
    ├── IMG_002.jpg
    ├── display/
    │   ├── IMG_001.jpg        ← 800px max edge, JPEG q85
    │   └── IMG_002.jpg
    └── thumb/
        ├── IMG_001.jpg        ← 270×270 center-crop, JPEG q80
        └── IMG_002.jpg
```

`display/` and `thumb/` are generated by `processPhotos.php` — they are not committed to the repository.

### Running processPhotos.php

```bash
php processPhotos.php          # skip already-processed files
php processPhotos.php --force  # reprocess everything
```

Requires PHP GD extension with JPEG and PNG support. Run via SSH after uploading new source photos.

### Album Matching

`loadPhotos.php` matches album directories using this regex per year:
```
/Nate.*(?<!-)YEAR(-\d{4})?$/
```
Albums must be named like "Nate 2013", "Nate and Finn 2014", "Nate 2013-2014", etc.
The `STARTING_YEAR` and `ENDING_YEAR` constants in `loadPhotos.php` must be kept in sync with `BKPConstants.js`.

### Album IDs

Album IDs are URL-safe slugs derived from the directory name (lowercase, non-alphanumeric runs replaced with hyphens). The `albumId` query parameter on `?action=photos` expects this slug form.

### Decoration Strip Fill Behavior

`decoration` returns up to 10 random photos (one per randomly chosen album). The JS in `decoration.js` repeats the sequence as needed to fill the full viewport height (`height: 100vh`). Images are sized 180×180px (standard) or 270×270px (2000px+ tier) and overflow is clipped.

---

## Vimeo API

**Authentication:** Personal access token (read-only), stored in `BKPConstants.php`.
**Endpoint:** `GET /me/albums/{VIMEO_ALBUM_ID}/videos`
**Sort:** By date, descending (newest first).
**Pagination:** 50 videos per server-side page; UI shows 5 thumbnails per picker page.

---

## Key Conventions

- **No ES6 modules** — use `var`, plain functions, and IIFEs.
- **No frameworks** — no jQuery, React, Vue, etc.
- **Event delegation** preferred over per-element listeners (see `videoLoader.js` picker).
- **Fail silently** — fetch errors are caught and logged; UI degrades gracefully.
- **Data attributes** for DOM-element associations: `data-video-id`, `data-page-id`, `data-action`.
- **Inline styles** via `element.style.cssText` for bulk programmatic styling.
- **No retry logic** — single fetch attempt per request.
- `photoCache = {}` in `albumBrowser.js` caches photos by albumId to avoid duplicate requests.

---

## Z-Index Layers

| Z-Index | Element |
|---|---|
| 10001 | Lightbox prev/next arrows |
| 10000 | Lightbox overlay |
| static | All normal page content |
| absolute | Decoration strip (positioned left of body) |

---

## What Must Exist on the Server

The following files are not in the repository and must be provided separately:

- `/fonts/Raleway-Regular.woff2` and `.ttf`
- `/fonts/Oswald-Light.woff2` and `.ttf`
- `/css/camera.svg`, `film.svg`, `steps.svg`, `mail.svg`
- `/NateILoveYouDaddy.m4a`
- `/vendor/` (run `composer install` — only Vimeo SDK is actively used)
- Vimeo credentials filled into `BKPConstants.php`
- `photos/albums/` directory tree with source images
- `display/` and `thumb/` subdirectories generated by `processPhotos.php`

## Server Requirements

- PHP 7.4+, `gd` extension enabled (for `processPhotos.php`), `exif` extension recommended
- Configured MTA (Postfix/Sendmail) for `suggestions.php`
- HTTPS enabled
- `vendor/` directory not web-accessible
- `photos/albums/` must be web-readable (served as static files)

---

## Security Notes

- `BKPConstants.php` contains Vimeo credentials — PHP must execute it, not serve it as text.
- `vendor/` should be blocked from direct web access.
- `processPhotos.php` is CLI-only and will return HTTP 403 if accessed via a browser.
- `suggestions.php` validates the `from` email address including DNS check, but `body` is passed directly to PHP `mail()` — keep this in mind if extending the form.
