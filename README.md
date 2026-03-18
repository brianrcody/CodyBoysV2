# The Cody Boys

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A personal family photo and video website documenting Nate and Finn Cody.

## What It Is

A lightweight, self-hosted web album. Photos are served from the local filesystem; videos are pulled from a private Vimeo showcase. No frameworks, no databases — vanilla JS, plain CSS, and a small PHP backend.

**Features:**
- Two-level photo browser (year → album → photos) with lightbox viewer
- Full-screen auto-cycling slideshow
- Paginated Vimeo video picker with embedded player
- Developmental milestone tables
- Responsive layout from mobile through 4K

## Tech Stack

- **Frontend:** Vanilla JS (ES5), plain CSS
- **Backend:** PHP 7.4+
- **Video:** Vimeo API v3
- **Dependencies:** Vimeo PHP SDK (via Composer)

## Setup & Deployment

See [SETUP.md](SETUP.md) for full deployment instructions, including:
- Server requirements
- Directory structure for photos
- Generating display and thumbnail images
- Vimeo API credentials
- Email configuration

## Project Structure

```
├── index.html              Landing page
├── pictures.html           Photo album browser
├── videos.html             Video player
├── milestones.html         Developmental milestone tables
├── pictureFrame.html       Full-screen slideshow popup
├── suggestions.html        Contact/feedback form
├── css/                    Stylesheets
├── js/                     Frontend JavaScript modules
├── loadPhotos.php          Photo filesystem proxy
├── loadVideos.php          Vimeo API proxy
├── processPhotos.php       CLI tool — generates thumbnails from source images
├── suggestions.php         Feedback form email handler
├── BKPConstants.php        Server-side config (credentials — not committed)
└── composer.json           PHP dependencies
```
