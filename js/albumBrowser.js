/**
 * Bespoke album browser.
 *
 * Two-level navigation within the same DOM:
 *   Level 1: Year sections (endingYear down to startingYear), each showing
 *            album cover thumbnails sorted reverse-chronologically (Dec first).
 *   Level 2: Photo thumbnail grid for a single album, with Back button.
 *
 * Album data is cached in memory so revisiting an album does not re-fetch.
 * Depends on: BKPConstants (global), Lightbox (global), loadPhotos.php (server)
 */
(function () {
    "use strict";

    var photoCache = {};      // albumId -> photos array
    var albumListEl = null;   // the container holding all year sections
    var albumViewEl = null;   // the container for a single album's photos

    var MONTH_NAMES = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };

    function getMonthFromTitle(title) {
        var lower = title.toLowerCase();
        for (var name in MONTH_NAMES) {
            if (lower.indexOf(name) !== -1) {
                return MONTH_NAMES[name];
            }
        }
        return 0;
    }

    /** Sort albums by month descending (December first). Fails gracefully. */
    function sortAlbumsByMonth(albums) {
        try {
            return albums.slice().sort(function (a, b) {
                return getMonthFromTitle(b.title) - getMonthFromTitle(a.title);
            });
        } catch (e) {
            return albums;
        }
    }

    function showError(message) {
        var container = document.getElementById("kidpics");
        if (!container) return;
        var errDiv = document.createElement("div");
        errDiv.style.cssText = "color:#333333; font-size:0.85em; margin-top:12px;";
        errDiv.textContent = message;
        container.appendChild(errDiv);
    }

    /**
     * Initialize the album browser inside #kidpics.
     */
    function init() {
        var container = document.getElementById("kidpics");
        if (!container) return;

        albumListEl = document.createElement("div");
        albumListEl.id = "album-list";

        albumViewEl = document.createElement("div");
        albumViewEl.id = "album-view";
        albumViewEl.style.display = "none";

        container.appendChild(albumListEl);
        container.appendChild(albumViewEl);

        var startingYear = BKPConstants.startingYear;
        var endingYear = BKPConstants.endingYear;

        // Build year section divs newest-first
        for (var year = endingYear; year >= startingYear; year--) {
            var yearSection = document.createElement("div");
            yearSection.id = "year-" + year;

            var yearLabel = document.createElement("div");
            yearLabel.className = "hello";
            yearLabel.textContent = year + " Albums:";
            yearSection.appendChild(yearLabel);

            var yearAlbums = document.createElement("div");
            yearAlbums.id = "albums-" + year;
            yearAlbums.style.overflow = "hidden";
            yearSection.appendChild(yearAlbums);

            albumListEl.appendChild(yearSection);
        }

        fetch("loadPhotos.php?action=albums")
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                if (!data.albums) {
                    showError("An error occurred while loading albums.");
                    return;
                }
                distributeAlbumsToYears(data.albums, startingYear, endingYear);
            })
            .catch(function () {
                showError("An error occurred while loading albums.");
            });
    }

    /**
     * Distribute albums into year sections, oldest-first API iteration order,
     * newest-first visual order (year divs were already built newest-first).
     * Albums within each year section are sorted reverse-chronologically.
     */
    function distributeAlbumsToYears(albums, startingYear, endingYear) {
        for (var year = startingYear; year <= endingYear; year++) {
            var regex = new RegExp("Nate.*(?<!-)" + year + "(-\\d{4})?$");
            var targetDiv = document.getElementById("albums-" + year);
            if (!targetDiv) continue;

            var yearAlbums = albums.filter(function (album) {
                return album.title && regex.test(album.title);
            });

            sortAlbumsByMonth(yearAlbums).forEach(function (album) {
                appendAlbumCover(targetDiv, album);
            });
        }
    }

    /**
     * Create and append an album cover thumbnail to a container.
     */
    function appendAlbumCover(container, album) {
        var coverDiv = document.createElement("div");
        coverDiv.style.cssText =
            "float:left; margin-right:10px; margin-bottom:10px; cursor:pointer;";

        var img = document.createElement("img");
        img.src = encodeURI(album.coverUrl || "");
        img.alt = album.title;
        img.title = album.title;
        img.className = "album-thumb";

        var titleDiv = document.createElement("div");
        titleDiv.className = "album-title";
        titleDiv.textContent = album.title;

        coverDiv.appendChild(img);
        coverDiv.appendChild(titleDiv);

        coverDiv.tabIndex = 0;
        coverDiv.setAttribute("role", "button");
        coverDiv.setAttribute("aria-label", album.title);
        coverDiv.className = "album-cover-btn";

        function activateAlbum() { openAlbum(album.id, album.title); }
        coverDiv.addEventListener("click", activateAlbum);
        coverDiv.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateAlbum();
            }
        });

        container.appendChild(coverDiv);
    }

    /**
     * Open an album: hide the album list, show photo thumbnails.
     */
    function openAlbum(albumId, albumTitle) {
        if (photoCache[albumId]) {
            renderAlbumView(albumId, albumTitle, photoCache[albumId]);
            return;
        }

        fetch("loadPhotos.php?action=photos&albumId=" + encodeURIComponent(albumId))
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                var photos = data.photos || [];
                photoCache[albumId] = photos;
                renderAlbumView(albumId, albumTitle, photos);
            })
            .catch(function () {
                showError("An error occurred while loading photos.");
            });
    }

    /**
     * Render the photo thumbnail grid for an album.
     */
    function renderAlbumView(albumId, albumTitle, photos) {
        albumListEl.style.display = "none";
        albumViewEl.style.display = "block";
        albumViewEl.innerHTML = "";

        var title = document.createElement("h2");
        title.textContent = albumTitle;
        title.style.cssText =
            "font-family:'Raleway',sans-serif; color:#1100aa; margin-bottom:10px;";
        albumViewEl.appendChild(title);

        var backDiv = document.createElement("div");

        var backInner = document.createElement("div");
        backInner.textContent = "Back";
        backInner.className = "album-back-inner";
        backDiv.appendChild(backInner);
        backDiv.tabIndex = 0;
        backDiv.setAttribute("role", "button");
        backDiv.setAttribute("aria-label", "Back to albums");
        backDiv.className = "album-back-btn";

        backDiv.addEventListener("click", closeAlbumView);
        backDiv.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeAlbumView();
            }
        });
        albumViewEl.appendChild(backDiv);

        photos.forEach(function (photo, index) {
            var a = document.createElement("a");
            a.href = encodeURI(photo.url);
            a.title = photo.title || "";
            a.style.cssText = "float:left; margin-right:10px; margin-bottom:10px;";

            var img = document.createElement("img");
            img.src = encodeURI(photo.thumbUrl);
            img.alt = photo.title || "";
            img.className = "album-thumb";

            a.appendChild(img);

            a.addEventListener("click", function (e) {
                e.preventDefault();
                Lightbox.open(
                    photos.map(function (p) {
                        return {
                            url: p.url,
                            title: p.title || "",
                            originalUrl: p.originalUrl || ""
                        };
                    }),
                    index
                );
            });

            albumViewEl.appendChild(a);
        });

        var clearDiv = document.createElement("div");
        clearDiv.style.clear = "both";
        albumViewEl.appendChild(clearDiv);
    }

    /**
     * Close the album view and return to the album list.
     */
    function closeAlbumView() {
        albumViewEl.style.display = "none";
        albumListEl.style.display = "block";
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
