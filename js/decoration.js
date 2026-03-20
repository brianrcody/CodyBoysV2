/**
 * Decoration strip loader.
 *
 * Fetches 10 random photos (one per randomly selected album) from the photo
 * proxy and fills the #decoration aside. Only runs on viewports >= 1024px.
 *
 * All 10 photos are always rendered so they are available if the user resizes
 * the window taller. Overflow is clipped by CSS (overflow:hidden).
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

                for (var i = 0; i < photos.length; i++) {
                    var img = document.createElement("img");
                    img.className = "decorationImage";
                    img.src = encodeURI(photos[i].thumbUrl);
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
