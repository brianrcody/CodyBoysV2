<?php
/**
 * processPhotos.php — CLI image processor for the Cody Boys photo backend.
 *
 * Run via SSH:
 *   php boys/processPhotos.php [--force]
 *
 * For each album under photos/albums/:
 *   - Creates display/ (max 800px on longest edge, JPEG q85) and
 *     thumb/ (270×270 center-crop, JPEG q80) subdirectories.
 *   - Skips files that already exist in display/ or thumb/ (unless --force).
 *   - Handles EXIF orientation for phone photos.
 *   - PNG sources produce JPEG output (.jpg extension).
 *   - Non-image files are ignored.
 *   - Errors on individual files are printed and skipped; the run continues.
 *
 * Prerequisites: PHP GD extension with JPEG and PNG support.
 */

define('ALBUMS_DIR', __DIR__ . '/photos/albums');
define('DISPLAY_SIZE', 800);
define('THUMB_SIZE',   270);
define('DISPLAY_QUALITY', 85);
define('THUMB_QUALITY',   80);

// ============================================================================
// Entry point
// ============================================================================

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "This script must be run from the command line.\n";
    exit(1);
}

$force = in_array('--force', $argv, true);

if (!extension_loaded('gd')) {
    fwrite(STDERR, "ERROR: PHP GD extension is not available.\n");
    exit(1);
}

if (!is_dir(ALBUMS_DIR)) {
    fwrite(STDERR, "ERROR: Albums directory not found: " . ALBUMS_DIR . "\n");
    exit(1);
}

$albums = scandir(ALBUMS_DIR);
if (!$albums) {
    fwrite(STDERR, "ERROR: Cannot read albums directory.\n");
    exit(1);
}

$albumCount    = 0;
$processedTotal = 0;
$skippedTotal   = 0;
$errorTotal     = 0;

foreach ($albums as $albumName) {
    if ($albumName === '.' || $albumName === '..') {
        continue;
    }
    $albumPath = ALBUMS_DIR . '/' . $albumName;
    if (!is_dir($albumPath)) {
        continue;
    }

    $albumCount++;
    echo "\nAlbum: $albumName\n";

    // Find source images in the album root (not subdirectories)
    $sourceFiles = listSourceImages($albumPath);
    if (empty($sourceFiles)) {
        echo "  No source images found.\n";
        continue;
    }

    // Ensure output directories exist
    $displayDir = $albumPath . '/display';
    $thumbDir   = $albumPath . '/thumb';
    if (!ensureDir($displayDir) || !ensureDir($thumbDir)) {
        echo "  ERROR: Cannot create output directories — skipping album.\n";
        $errorTotal++;
        continue;
    }

    $processed = 0;
    $skipped   = 0;
    $errors    = 0;

    foreach ($sourceFiles as $sourceFile) {
        $baseName   = pathinfo($sourceFile, PATHINFO_FILENAME);
        $outputName = $baseName . '.jpg'; // all outputs are JPEG

        $needDisplay = $force || !file_exists($displayDir . '/' . $outputName);
        $needThumb   = $force || !file_exists($thumbDir   . '/' . $outputName);

        if (!$needDisplay && !$needThumb) {
            $skipped++;
            continue;
        }

        // Load source image
        $sourcePath = $albumPath . '/' . $sourceFile;
        $result = loadImage($sourcePath);
        if ($result === null) {
            echo "  WARNING: Cannot load $sourceFile — skipping.\n";
            $errors++;
            continue;
        }
        [$img, $width, $height] = $result;

        // Generate display image
        if ($needDisplay) {
            $displayImg = resizeToFit($img, $width, $height, DISPLAY_SIZE);
            if ($displayImg === null) {
                echo "  WARNING: Resize failed for $sourceFile (display) — skipping.\n";
                $errors++;
                imagedestroy($img);
                continue;
            }
            if (!imagejpeg($displayImg, $displayDir . '/' . $outputName, DISPLAY_QUALITY)) {
                echo "  WARNING: Could not write display/$outputName — skipping.\n";
                imagedestroy($displayImg);
                $errors++;
                imagedestroy($img);
                continue;
            }
            imagedestroy($displayImg);
        }

        // Generate thumbnail
        if ($needThumb) {
            $thumbImg = cropSquare($img, $width, $height, THUMB_SIZE);
            if ($thumbImg === null) {
                echo "  WARNING: Crop failed for $sourceFile (thumb) — skipping.\n";
                $errors++;
                imagedestroy($img);
                continue;
            }
            if (!imagejpeg($thumbImg, $thumbDir . '/' . $outputName, THUMB_QUALITY)) {
                echo "  WARNING: Could not write thumb/$outputName — skipping.\n";
                imagedestroy($thumbImg);
                $errors++;
                imagedestroy($img);
                continue;
            }
            imagedestroy($thumbImg);
        }

        imagedestroy($img);
        $processed++;
    }

    $processedTotal += $processed;
    $skippedTotal   += $skipped;
    $errorTotal     += $errors;

    $total = count($sourceFiles);
    echo "  $total source photos: $processed processed, $skipped skipped, $errors errors.\n";
}

