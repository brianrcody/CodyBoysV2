<?php
/**
 * Vimeo video loader — server-side proxy.
 *
 * Receives a POST parameter "set" (1-based page number) and returns a JSON
 * object with:
 *   videos[]        — array of { id, title, description, thumbnail }
 *   numVideosTotal   — total number of videos in the album
 *   numVideosPage    — number of videos on this page
 *
 * Uses the official Vimeo PHP SDK (API v3) with a personal access token.
 *
 * Requires: composer require vimeo/vimeo-api
 */

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/BKPConstants.php';

header('Content-Type: application/json');

try {
    $page = isset($_POST['set']) ? intval($_POST['set']) : 1;
    $perPage = 50;

    // Initialize the Vimeo client with a personal access token
    $vimeo = new \Vimeo\Vimeo(null, null, BKPConstants::VIMEO_ACCESS_TOKEN);

    // Fetch videos from the album/showcase
    $response = $vimeo->request(
        '/me/albums/' . BKPConstants::VIMEO_ALBUM_ID . '/videos',
        [
            'per_page' => $perPage,
            'page'     => $page,
            'sort'     => 'date',
            'direction' => 'desc'
        ],
        'GET'
    );

    if ($response['status'] !== 200) {
        throw new Exception('Vimeo API returned status ' . $response['status']);
    }

    $body = $response['body'];
    $totalVideos = $body['total'] ?? 0;

    // Build the video list
    $videos = [];
    if (isset($body['data'])) {
        foreach ($body['data'] as $video) {
            // Extract video ID from the URI (format: /videos/12345)
            $uri = $video['uri'] ?? '';
            $videoId = str_replace('/videos/', '', $uri);

            // Get the best available thumbnail
            $thumbnail = '';
            if (isset($video['pictures']['sizes']) && count($video['pictures']['sizes']) > 0) {
                // Pick a medium-sized thumbnail (index 2 if available, else last)
                $sizes = $video['pictures']['sizes'];
                $thumbIndex = min(2, count($sizes) - 1);
                $thumbnail = $sizes[$thumbIndex]['link'] ?? '';
            }

            $videos[] = [
                'id'          => $videoId,
                'title'       => $video['name'] ?? '',
                'description' => $video['description'] ?? '',
                'thumbnail'   => $thumbnail
            ];
        }
    }

    echo json_encode([
        'videos'         => $videos,
        'numVideosTotal'  => $totalVideos,
        'numVideosPage'   => count($videos)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error'          => $e->getMessage(),
        'videos'         => [],
        'numVideosTotal'  => 0,
        'numVideosPage'   => 0
    ]);
}
?>
