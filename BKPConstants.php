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
    // Google Photos Library API (OAuth 2.0)
    // =========================================================================
    // 1. Create a project at https://console.cloud.google.com/
    // 2. Enable the "Photos Library API"
    // 3. Create OAuth 2.0 credentials (Web application type)
    // 4. Run the one-time authorization flow to obtain a refresh token
    //    (see SETUP.md for instructions)

    /** @var string Google OAuth 2.0 client ID */
    const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

    /** @var string Google OAuth 2.0 client secret */
    const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

    /** @var string Google OAuth 2.0 refresh token (obtained from one-time auth flow) */
    const GOOGLE_REFRESH_TOKEN = 'YOUR_GOOGLE_REFRESH_TOKEN';

    // =========================================================================
    // Email
    // =========================================================================

    /** @var string Destination email for the suggestions form */
    const SUGGESTIONS_EMAIL = 'brianrcody@gmail.com';
}
?>
