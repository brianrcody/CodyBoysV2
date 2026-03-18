/**
 * Video loader — replaces the Dojo-based VideoLoader.
 *
 * Loads videos from loadVideos.php and manages the video picker UI.
 * Responsive player sizing per NUANCES.md (compiled layer values):
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

    // Server data
    var numVideosPerPage = 50;
    var numVideos = -1;

    // Picker UI data
    var numVideosInPicker = 5;
    var numPickerPages = -1;

    // Video data
    var videos = [];
    var currentSetLoad = 1;

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

    /**
     * Request a page of videos from the server.
     */
    function requestVideos(set, callback) {
        document.body.style.cursor = "wait";

        var formData = new FormData();
        formData.append("set", set);

        fetch("loadVideos.php", {
            method: "POST",
            body: formData
        })
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (pageVideos) {
                handleVideoRequest(pageVideos);
                callback();
            })
            .catch(function (error) {
                document.body.style.cursor = "default";
                console.error("Error loading videos:", error);
            });
    }

    /**
     * Store the returned video data.
     */
    function handleVideoRequest(pageVideos) {
        var videoIndex = (currentSetLoad - 1) * numVideosPerPage;
        if (numVideos === -1) {
            numVideos = pageVideos.numVideosTotal;
            numPickerPages = Math.ceil(numVideos / numVideosInPicker);
        }
        for (var i = 0; i < pageVideos.numVideosPage; i++) {
            videos[videoIndex++] = pageVideos.videos[i];
        }
        document.body.style.cursor = "default";
    }

    /**
     * Load a video into the player area.
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

    /**
     * Generate the video picker HTML (5 thumbnails per page).
     */
    function generateVideoPickerUI(page) {
        var start = page * numVideosInPicker;
        var html = '<div id="videopicker">';
        for (var i = start; i < numVideos && i < start + numVideosInPicker; i++) {
            html += '<span title="' + escapeHtml(videos[i].title) + '">';
            html += '<span class="video_picker"><a data-video-id="' + i + '">';
            html += '<img src="' + escapeHtml(videos[i].thumbnail) + '"/>';
            html += '</a></span></span>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Generate the page picker HTML.
     */
    function generatePagePickerUI(page) {
        var numVisiblePickerPages = getNumVisiblePickerPages();
        var html = '<div id="pagepicker">';
        var basePage = (Math.floor(page / numVisiblePickerPages) * numVisiblePickerPages) + 1;

        // Preceding pages link
        if (basePage > 1) {
            html += '<a data-action="preceding" data-page="' +
                (basePage - numVisiblePickerPages - 1) + '" href="#">[...]</a> ';
        }

        // Visible page links
        for (var p = basePage; p <= numPickerPages && p < basePage + numVisiblePickerPages; p++) {
            if (p === page + 1) {
                html += '<span class="selectedpage">[' + p + ']</span> ';
            } else {
                html += '<a href="#pagepicker" data-page-id="' + (p - 1) + '">[' + p + ']</a> ';
            }
        }

        // Following pages link
        if (basePage + numVisiblePickerPages - 1 < numPickerPages) {
            html += '<a data-action="following" data-page="' +
                (basePage + numVisiblePickerPages - 1) + '" href="#">[...]</a>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Load the picker UI for a given page.
     */
    function loadPicker(page) {
        var pickerEl = document.querySelector(".picker");
        if (!pickerEl) return;

        pickerEl.innerHTML = generateVideoPickerUI(page) + generatePagePickerUI(page);
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

        // Following pages click handler
        var followingEl = pickerEl.querySelector('[data-action="following"]');
        if (followingEl) {
            followingEl.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var bp = Number(this.getAttribute("data-page"));
                var numVisiblePickerPages = getNumVisiblePickerPages();

                if (Math.floor(bp / numVisiblePickerPages) === currentSetLoad) {
                    currentSetLoad++;
                    requestVideos(currentSetLoad, function () {
                        loadPicker(bp);
                    });
                } else {
                    loadPicker(bp);
                }
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

    /**
     * Initialize the video page.
     */
    function init() {
        requestVideos(currentSetLoad, function () {
            loadVideo(0);
            loadPicker(0);
        });
    }

    // Run after DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
