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
    
    // Set up click listener for mapbox functionality
    this.setupMapboxClickListener();
  }

  setupGlobeScrollListener() {
    let hasTriggered = false;
    
    const handleScroll = () => {
      if (hasTriggered) return;
      
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY >= 300) {
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

  setupMapboxClickListener() {
    // Use event delegation to handle clicks on #globe-section
    document.addEventListener('click', (event) => {
      const globeSection = event.target.closest('#globe-section');
      if (globeSection && !this.loadedFiles.has('mapbox')) {
        this.loadMapboxFunctionality();
      }
    });
  }

  async loadGlobeFunctionality() {
    if (this.loadedFiles.has('globe')) return;
    
    if (this.loadingPromises.has('globe')) {
      await this.loadingPromises.get('globe');
      return;
    }

    const loadPromise = this.loadScript('functions/globe-loader.js')
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

    const loadPromise = this.loadScript('functions/mapbox-loader.js')
      .then(() => {
        this.loadedFiles.add('mapbox');
        console.log('Mapbox functionality loaded dynamically');
      })
      .catch(error => {
        console.error('Failed to load mapbox functionality:', error);
      });

    this.loadingPromises.set('mapbox', loadPromise);
    await loadPromise;
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
