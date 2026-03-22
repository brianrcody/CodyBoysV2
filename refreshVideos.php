<?php
/**
 * refreshVideos.php — offline catalog generator.
 *
 * Fetches the complete Vimeo album, normalizes each record to the shape
 * videoLoader.js expects, and writes videos.json to the web root.
 *
 * Usage (from the boys/ directory):
 *   php refreshVideos.php
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
