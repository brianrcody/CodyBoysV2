# Setup & Deployment Guide

This document explains how to deploy the modernized Cody Boys website.

---

## 1. Server Requirements

- PHP 7.4 or later with `curl` extension enabled
- Composer (PHP dependency manager) — https://getcomposer.org/
- A configured Mail Transfer Agent (e.g. Postfix) for the suggestions form
- HTTPS enabled on the web server

---

## 2. Install PHP Dependencies

From the `boys/` directory on your web server, run:

```bash
composer install
```

This creates a `vendor/` directory containing the Vimeo PHP SDK. You only need
to do this once (and again if you update `composer.json`).

---

## 3. Add Font Files

Download the following fonts and place them in `boys/fonts/`:

**Raleway** (Regular weight):
- Source: https://github.com/impallari/Raleway
- Files needed: `Raleway-Regular.woff2` and `Raleway-Regular.ttf`

**Oswald** (Light / 300 weight):
- Source: https://github.com/googlefonts/OswaldFont
- Files needed: `Oswald-Light.woff2` and `Oswald-Light.ttf`

You can also download these from Google Fonts' GitHub releases. The CSS
expects exactly these filenames in the `fonts/` directory.

---

## 4. Add SVG Icon Files

Copy these four SVG files from the original `boys` repository into the
`boys/css/` directory (they are referenced from `bkp.css` as relative paths):

- `camera.svg`
- `film.svg`
- `steps.svg`
- `mail.svg`

---

## 5. Add the Audio File

Place `NateILoveYouDaddy.m4a` in the `boys/` root directory.

---

## 6. Configure Vimeo API v3

1. Go to https://developer.vimeo.com/apps and create a new app
2. Under "Personal access tokens", generate a token with **Public** and
   **Private** scopes
3. Note your album/showcase ID (the old value was `2255162` — check if this
   is still correct at https://vimeo.com/manage/showcases)
4. Edit `BKPConstants.php` and fill in:
   - `VIMEO_ACCESS_TOKEN` — your personal access token
   - `VIMEO_ALBUM_ID` — your album/showcase ID

---

## 7. Set Up the Photo Library

Photos are served from the local filesystem — no external API is involved.

### 7a. Create the album directory structure

Under the site root, create a `photos/albums/` directory. Each album is a
subdirectory whose name is the album title:

```
photos/albums/
├── Nate 2010/
│   ├── IMG_001.jpg
│   └── IMG_002.jpg
├── Nate and Finn 2013/
│   ├── photo001.jpg
│   └── ...
└── ...
```

Place source photos (JPG, JPEG, or PNG) directly in each album directory.

### 7b. Album naming convention

`loadPhotos.php` matches album directories using this regex per configured year:
```
/Nate.*(?<!-)YEAR(-\d{4})?$/
```
Album titles like "Nate 2010", "Nate and Finn 2013", or "Nate 2013-2014" all
match. The year range is controlled by `STARTING_YEAR` and `ENDING_YEAR` in
`loadPhotos.php`; keep these in sync with `startingYear` in `js/BKPConstants.js`.

### 7c. Process photos

Run the image processor via SSH to generate `display/` and `thumb/`
subdirectories inside each album:

```bash
php processPhotos.php
```

This creates:
- `display/` — each photo resized to 800px max edge, JPEG quality 85
- `thumb/` — each photo center-cropped to 270×270, JPEG quality 80

Skips files already processed. Use `--force` to reprocess everything.

**Prerequisites:** PHP `gd` extension with JPEG and PNG support; `exif`
extension recommended (enables automatic EXIF orientation correction for
phone photos).

Run this script again whenever you add new photos.

---

## 9. Security Notes

- **`BKPConstants.php`** contains Vimeo credentials. Make sure your web
  server does NOT serve `.php` source files as plain text. Apache and nginx
  with PHP configured correctly will execute them instead.
- The `vendor/` directory should ideally not be web-accessible. If your
  server setup allows it, add a `.htaccess` file or nginx rule to deny
  direct access to `vendor/`.
- `processPhotos.php` is CLI-only — it checks `php_sapi_name()` and returns
  HTTP 403 if accessed via a browser. No special server config needed to
  protect it, but blocking it at the web server level is also fine.
- `photos/albums/` must be web-readable (images are linked directly in the
  browser). Source photos in the album root dirs are also accessible; if you
  want to restrict access to originals, configure the web server to deny
  requests to `photos/albums/*/` except under `display/` and `thumb/`.

---

## 10. File Structure

After setup, your `boys/` directory should look like this:

```
boys/
├── index.html
├── pictures.html
├── videos.html
├── milestones.html
├── suggestions.html
├── suggestions_sent.html
├── suggestions_notsent.html
├── pictureFrame.html
├── NateILoveYouDaddy.m4a          ← you provide
├── css/
│   ├── reset.css
│   ├── bkp.css
│   ├── bkpVideos.css
│   ├── pictureFrame.css
│   ├── camera.svg                  ← you provide
│   ├── film.svg                    ← you provide
│   ├── steps.svg                   ← you provide
│   └── mail.svg                    ← you provide
├── js/
│   ├── BKPConstants.js
│   ├── decoration.js
│   ├── albumBrowser.js
│   ├── lightbox.js
│   ├── videoLoader.js
│   └── pictureFrame.js
├── fonts/
│   ├── Raleway-Regular.woff2       ← you provide
│   ├── Raleway-Regular.ttf         ← you provide
│   ├── Oswald-Light.woff2          ← you provide
│   └── Oswald-Light.ttf            ← you provide
├── photos/
│   └── albums/                     ← you provide
│       ├── Nate 2010/
│       │   ├── IMG_001.jpg         ← source photos (you provide)
│       │   ├── display/            ← generated by processPhotos.php
│       │   └── thumb/              ← generated by processPhotos.php
│       └── ...
├── BKPConstants.php                ← fill in Vimeo credentials
├── loadPhotos.php
├── loadVideos.php
├── processPhotos.php
├── suggestions.php
├── composer.json
└── vendor/                         ← created by composer install
```
