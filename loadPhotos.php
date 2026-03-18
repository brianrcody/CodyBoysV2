<?php
/**
 * Bespoke photo proxy — reads from the local filesystem.
 *
 * Actions:
 *   ?action=decoration          — 10 random photos (1 per album) for the decoration strip
 *   ?action=albums              — all matching albums with ID, title, coverUrl
 *   ?action=photos&albumId=XXX  — all photos in a specified album
 *
 * No external dependencies. Photo files live under photos/albums/ relative
 * to this file. Album directory names ARE the album titles.
 *
 * Keep STARTING_YEAR and ENDING_YEAR in sync with BKPConstants.js.
 */

define('ALBUMS_DIR', __DIR__ . '/photos/albums');
define('ALBUMS_URL', 'photos/albums');
define('STARTING_YEAR', 2009);
define('ENDING_YEAR',   2016);

header('Content-Type: application/json');

// ============================================================================
// Helpers
// ============================================================================

/**
 * Test whether an album title matches the Nate-photos regex for any year
 * in the configured range. Regex per year Y: /Nate.*\bY(-\d{4})?$/
 */
function albumMatchesAnyYear(string $title): bool
{
    for ($year = STARTING_YEAR; $year <= ENDING_YEAR; $year++) {
        if (preg_match('/Nate.*(?<!-)' . $year . '(-\d{4})?$/', $title)) {
            return true;
        }
    }
    return false;
}

/**
 * Derive a URL-safe slug from a string (album or filename).
 * Lowercase, replace runs of non-alphanumeric chars with hyphens, trim ends.
 */
function toSlug(string $s): string
{
    $slug = strtolower($s);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    return trim($slug, '-');
}

/**
 * Return image filenames (jpg, jpeg, png) in a directory, sorted alphabetically.
 */
function listImages(string $dir): array
{
    if (!is_dir($dir)) {
        return [];
    }
    $files = scandir($dir);
    if (!$files) {
        return [];
    }
    $images = [];
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') {
            continue;
        }
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
            $images[] = $f;
        }
    }
    sort($images);
    return $images;
}

/**
 * Return all album directory names that match the title regex.
 */
function getMatchingAlbums(): array
{
    if (!is_dir(ALBUMS_DIR)) {
        return [];
    }
    $entries = scandir(ALBUMS_DIR);
    if (!$entries) {
        return [];
    }
    $albums = [];
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        if (is_dir(ALBUMS_DIR . '/' . $entry) && albumMatchesAnyYear($entry)) {
            $albums[] = $entry;
        }
    }
    return $albums;
}

/**
 * Find the album directory whose slug matches the given slug.
 * Returns the directory name, or null if not found.
 * Validates that the resolved path is a direct child of ALBUMS_DIR.
 */
function findAlbumBySlug(string $slug): ?string
{
    if (!is_dir(ALBUMS_DIR)) {
        return null;
    }
    $entries = scandir(ALBUMS_DIR);
    if (!$entries) {
        return null;
    }
    $base = realpath(ALBUMS_DIR);
    if (!$base) {
        return null;
    }
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        $path = ALBUMS_DIR . '/' . $entry;
        if (!is_dir($path)) {
            continue;
        }
        if (toSlug($entry) !== $slug) {
            continue;
        }
        // Guard against directory traversal via symlinks
        $resolved = realpath($path);
        if ($resolved && strpos($resolved, $base . DIRECTORY_SEPARATOR) === 0) {
            return $entry;
        }
    }
    return null;
}

/**
 * Find the source image file in an album directory by base name,
 * matching the extension case-insensitively. Returns the actual filename
 * (preserving original casing, e.g. .JPG), or a .jpg fallback.
 */
function findSourceFile(string $albumPath, string $baseName): string
{
    $files = @scandir($albumPath);
    if ($files) {
        foreach ($files as $f) {
            if (pathinfo($f, PATHINFO_FILENAME) !== $baseName) continue;
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
                return $f;
            }
        }
    }
    return $baseName . '.jpg';
}

