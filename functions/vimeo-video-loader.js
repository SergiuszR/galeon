// Vimeo Video Loader
// Fetches MP4 sources from Vimeo API and injects them into native <video> elements

document.addEventListener('DOMContentLoaded', function() {
  // CONFIGURATION
  const VIMEO_ACCESS_TOKEN = '4f1085a11f33827307d4171e83b25755';
  const ALLOWED_DOMAINS = ['galeon-project.webflow.io', 'galeon.yachts'];

  // DOMAIN CHECK
  if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
    console.warn('Domain not allowed to display video.');
    return;
  }

  // Find all video elements with data-video-id attribute
  document.querySelectorAll('video[data-video-id]').forEach(function(video) {
    var videoId = video.getAttribute('data-video-id');
    if (!videoId || videoId.trim() === '') return;

    // Fetch video data from Vimeo API
    fetch('https://api.vimeo.com/videos/' + videoId, {
      headers: {
        'Authorization': 'Bearer ' + VIMEO_ACCESS_TOKEN
      }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var files = Array.isArray(data.files) ? data.files : [];
      var mp4File = files.filter(function(f) { return f.type === 'video/mp4'; })
                         .sort(function(a, b) { return b.height - a.height; })[0];

      if (mp4File) {
        // Check if video element still exists in DOM
        if (!video || !video.parentNode) {
          console.warn('Video element no longer exists in DOM for video ID:', videoId);
          return;
        }

        // Remove old sources
        while (video.firstChild) video.removeChild(video.firstChild);

        // Create and append new source
        var source = document.createElement('source');
        source.src = mp4File.link;
        source.type = 'video/mp4';
        video.appendChild(source);

        // Set video attributes
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;

        // Load the video with new source
        video.load();
      } else {
        console.error('No MP4 file found in Vimeo response for video ID:', videoId);
      }
    })
    .catch(function(err) {
      console.error('Vimeo API error for video ID:', videoId, err);
    });
  });
});