echo "\nDone. $albumCount albums scanned. "
   . "$processedTotal images processed, $skippedTotal skipped, $errorTotal errors.\n";

exit($errorTotal > 0 ? 1 : 0);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns image filenames (jpg, jpeg, png) in the album root (non-recursive).
 *
 * @return string[]
 */
function listSourceImages(string $albumPath): array
{
    $entries = scandir($albumPath);
    if (!$entries) {
        return [];
    }
    $images = [];
    foreach ($entries as $f) {
        if ($f === '.' || $f === '..') {
            continue;
        }
        if (!is_file($albumPath . '/' . $f)) {
            continue; // skip subdirectories
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
 * Creates a directory if it does not already exist.
 */
function ensureDir(string $path): bool
{
    if (is_dir($path)) {
        return true;
    }
    return mkdir($path, 0755);
}

/**
 * Load an image file into a GD resource, applying EXIF orientation correction.
 *
 * Returns [resource, width, height] or null on failure.
 *
 * @return array{resource, int, int}|null
 */
function loadImage(string $path): ?array
{
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

    if ($ext === 'png') {
        $img = @imagecreatefrompng($path);
    } else {
        $img = @imagecreatefromjpeg($path);
    }

    if (!$img) {
        return null;
    }

    // Apply EXIF orientation (JPEG only — PNG has no EXIF)
    if ($ext !== 'png' && function_exists('exif_read_data')) {
        $img = applyExifOrientation($img, $path);
    }

    $width  = imagesx($img);
    $height = imagesy($img);

    return [$img, $width, $height];
}

/**
 * Read EXIF orientation and rotate/flip the GD image accordingly.
 * Returns the corrected image (may be a new resource; the original is destroyed).
 *
 * @param resource $img
 * @return resource
 */
function applyExifOrientation($img, string $path)
{
    $exif = @exif_read_data($path);
    if (!$exif || !isset($exif['Orientation'])) {
        return $img;
    }

    switch ((int) $exif['Orientation']) {
        case 2: // Flip horizontal
            imageflip($img, IMG_FLIP_HORIZONTAL);
            break;
        case 3: // 180°
            $img = imagerotate($img, 180, 0);
            break;
        case 4: // Flip vertical
            imageflip($img, IMG_FLIP_VERTICAL);
            break;
        case 5: // 90° CW + flip horizontal
            $img = imagerotate($img, -90, 0);
            imageflip($img, IMG_FLIP_HORIZONTAL);
            break;
        case 6: // 90° CW
            $img = imagerotate($img, -90, 0);
            break;
        case 7: // 90° CCW + flip horizontal
            $img = imagerotate($img, 90, 0);
            imageflip($img, IMG_FLIP_HORIZONTAL);
            break;
        case 8: // 90° CCW
            $img = imagerotate($img, 90, 0);
            break;
    }

    return $img;
}

/**
 * Resize image so its longest edge is at most $maxEdge pixels.
 * Does not enlarge images smaller than $maxEdge.
 *
 * Returns the resized GD resource, or null on failure.
 *
 * @param resource $img
 * @return resource|null
 */
function resizeToFit($img, int $width, int $height, int $maxEdge)
{
    if ($width <= $maxEdge && $height <= $maxEdge) {
        // No resize needed — return a copy so the caller can destroy it independently
        $copy = imagecreatetruecolor($width, $height);
        if (!$copy) {
            return null;
        }
        imagecopy($copy, $img, 0, 0, 0, 0, $width, $height);
        return $copy;
    }

    if ($width >= $height) {
        $newWidth  = $maxEdge;
        $newHeight = (int) round($height * $maxEdge / $width);
    } else {
        $newHeight = $maxEdge;
        $newWidth  = (int) round($width * $maxEdge / $height);
    }

    $resized = imagecreatetruecolor($newWidth, $newHeight);
    if (!$resized) {
        return null;
    }

    imagecopyresampled($resized, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    return $resized;
}

/**
 * Produce a $size × $size center-cropped thumbnail.
 *
 * Crops the largest centered square from the source, then scales to $size.
 *
 * @param resource $img
 * @return resource|null
 */
function cropSquare($img, int $width, int $height, int $size)
{
    // Largest centered square
    $squareSide = min($width, $height);
    $srcX = (int) (($width  - $squareSide) / 2);
    $srcY = (int) (($height - $squareSide) / 2);

    $thumb = imagecreatetruecolor($size, $size);
    if (!$thumb) {
        return null;
    }

    imagecopyresampled($thumb, $img, 0, 0, $srcX, $srcY, $size, $size, $squareSide, $squareSide);
    return $thumb;
}