/**
 * Build a photo response entry for a display-sized file in an album.
 * processPhotos.php always produces JPEG display/thumb files. The source
 * may be .jpg, .jpeg, .png, or an uppercase variant — find it by scanning.
 */
function buildPhotoEntry(string $albumDir, string $displayFile): array
{
    $baseName = pathinfo($displayFile, PATHINFO_FILENAME);
    $albumPath = ALBUMS_DIR . '/' . $albumDir;

    $sourceFile = findSourceFile($albumPath, $baseName);

    $thumbFile  = $baseName . '.jpg';   // processPhotos.php always generates .jpg

    return [
        'id'          => toSlug($displayFile),
        'title'       => $displayFile,
        'url'         => ALBUMS_URL . '/' . $albumDir . '/display/' . $displayFile,
        'thumbUrl'    => ALBUMS_URL . '/' . $albumDir . '/thumb/'   . $thumbFile,
        'originalUrl' => ALBUMS_URL . '/' . $albumDir . '/'         . $sourceFile,
    ];
}

// ============================================================================
// Action dispatch
// ============================================================================

$action = $_GET['action'] ?? '';

try {
    switch ($action) {

        // ====================================================================
        // Decoration: 1 random photo from each of 10 randomly selected albums
        // ====================================================================
        case 'decoration':
            $allAlbums = getMatchingAlbums();
            if (empty($allAlbums)) {
                echo json_encode(['photos' => []]);
                break;
            }

            if (count($allAlbums) <= 10) {
                $selected = $allAlbums;
                shuffle($selected);
            } else {
                $keys     = (array) array_rand($allAlbums, 10);
                $selected = array_map(fn($k) => $allAlbums[$k], $keys);
            }

            $photos = [];
            foreach ($selected as $albumDir) {
                $thumbFiles = listImages(ALBUMS_DIR . '/' . $albumDir . '/thumb');
                if (empty($thumbFiles)) {
                    continue;
                }
                $thumbFile = $thumbFiles[array_rand($thumbFiles)];
                $photos[] = [
                    'id'       => toSlug($thumbFile),
                    'title'    => $thumbFile,
                    'thumbUrl' => ALBUMS_URL . '/' . $albumDir . '/thumb/' . $thumbFile,
                ];
            }

            echo json_encode(['photos' => $photos]);
            break;

        // ====================================================================
        // Albums: all matching albums with ID, title, and cover thumbnail URL
        // ====================================================================
        case 'albums':
            $allAlbums = getMatchingAlbums();
            $result    = [];
            foreach ($allAlbums as $albumDir) {
                $thumbFiles = listImages(ALBUMS_DIR . '/' . $albumDir . '/thumb');
                $coverUrl   = null;
                if (!empty($thumbFiles)) {
                    $coverUrl = ALBUMS_URL . '/' . $albumDir . '/thumb/' . $thumbFiles[0];
                }
                $result[] = [
                    'id'       => toSlug($albumDir),
                    'title'    => $albumDir,
                    'coverUrl' => $coverUrl,
                ];
            }
            echo json_encode(['albums' => $result]);
            break;

        // ====================================================================
        // Photos: all photos in a specified album
        // ====================================================================
        case 'photos':
            $albumId = $_GET['albumId'] ?? '';
            if ($albumId === '') {
                http_response_code(500);
                echo json_encode(['error' => 'albumId is required']);
                break;
            }

            $albumDir = findAlbumBySlug($albumId);
            if ($albumDir === null) {
                http_response_code(500);
                echo json_encode(['error' => 'Album not found']);
                break;
            }

            $displayFiles = listImages(ALBUMS_DIR . '/' . $albumDir . '/display');
            $photos       = [];
            foreach ($displayFiles as $f) {
                $photos[] = buildPhotoEntry($albumDir, $f);
            }
            echo json_encode(['photos' => $photos]);
            break;

        default:
            http_response_code(500);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
