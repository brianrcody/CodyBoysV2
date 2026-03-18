/**
 * Decoration strip loader.
 *
 * Fetches 10 random photos (one per randomly selected album) from the photo
 * proxy and fills the #decoration aside. Only runs on viewports >= 1024px.
 *
 * Fill behavior: if 10 photos don't fill the available height, the sequence
 * repeats from the beginning until the strip is filled. Overflow is clipped
 * by CSS (height:100vh; overflow:hidden).
 *
 * Fails silently on any error — the aside simply remains empty.
 */
(function () {
    "use strict";

    function loadDecoration() {
        if (window.innerWidth < 1024) {
            return;
        }

        var container = document.getElementById("decoration");
        if (!container) {
            return;
        }

        fetch("loadPhotos.php?action=decoration")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (!data.photos || data.photos.length === 0) {
                    return;
                }

                var photos = data.photos;

                // Determine per-image display size to calculate fill count
                var imageSize = window.innerWidth >= 2000 ? 270 : 180;
                var totalNeeded = Math.ceil(window.innerHeight / imageSize);

                for (var i = 0; i < totalNeeded; i++) {
                    var photo = photos[i % photos.length];
                    var img = document.createElement("img");
                    img.className = "decorationImage";
                    img.src = encodeURI(photo.thumbUrl);
                    img.alt = "";
                    container.appendChild(img);
                }
            })
            .catch(function () {
                // Fail silently — decoration strip stays empty
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadDecoration);
    } else {
        loadDecoration();
    }
})();
