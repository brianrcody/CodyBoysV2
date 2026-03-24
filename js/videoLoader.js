/**
 * Video loader — fetches the static video catalog and manages the video picker UI.
 *
 * Loads all videos from videos.json on init (single fetch, no pagination).
 * Responsive player sizing:
 *   >= 2000px: 1280x720
 *   >= 1200px: 800x600
 *   >= 1024px: 600x450
 *   < 1024px:  320x240
 *
 * Responsive page picker:
 *   >= 600px: 10 visible pages
 *   < 600px:  5 visible pages
 */
(function () {
    "use strict";

    // Picker UI data
    var numVideosInPicker = 5;
    var numVideos = -1;
    var numPickerPages = -1;

    // Video data
    var videos = [];

    // Load state — true once videos.json has been fully parsed
    var allVideosLoaded = false;
    var loadPromise = null;

    // Search state
    var filteredVideos = null;   // null = normal mode; array = active search results
    var searchIsActive = false;  // true while a search filter (or no-results state) is in effect

    /**
     * Get responsive player dimensions.
     */
    function getPlayerSize() {
        var w = window.innerWidth;
        if (w >= 2000) return { width: 1280, height: 720 };
        if (w >= 1200) return { width: 800, height: 600 };
        if (w >= 1024) return { width: 600, height: 450 };
        return { width: 320, height: 240 };
    }

    /**
     * Get responsive number of visible picker pages.
     */
    function getNumVisiblePickerPages() {
        return (window.innerWidth >= 600) ? 10 : 5;
    }

    // ── Player ───────────────────────────────────────────────────────────────

    /**
     * Load a video into the player area.
     * @param {number} index - absolute index into videos[].
     */
    function loadVideo(index) {
        var video = videos[index];
        if (!video) return;

        // Update title
        var titleEl = document.querySelector(".title");
        if (titleEl) titleEl.textContent = video.title;

        // Update description
        var descEl = document.querySelector(".description");
        if (descEl) descEl.innerHTML = video.description.replace(/\n/g, "<br>");

        removeSkeleton("skeletonTitle");
        removeSkeleton("skeletonDesc");
        var titleEl2 = document.querySelector(".title");
        if (titleEl2) titleEl2.classList.add("fadeIn");
        var descEl2 = document.querySelector(".description");
        if (descEl2) descEl2.classList.add("fadeIn");

        // Update player via Vimeo oEmbed
        var size = getPlayerSize();
        var oEmbedUrl = "https://vimeo.com/api/oembed.json" +
            "?url=" + encodeURIComponent("https://vimeo.com/" + video.id) +
            "&maxwidth=" + size.width +
            "&maxheight=" + size.height +
            "&title=false&portrait=false&byline=false";

        fetch(oEmbedUrl)
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                var playerEl = document.querySelector(".player");
                if (playerEl) playerEl.innerHTML = data.html;
                removeSkeleton("skeletonPlayer");
                if (playerEl) playerEl.classList.add("fadeIn");
            })
            .catch(function (error) {
                console.error("Error loading video player:", error);
            });
    }

    // ── Picker ───────────────────────────────────────────────────────────────

    /**
     * Generate the video picker HTML (5 thumbnails per page).
     *
     * In normal mode, videoList is videos[] and absIndex is the loop position i.
     * In search mode, videoList is filteredVideos[] and each item carries an explicit
     * absIndex property pointing into the full videos[] array.
     *
     * @param {number} page - 0-based picker page.
     * @param {Array} videoList - array of video objects.
     * @param {number} count - total number of videos in videoList.
     * @returns {string} HTML string.
     */
    function generateVideoPickerUI(page, videoList, count) {
        var start = page * numVideosInPicker;
        var html = '<div id="videopicker">';
        for (var i = start; i < count && i < start + numVideosInPicker; i++) {
            var v = videoList[i];
            var absIdx = (v.absIndex !== undefined) ? v.absIndex : i;
            html += '<span title="' + escapeHtml(v.title) + '">';
            html += '<span class="video_picker"><a data-video-id="' + absIdx + '">';
            html += '<img src="' + escapeHtml(v.thumbnail) + '"/>';
            html += '</a></span></span>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Generate the page picker HTML.
     * @param {number} page - 0-based current picker page.
     * @param {number} pickerPages - total number of picker pages.
     * @returns {string} HTML string.
     */
    function generatePagePickerUI(page, pickerPages) {
        var numVisiblePickerPages = getNumVisiblePickerPages();
        var html = '<div id="pagepicker">';
        var basePage = (Math.floor(page / numVisiblePickerPages) * numVisiblePickerPages) + 1;

        // Preceding pages link
        if (basePage > 1) {
            html += '<a data-action="preceding" data-page="' +
                (basePage - numVisiblePickerPages - 1) + '" href="#">[...]</a> ';
        }

        // Visible page links
        for (var p = basePage; p <= pickerPages && p < basePage + numVisiblePickerPages; p++) {
            if (p === page + 1) {
                html += '<span class="selectedpage">[' + p + ']</span> ';
            } else {
                html += '<a href="#pagepicker" data-page-id="' + (p - 1) + '">[' + p + ']</a> ';
            }
        }

        // Following pages link
        if (basePage + numVisiblePickerPages - 1 < pickerPages) {
            html += '<a data-action="following" data-page="' +
                (basePage + numVisiblePickerPages - 1) + '" href="#">[...]</a>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Load the picker UI for a given page.
     * Uses filteredVideos if a search is active, otherwise uses the full videos[] list.
     * @param {number} page - 0-based picker page.
     */
    function loadPicker(page) {
        var pickerEl = document.querySelector(".picker");
        if (!pickerEl) return;

        var videoList, count, pickerPages;
        if (filteredVideos !== null) {
            videoList = filteredVideos;
            count = filteredVideos.length;
            pickerPages = Math.ceil(count / numVideosInPicker);
        } else {
            videoList = videos;
            count = numVideos;
            pickerPages = numPickerPages;
        }

        pickerEl.innerHTML = generateVideoPickerUI(page, videoList, count) +
                             generatePagePickerUI(page, pickerPages);
        removeSkeleton("skeletonPicker");
        pickerEl.classList.add("fadeIn");

        // Preceding pages click handler
        var precedingEl = pickerEl.querySelector('[data-action="preceding"]');
        if (precedingEl) {
            precedingEl.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var bp = Number(this.getAttribute("data-page"));
                loadPicker(bp);
            });
        }

        // Following pages click handler — all data is in memory, no fetch needed
        var followingEl = pickerEl.querySelector('[data-action="following"]');
        if (followingEl) {
            followingEl.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var bp = Number(this.getAttribute("data-page"));
                loadPicker(bp);
            });
        }

        // Page number click handler (delegated)
        var pagePickerEl = pickerEl.querySelector("#pagepicker");
        if (pagePickerEl) {
            pagePickerEl.addEventListener("click", function (e) {
                var target = e.target;
                var pageId = target.getAttribute("data-page-id");
                if (pageId !== null) {
                    e.preventDefault();
                    loadPicker(Number(pageId));
                }
            });
        }

        // Video thumbnail click handler (delegated)
        var videoPickerEl = pickerEl.querySelector("#videopicker");
        if (videoPickerEl) {
            videoPickerEl.addEventListener("click", function (e) {
                e.preventDefault();
                // Walk up to find the <a> with data-video-id
                var target = e.target;
                while (target && target !== videoPickerEl) {
                    var videoId = target.getAttribute("data-video-id");
                    if (videoId !== null) {
                        loadVideo(Number(videoId));
                        return;
                    }
                    target = target.parentNode;
                }
            });
        }
    }

    // ── Search ───────────────────────────────────────────────────────────────

    /**
     * Parse a search query into tokens.
     * Text enclosed in double quotes becomes a single token (exact phrase).
     * Remaining whitespace-delimited words become individual tokens.
     * All tokens are lowercased.
     * @param {string} query
     * @returns {string[]}
     */
    function parseQuery(query) {
        var tokens = [];
        var remaining = query.replace(/"([^"]+)"/g, function (_, phrase) {
            tokens.push(phrase.toLowerCase());
            return " ";
        });
        var words = remaining.split(/\s+/);
        for (var i = 0; i < words.length; i++) {
            if (words[i].length > 0) tokens.push(words[i].toLowerCase());
        }
        return tokens;
    }

    /**
     * Return true if the video matches all tokens (AND semantics, substring, case-insensitive).
     * A token may appear in either title or description.
     * @param {Object} video
     * @param {string[]} tokens
     * @returns {boolean}
     */
    function matchesSearch(video, tokens) {
        var title = (video.title || "").toLowerCase();
        var desc = (video.description || "").toLowerCase();
        for (var i = 0; i < tokens.length; i++) {
            if (title.indexOf(tokens[i]) === -1 && desc.indexOf(tokens[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    /**
     * Filter videos[] by the given query and render results.
     * Assumes allVideosLoaded is true.
     * @param {string} term - raw search string from the input.
     */
    function executeSearch(term) {
        searchIsActive = true;
        var tokens = parseQuery(term);
        var results = [];
        for (var i = 0; i < videos.length; i++) {
            if (videos[i] && matchesSearch(videos[i], tokens)) {
                results.push({ absIndex: i, title: videos[i].title, thumbnail: videos[i].thumbnail });
            }
        }

        if (results.length === 0) {
            setContentVisible(false);
            showSearchMessage('No videos found for \u201c' + term + '\u201d');
        } else {
            filteredVideos = results;
            setContentVisible(true);
            hideSearchMessage();
            loadVideo(results[0].absIndex);
            loadPicker(0);
        }
    }

    /**
     * Clear an active search and return to normal browse mode.
     */
    function clearSearch() {
        searchIsActive = false;
        filteredVideos = null;
        hideSearchMessage();
        setContentVisible(true);
        loadVideo(0);
        loadPicker(0);
    }

    /**
     * Handle a search submission (Enter key or Search button click).
     */
    function handleSearch() {
        var inputEl = document.getElementById("searchInput");
        if (!inputEl) return;
        var term = inputEl.value.trim();

        if (term === "") {
            clearSearch();
            return;
        }

        if (allVideosLoaded) {
            executeSearch(term);
            return;
        }

        // Defensive: videos.json fetch not yet complete — show loading state and wait.
        setInputEnabled(false);
        showSearchMessage("Loading videos\u2026", true);

        loadPromise.then(function () {
            setInputEnabled(true);
            hideSearchMessage();
            executeSearch(term);
        }).catch(function () {
            setInputEnabled(true);
            showSearchMessage("Error loading videos. Please try again.");
        });
    }

    // ── DOM helpers ──────────────────────────────────────────────────────────

    /**
     * Show or hide the main content divs (title, player, description, picker).
     * @param {boolean} visible
     */
    function setContentVisible(visible) {
        var display = visible ? "" : "none";
        var selectors = [".title", ".player", ".description", ".picker"];
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) el.style.display = display;
        }
    }

    /**
     * Display a message in #searchMessage.
     * @param {string} msg
     * @param {boolean} [loading] - if true, adds the .loading class for the spinner.
     */
    function showSearchMessage(msg, loading) {
        var el = document.getElementById("searchMessage");
        if (!el) return;
        el.textContent = msg;
        el.classList.toggle("loading", !!loading);
        el.style.display = "block";
    }

    /** Hide #searchMessage. */
    function hideSearchMessage() {
        var el = document.getElementById("searchMessage");
        if (el) el.style.display = "none";
    }

    /**
     * Enable or disable the search input and button.
     * @param {boolean} enabled
     */
    function setInputEnabled(enabled) {
        var inputEl = document.getElementById("searchInput");
        var buttonEl = document.getElementById("searchButton");
        var clearBtnEl = document.querySelector(".search-clear-btn");
        if (inputEl) inputEl.disabled = !enabled;
        if (buttonEl) buttonEl.disabled = !enabled;
        if (clearBtnEl) clearBtnEl.disabled = !enabled;
    }

    /**
     * Remove a skeleton element by id (idempotent).
     */
    function removeSkeleton(id) {
        var el = document.getElementById(id);
        if (el) el.parentNode.removeChild(el);
    }

    /**
     * Escape HTML entities for safe insertion.
     */
    function escapeHtml(text) {
        if (!text) return "";
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    /**
     * Initialize the video page.
     */
    function init() {
        loadPromise = fetch("videos.json")
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                videos = data.videos;
                numVideos = videos.length;
                numPickerPages = Math.ceil(numVideos / numVideosInPicker);
                allVideosLoaded = true;
                loadVideo(0);
                loadPicker(0);
            })
            .catch(function (error) {
                console.error("Error loading videos.json:", error);
            });

        var inputEl = document.getElementById("searchInput");
        var buttonEl = document.getElementById("searchButton");
        var clearBtnEl = document.querySelector(".search-clear-btn");

        if (inputEl) {
            inputEl.addEventListener("input", function () {
                var hasText = inputEl.value.length > 0;
                if (clearBtnEl) clearBtnEl.hidden = !hasText;
                inputEl.classList.toggle("has-clear", hasText);
            });
            inputEl.addEventListener("keydown", function (e) {
                if (e.key === "Enter") handleSearch();
            });
        }
        if (clearBtnEl) {
            clearBtnEl.addEventListener("click", function () {
                inputEl.value = "";
                inputEl.classList.remove("has-clear");
                clearBtnEl.hidden = true;
                if (searchIsActive) {
                    clearSearch();
                }
                inputEl.focus();
            });
        }
        if (buttonEl) {
            buttonEl.addEventListener("click", handleSearch);
        }
    }

    // Run after DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
