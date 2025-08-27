// Dynamic Loader - Loads globe and mapbox functionality only when needed
// This script handles the lazy loading of external functionality files

class DynamicLoader {
  constructor() {
    this.loadedFiles = new Set();
    this.loadingPromises = new Map();
    this.init();
  }

  init() {
    // Set up scroll listener for globe functionality
    this.setupGlobeScrollListener();
    
    // Set up scroll listener for mapbox functionality (when user reaches #globe-section)
    this.setupMapboxScrollListener();
  }

  setupGlobeScrollListener() {
    let hasTriggered = false;
    
    const handleScroll = () => {
      if (hasTriggered) return;
      
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY >= 100) {
        hasTriggered = true;
        this.loadGlobeFunctionality();
        
        // Remove scroll listener after triggering
        window.removeEventListener('scroll', handleScroll, { passive: true });
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check if already scrolled past threshold (e.g., page refresh)
    if (window.scrollY >= 300) {
      hasTriggered = true;
      this.loadGlobeFunctionality();
    }
  }

  setupMapboxScrollListener() {
    let hasTriggered = false;
    
    const handleScroll = () => {
      if (hasTriggered) return;
      
      const globeSection = document.getElementById('globe-section');
      if (!globeSection) return;
      
      const rect = globeSection.getBoundingClientRect();
      // Load when the globe section comes into view (top of section reaches bottom of viewport)
      if (rect.top <= window.innerHeight) {
        hasTriggered = true;
        this.loadMapboxFunctionality();
        
        // Remove scroll listener after triggering
        window.removeEventListener('scroll', handleScroll, { passive: true });
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check if already scrolled to globe section (e.g., page refresh)
    const globeSection = document.getElementById('globe-section');
    if (globeSection) {
      const rect = globeSection.getBoundingClientRect();
      if (rect.top <= window.innerHeight) {
        hasTriggered = true;
        this.loadMapboxFunctionality();
      }
    }
  }

  async loadGlobeFunctionality() {
    if (this.loadedFiles.has('globe')) return;
    
    if (this.loadingPromises.has('globe')) {
      await this.loadingPromises.get('globe');
      return;
    }

    const loadPromise = this.loadScript('https://main--galeon.netlify.app/functions/globe-loader.min.js')
      .then(() => {
        this.loadedFiles.add('globe');
        console.log('Globe functionality loaded dynamically');
      })
      .catch(error => {
        console.error('Failed to load globe functionality:', error);
      });

    this.loadingPromises.set('globe', loadPromise);
    await loadPromise;
  }

  async loadMapboxFunctionality() {
    if (this.loadedFiles.has('mapbox')) return;
    
    if (this.loadingPromises.has('mapbox')) {
      await this.loadingPromises.get('mapbox');
      return;
    }

    const loadPromise = this.loadScript('https://main--galeon.netlify.app/functions/mapbox-loader.min.js')
      .then(() => {
        this.loadedFiles.add('mapbox');
        console.log('Mapbox functionality loaded dynamically');
        
        // Wait for the mapbox functionality to be fully ready
        return this.waitForMapboxReady();
      })
      .then(() => {
        console.log('Mapbox functionality is fully ready for interaction');
      })
      .catch(error => {
        console.error('Failed to load mapbox functionality:', error);
      });

    this.loadingPromises.set('mapbox', loadPromise);
    await loadPromise;
  }

  waitForMapboxReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (window.mapboxReady) {
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

// Initialize the dynamic loader when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.dynamicLoader = new DynamicLoader();
  });
} else {
  window.dynamicLoader = new DynamicLoader();
}
