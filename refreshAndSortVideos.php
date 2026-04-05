<?php
/**
 * refreshAndSortVideos.php — offline catalog generator with description-date sort.
 *
 * Fetches the complete Vimeo album, normalizes each record to the shape
 * videoLoader.js expects, sorts by the date on the first line of each
 * video's description (format: "Month day, year", e.g. "January 12, 2016"),
 * and writes videos.json to the web root.
 *
 * Sort order: newest first. Videos with missing or unparseable dates are
 * placed at the end.
 *
 * Usage (from the boys/ directory):
 *   php refreshAndSortVideos.php
 *
 * IMPORTANT: This script is CLI-only. Direct browser access returns HTTP 403.
 */

// Block web access
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Forbidden\n");
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/BKPConstants.php';

/**
 * Parses the date on the first line of a video description.
 * Returns a Unix timestamp, or PHP_INT_MIN if the line cannot be parsed.
 */
function descriptionTimestamp($description) {
    $firstLine = trim(strtok($description ?? '', "\n"));
    $ts = strtotime($firstLine);
    return ($ts === false) ? PHP_INT_MIN : $ts;
}

$outputPath = __DIR__ . '/videos.json';
$perPage    = 50;

$vimeo = new \Vimeo\Vimeo('', '', BKPConstants::VIMEO_ACCESS_TOKEN);

$videos   = [];
$page     = 1;
$total    = null;

echo "Fetching videos from Vimeo...\n";

do {
    echo "  Page $page";

    $response = $vimeo->request(
        '/me/albums/' . BKPConstants::VIMEO_ALBUM_ID . '/videos',
        [
            'per_page'  => $perPage,
            'page'      => $page,
            'sort'      => 'date',
            'direction' => 'desc',
        ],
        'GET'
    );

    if ($response['status'] !== 200) {
        fwrite(STDERR, "\nVimeo API error on page $page: status {$response['status']}\n");
        exit(1);
    }

    $body = $response['body'];

    if ($total === null) {
        $total = $body['total'] ?? 0;
        echo " (total: $total)";
    }

    $pageData = $body['data'] ?? [];
    echo " — " . count($pageData) . " videos\n";

    foreach ($pageData as $video) {
        $uri     = $video['uri'] ?? '';
        $videoId = str_replace('/videos/', '', $uri);

        $thumbnail = '';
        if (!empty($video['pictures']['sizes'])) {
            $sizes     = $video['pictures']['sizes'];
            $thumbIdx  = min(2, count($sizes) - 1);
            $thumbnail = $sizes[$thumbIdx]['link'] ?? '';
        }

        $videos[] = [
            'id'          => $videoId,
            'title'       => $video['name'] ?? '',
            'description' => $video['description'] ?? '',
            'thumbnail'   => $thumbnail,
        ];
    }

    $page++;
} while (count($pageData) === $perPage);

// Sort by description date, newest first; unparseable dates go to the end.
usort($videos, function ($a, $b) {
    return descriptionTimestamp($b['description']) - descriptionTimestamp($a['description']);
});

$json = json_encode(['videos' => $videos], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if ($json === false) {
    fwrite(STDERR, "JSON encoding failed: " . json_last_error_msg() . "\n");
    exit(1);
}

if (file_put_contents($outputPath, $json) === false) {
    fwrite(STDERR, "Failed to write $outputPath\n");
    exit(1);
}

echo "Wrote " . count($videos) . " videos to $outputPath (" . strlen($json) . " bytes)\n";
