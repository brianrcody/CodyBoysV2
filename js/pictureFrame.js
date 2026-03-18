/**
 * Picture Frame — auto-cycling slideshow popup.
 *
 * On each 5-minute interval, selects a random album from the full pool of
 * matching albums (same title regex and year range as the album browser),
 * then selects a random photo from that album. Photo data is cached in
 * memory to avoid redundant fetches.
 *
 * No controls — purely passive display.
 * Depends on: BKPConstants (global), loadPhotos.php (server)
 */
(function () {
    "use strict";

    var photoCache = {};   // albumId -> photos array
    var albumPool = [];
    var delay = 1000 * 60 * 5; // 5 minutes

    function windowResized() {
        var w = window.innerWidth - 4;
        var h = window.innerHeight - 4;
        var pic = document.getElementById("picture");
        if (pic) {
            pic.style.maxWidth = w + "px";
            pic.style.maxHeight = h + "px";
        }
    }

    function showError(message) {
        var container = document.getElementById("imgContainer");
        if (!container) return;
        var errDiv = document.createElement("div");
        errDiv.style.cssText =
            "color:#888888; font-size:0.8em; position:absolute;" +
            "bottom:8px; left:0; width:100%; text-align:center;";
        errDiv.textContent = message;
        container.appendChild(errDiv);
    }

    function displayPhoto(photoUrl) {
        var container = document.getElementById("imgContainer");
        if (!container) return;
        container.innerHTML = "";

        var img = document.createElement("img");
        img.id = "picture";
        img.src = encodeURI(photoUrl);
        img.style.maxWidth = (window.innerWidth - 4) + "px";
        img.style.maxHeight = (window.innerHeight - 4) + "px";
        container.appendChild(img);
    }

    function scheduleNext() {
        setTimeout(showRandomPhoto, delay);
    }

    function showRandomPhoto() {
        if (albumPool.length === 0) return;

        var album = albumPool[Math.floor(Math.random() * albumPool.length)];

        function pickAndDisplay(photos) {
            if (photos.length === 0) {
                scheduleNext();
                return;
            }
            var photo = photos[Math.floor(Math.random() * photos.length)];
            displayPhoto(photo.url);
            scheduleNext();
        }

        if (photoCache[album.id]) {
            pickAndDisplay(photoCache[album.id]);
            return;
        }

        fetch("loadPhotos.php?action=photos&albumId=" + encodeURIComponent(album.id))
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                var photos = data.photos || [];
                photoCache[album.id] = photos;
                pickAndDisplay(photos);
            })
            .catch(function () {
                // Skip this album's photos on error; still schedule the next cycle
                scheduleNext();
            });
    }

    function init() {
        window.onresize = windowResized;

        var startingYear = BKPConstants.startingYear;
        var endingYear = BKPConstants.endingYear;

        fetch("loadPhotos.php?action=albums")
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (data) {
                if (!data.albums) {
                    showError("Unable to load albums.");
                    return;
                }

                // Collect all albums matching the title regex across the year range.
                // Break after first matching year to avoid double-adding year-range albums.
                data.albums.forEach(function (album) {
                    for (var year = startingYear; year <= endingYear; year++) {
                        var regex = new RegExp("Nate.*(?<!-)" + year + "(-\\d{4})?$");
                        if (album.title && regex.test(album.title)) {
                            albumPool.push(album);
                            break;
                        }
                    }
                });

                if (albumPool.length === 0) {
                    showError("No albums found.");
                    return;
                }

                showRandomPhoto();
            })
            .catch(function () {
                showError("Unable to load albums.");
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
