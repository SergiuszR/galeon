// Vimeo Background Video Loader (iframe)
// Builds Vimeo's official "background" player embed URL for iframes
// carrying a data-video-id attribute. No Vimeo API calls are needed -
// Vimeo's own player handles adaptive bitrate, looping, and muted
// autoplay correctly on its own, which a hand-rolled native <video> +
// raw HLS/MP4 implementation had to reimplement piece by piece (see
// functions/backup/vimeo-video-loader.native-hls-video.js for that
// approach and why it was retired).
//
// Webflow usage: on the <iframe> element, set data-video-id="123456789".
// If the video's privacy requires the embed hash (Vimeo Settings ->
// Privacy -> "Where can this be embedded?" set to a specific domain/
// unlisted), also set data-video-hash to the value after ?h= in Vimeo's
// share/embed link. Optionally set data-video-aspect="width/height"
// (e.g. "4/3") if the source isn't the default 16:9.
//
// iframes don't support `object-fit: cover` the way <video> did, so the
// wrapping element needs `position: relative; overflow: hidden;` and this
// script resizes/centers the iframe itself to always overflow that
// wrapper - a manual "cover" crop, kept in sync on resize.

document.addEventListener("DOMContentLoaded", function () {
  document
    .querySelectorAll("iframe[data-video-id]")
    .forEach(function (iframe) {
      var videoId = iframe.getAttribute("data-video-id");
      if (!videoId || videoId.trim() === "") return;

      var hash = iframe.getAttribute("data-video-hash");

      var params = new URLSearchParams({
        background: "1",
        autoplay: "1",
        loop: "1",
        muted: "1",
        autopause: "0",
        byline: "0",
        title: "0",
        portrait: "0",
      });
      if (hash) params.set("h", hash);

      iframe.src =
        "https://player.vimeo.com/video/" + videoId + "?" + params.toString();

      setupCoverFit(iframe);
    });
});

function setupCoverFit(iframe) {
  var wrap = iframe.parentElement;
  if (!wrap) return;

  var aspectAttr = iframe.getAttribute("data-video-aspect");
  var aspect = 16 / 9;
  if (aspectAttr && aspectAttr.indexOf("/") !== -1) {
    var parts = aspectAttr.split("/");
    var w = parseFloat(parts[0]);
    var h = parseFloat(parts[1]);
    if (w > 0 && h > 0) aspect = w / h;
  }

  iframe.style.position = "absolute";
  iframe.style.top = "50%";
  iframe.style.left = "50%";
  iframe.style.transform = "translate(-50%, -50%)";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";

  var wrapStyle = getComputedStyle(wrap);
  if (wrapStyle.position === "static") wrap.style.position = "relative";
  wrap.style.overflow = "hidden";

  function resize() {
    var rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.width / rect.height > aspect) {
      iframe.style.width = rect.width + "px";
      iframe.style.height = rect.width / aspect + "px";
    } else {
      iframe.style.height = rect.height + "px";
      iframe.style.width = rect.height * aspect + "px";
    }
  }

  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(wrap);
  } else {
    window.addEventListener("resize", resize);
  }
}
