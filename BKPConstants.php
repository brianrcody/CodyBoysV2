<?php
/**
 * Server-side constants for Brian's Kid Page.
 *
 * Fill in all YOUR_* placeholder values before deploying.
 */
class BKPConstants {

    // =========================================================================
    // Vimeo API v3
    // =========================================================================
    // Create a new app at https://developer.vimeo.com/apps
    // Generate a personal access token with "public" and "private" scopes.

    /** @var string Vimeo personal access token (read scope) */
    const VIMEO_ACCESS_TOKEN = 'YOUR_VIMEO_ACCESS_TOKEN';

    /** @var string Vimeo album/showcase ID. Old value was 2255162 — confirm this is still correct. */
    const VIMEO_ALBUM_ID = 'YOUR_VIMEO_ALBUM_ID';

    // =========================================================================
    // Email
    // =========================================================================

    /** @var string Destination email for the suggestions form */
    const SUGGESTIONS_EMAIL = 'brianrcody@gmail.com';
}
?>
