/**
 * Bespoke lightbox.
 *
 * Usage:
 *   Lightbox.open(photos, startIndex)
 *     photos: array of { url: string, title: string, originalUrl: string }
 *     startIndex: index of the photo to show first
 *
 * Controls:
 *   ArrowLeft  — previous photo
 *   ArrowRight — next photo
 *   Escape     — close
 *   Click outside image — close
 *   Click image — open original full-resolution photo in new tab
 */
var Lightbox = (function () {
    "use strict";

    var overlay = null;
    var imgEl = null;
    var captionEl = null;
    var prevBtn = null;
    var nextBtn = null;
    var photos = [];
    var currentIndex = 0;

    function buildDOM() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.id = "lightbox-overlay";
        overlay.style.cssText =
            "display:none; position:fixed; top:0; left:0; width:100%; height:100%;" +
            "background:rgba(0,0,0,0.85); z-index:10000; align-items:center;" +
            "justify-content:center; flex-direction:column; cursor:pointer;";

        imgEl = document.createElement("img");
        imgEl.id = "lightbox-img";
        imgEl.style.cssText =
            "max-width:90vw; max-height:80vh; display:block;";

        captionEl = document.createElement("div");
        captionEl.id = "lightbox-caption";
        captionEl.style.cssText =
            "color:#ffffff; font-family:'Times New Roman',Times,serif;" +
            "font-size:0.9em; margin-top:10px; text-align:center; max-width:90vw;";

        prevBtn = document.createElement("a");
        prevBtn.id = "lightbox-prev";
        prevBtn.href = "#";
        prevBtn.innerHTML = "&#9664;";
        prevBtn.style.cssText =
            "position:fixed; left:20px; top:50%; transform:translateY(-50%);" +
            "color:#ffffff; font-size:2em; text-decoration:none; cursor:pointer;" +
            "z-index:10001; padding:10px;";

        nextBtn = document.createElement("a");
        nextBtn.id = "lightbox-next";
        nextBtn.href = "#";
        nextBtn.innerHTML = "&#9654;";
        nextBtn.style.cssText =
            "position:fixed; right:20px; top:50%; transform:translateY(-50%);" +
            "color:#ffffff; font-size:2em; text-decoration:none; cursor:pointer;" +
            "z-index:10001; padding:10px;";

        overlay.appendChild(prevBtn);
        overlay.appendChild(imgEl);
        overlay.appendChild(captionEl);
        overlay.appendChild(nextBtn);
        document.body.appendChild(overlay);

        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                close();
            }
        });

        prevBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            showPrev();
        });

        nextBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            showNext();
        });

        // Click on image opens the full-resolution original in a new tab
        imgEl.addEventListener("click", function (e) {
            e.stopPropagation();
            var orig = photos[currentIndex] && photos[currentIndex].originalUrl;
            if (orig) {
                window.open(encodeURI(orig), "_blank", "noopener,noreferrer");
            }
        });

        document.addEventListener("keydown", function (e) {
            if (overlay.style.display === "none") return;
            if (e.key === "Escape") {
                close();
            } else if (e.key === "ArrowLeft") {
                showPrev();
            } else if (e.key === "ArrowRight") {
                showNext();
            }
        });
    }

    function showPhoto(index) {
        if (index < 0 || index >= photos.length) return;
        currentIndex = index;

        var photo = photos[currentIndex];
        imgEl.src = encodeURI(photo.url);
        imgEl.style.cursor = photo.originalUrl ? "pointer" : "default";

        // Caption: filename + "Full resolution" link if available
        captionEl.innerHTML = "";
        if (photo.title) {
            captionEl.appendChild(document.createTextNode(photo.title));
        }
        if (photo.originalUrl) {
            if (photo.title) {
                captionEl.appendChild(document.createTextNode(" \u2014 "));
            }
            var link = document.createElement("a");
            link.href = encodeURI(photo.originalUrl);
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Full resolution";
            link.style.cssText = "color:#ffffff;";
            captionEl.appendChild(link);
        }

        prevBtn.style.display = (currentIndex > 0) ? "block" : "none";
        nextBtn.style.display = (currentIndex < photos.length - 1) ? "block" : "none";
    }

    function showPrev() {
        if (currentIndex > 0) {
            showPhoto(currentIndex - 1);
        }
    }

    function showNext() {
        if (currentIndex < photos.length - 1) {
            showPhoto(currentIndex + 1);
        }
    }

    function open(photoArray, startIndex) {
        buildDOM();
        photos = photoArray;
        currentIndex = startIndex || 0;
        overlay.style.display = "flex";
        showPhoto(currentIndex);
        document.body.style.overflow = "hidden";
    }

    function close() {
        if (overlay) {
            overlay.style.display = "none";
            document.body.style.overflow = "";
        }
    }

    return {
        open: open,
        close: close
    };
})();
