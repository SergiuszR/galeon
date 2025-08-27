// Globe Loader - Handles lazy loading of the globe visualization
// This file contains the setupLazyGlobe functionality

window.Webflow ||= [];

function setupLazyGlobe() {
  // Check if we should load instantly based on current path
  const instantLoadPages = ['/dealers'];
  const currentPath = window.location.pathname;
  const shouldLoadInstantly = instantLoadPages.includes(currentPath);
  
  // Get the globe element
  const globeElement = document.getElementById("globeViz");
  if (!globeElement) {
    console.warn("Globe element #globeViz not found");
    return;
  }

  let world = null;
  let isGlobeActive = false;
  let observer = null;
  let isIntersecting = false;
  let isInitialized = false;

  // Simplified location parsing
  const getLocations = () => {
    const scripts = document.querySelectorAll('script[data-element="location-data"]');
    return Array.from(scripts).reduce((locations, script) => {
      try {
        const location = JSON.parse(script.textContent.trim());
        if (location.lat && location.lng && location.name && location.continent) {
          locations.push({
            ...location,
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng)
          });
        }
      } catch (error) {
        console.error("Error parsing location:", error);
      }
      return locations;
    }, []);
  };

  // Simplified pause/resume
  const pauseGlobe = () => {
    if (!world || !isGlobeActive) return;
    isGlobeActive = false;
    if (world.controls) {
      world.controls().autoRotate = false;
      world.controls().enabled = false;
    }
  };

  const resumeGlobe = () => {
    if (!world || isGlobeActive) return;
    isGlobeActive = true;
    if (world.controls) {
      world.controls().autoRotate = true;
      world.controls().enabled = true;
    }
  };

  // Simplified effects without clouds
  const addGlobeEffects = async () => {
    try {
      const THREE = await import('https://esm.sh/three');
      const globeMaterial = world.globeMaterial();
      if (globeMaterial) {
        globeMaterial.emissive = new THREE.Color(0x001122);
        globeMaterial.emissiveIntensity = 0.05;
        globeMaterial.specular = new THREE.Color(0x4488aa);
        globeMaterial.shininess = 10;
      }
    } catch (err) {
      console.error("Error applying globe effects:", err);
    }
  };

  // Simplified initialization
  const initializeGlobe = () => {
    if (isInitialized) return;
    isInitialized = true;

    const locations = getLocations();
    const parent = globeElement.parentElement;

    globeElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Loading globe...</div>';

    world = new Globe(globeElement, { 
      animateIn: false,
      enablePointerInteraction: true,
      enableGlobeInteraction: true
    })
      .globeImageUrl("https://cdn.prod.website-files.com/6863d567b531587003118543/6866b12a3008393f51f25288_earth-blue-marble.avif")
      .bumpImageUrl("https://cdn.prod.website-files.com/6863d567b531587003118543/6866b12a7832d7e673f2acd6_earth-topology.avif")
      .backgroundColor("rgba(0,0,0,0)")
      .width(parent.clientWidth)
      .height(parent.clientHeight)
      .showAtmosphere(false)
      .htmlElementsData(locations)
      .htmlLat("lat")
      .htmlLng("lng")
      .htmlAltitude(0.01)
      .htmlElement((d) => {
        const el = document.createElement("div");
        el.innerHTML = `
          <svg width="29" height="36" viewBox="0 0 29 36" fill="none" xmlns="http://www.w3.org/2000/svg"
            style="width: 30px; height: 37px; cursor: pointer; transition: opacity 0.3s ease;" class="globe_pin" title="${d.name}">
            <path d="M14.4012 35.7132C9.72848 31.6644 6.22455 27.8963 3.88942 24.4091C1.55428 20.9215 0.386719 17.7198 0.386719 14.8038C0.386719 10.5191 1.7726 7.05032 4.54437 4.39738C7.31645 1.74444 10.6021 0.417969 14.4012 0.417969C18.2004 0.417969 21.486 1.74444 24.2581 4.39738C27.0298 7.05032 28.4157 10.5191 28.4157 14.8038C28.4157 17.7198 27.2482 20.9215 24.913 24.4091C22.5779 27.8963 19.074 31.6644 14.4012 35.7132Z" fill="#195479"/>
            <path d="M12.1387 23.673C7.47942 22.4061 4.70683 17.5288 5.95312 12.7984C7.20171 8.07032 12.0078 5.25412 16.6648 6.52107C21.3217 7.78802 24.0943 12.6653 22.848 17.3934C21.5994 22.1215 16.8002 24.9377 12.141 23.6707M23.0087 17.4416C24.2802 12.6217 21.4526 7.6503 16.7084 6.36041C11.9619 5.06821 7.06628 7.9395 5.79474 12.7594C4.5232 17.577 7.3509 22.5507 12.0951 23.8429C16.8415 25.1328 21.7372 22.2615 23.0087 17.4439" fill="#FBFBFB"/>
            <path d="M11.8722 24.6912C6.66445 23.2751 3.56138 17.8171 4.95685 12.529C6.35233 7.24089 11.7254 4.08959 16.9332 5.50573C22.1409 6.92415 25.244 12.3798 23.8486 17.6679C22.4531 22.9561 17.08 26.1074 11.8722 24.6912ZM24.2456 17.7758C25.7008 12.2628 22.4714 6.57758 17.041 5.09948C11.6106 3.62367 6.01262 6.90579 4.55746 12.4188C3.10231 17.9319 6.33854 23.6194 11.7644 25.0952C17.1925 26.5733 22.7905 23.2912 24.2456 17.7758Z" fill="#FBFBFB"/>
            <path d="M9.72228 15.383C9.67638 15.298 9.67638 15.2177 9.72688 15.1328C9.78196 15.0364 9.89901 14.9354 10.0712 14.8344L13.2339 12.9822C13.4061 12.8812 13.553 12.8307 13.6677 12.8307C13.7664 12.7664 12.8307 13.8422 12.8697 13.8904 12.9569 L14.0441 13.2278L14.8314 12.7664L14.673 12.4887C14.5055 12.1926 14.3127 11.8575 13.8605 11.8575C13.5828 11.8575 13.2385 11.9815 12.8047 12.234L9.85542 13.9645C9.2449 14.3226 8.89832 14.6347 8.76291 14.9515C8.60913 15.3049 8.74685 15.6331 8.88685 15.8741L9.43081 16.8335L9.46752 16.8955L9.5249 16.8588L10.2456 16.4365L10.3076 16.402L10.2708 16.3401L9.72688 15.3807L9.72228 15.383ZM18.0814 11.2562L13.6654 13.8429C12.5798 14.4809 12.5936 14.9905 12.9998 15.702L13.2179 16.083L14.0028 15.624L13.7871 15.243C13.6907 15.0731 13.6402 14.8482 14.0831 14.5865L18.506 11.993L18.0837 11.2539L18.0814 11.2562ZM15.8023 14.4832L15.5865 14.1022L14.8015 14.5613L15.0196 14.9423C15.0885 15.0639 15.0999 15.1764 15.0563 15.2774C15.0127 15.3875 14.8979 15.4954 14.7235 15.5987L10.2984 18.1923L10.7207 18.9313L15.1367 16.3446C15.6577 16.0371 15.9423 15.7548 16.0272 15.4518C16.1213 15.1144 15.9652 14.7724 15.8023 14.4855M19.9221 14.3111L19.3414 13.2897L18.4981 13.7832L19.0798 14.8046C19.128 14.8895 19.128 14.9675 19.0775 15.0547C19.0178 15.1511 18.9053 15.2521 18.7332 15.3531L15.5682 17.2053C15.396 17.3063 15.2514 17.3568 15.1367 17.3568C15.0357 17.3568 14.9622 17.3178 14.9117 17.2306L14.7579 16.9598L13.9707 17.4211L14.1291 17.6988C14.2989 17.9949 14.4871 18.33 14.9416 18.33C15.217 18.33 15.5613 18.206 15.9974 17.9536L18.9444 16.223C19.5549 15.8649 19.9061 15.5528 20.0415 15.2361C20.1953 14.878 20.053 14.5544 19.9175 14.3134" fill="#FBFBFB"/>
          </svg>
        `;
        el.style.pointerEvents = "auto";
        el.style.transition = "opacity 0.3s ease";

        el.addEventListener("click", () => {
          const dropdown = document.querySelector(".globe_nav .w-dropdown");
          const toggle = dropdown?.querySelector(".w-dropdown-toggle");
          const isOpen = dropdown?.classList.contains("w--open") || toggle?.getAttribute("aria-expanded") === "true";

          if (!isOpen && toggle) {
            ["mousedown", "mouseup", "click"].forEach((type) =>
              toggle.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
            );
          }

          const continentInput = document.querySelector(`input[name="continent"][value="${d.continent}"]`);
          if (continentInput && !continentInput.checked) continentInput.click();

          setTimeout(() => {
            const countryInput = document.querySelector(`input[name="country"][value="${d.name}"]`);
            if (countryInput && !countryInput.checked) countryInput.click();
          }, 500);
        });

        return el;
      });

    // Optimize controls
    world.controls().autoRotate = false;
    world.controls().autoRotateSpeed = 0.3;
    world.controls().enableZoom = false;
    world.controls().enabled = true;
    world.controls().autoPan = false;

    world.onGlobeReady(() => {
      addGlobeEffects();
      if (isIntersecting) {
        resumeGlobe();
      }
    });

    window.world = world;
  };

  // Lazy load
  const loadGlobeScript = () => {
    const script = document.createElement("script");
    script.src = "//unpkg.com/globe.gl";
    script.onload = () => {
      initializeGlobe();
    };
    document.head.appendChild(script);
  };

  // Check if we should load instantly after functions are defined
  if (shouldLoadInstantly) {
    console.log('Globe: Loading instantly for path:', currentPath);
    // Load immediately without scroll listeners
    setTimeout(() => {
      if (typeof Globe === "undefined") {
        loadGlobeScript();
      } else {
        initializeGlobe();
      }
    }, 100);
    return;
  }



  // Scroll-based trigger for lazy loading - load when user scrolls 300px
  let hasTriggered = false;
  
  const handleScroll = () => {
    if (hasTriggered) return;
    
    const scrollY = window.scrollY || window.pageYOffset;
    if (scrollY >= 300) {
      hasTriggered = true;
      isIntersecting = true;
      
      // Only load globe.gl and initialize when scroll threshold is reached
      if (!isInitialized) {
        if (typeof Globe === "undefined") {
          loadGlobeScript();
        } else {
          initializeGlobe();
        }
      } else {
        resumeGlobe();
      }
      
      // Remove scroll listener after triggering
      window.removeEventListener('scroll', handleScroll, { passive: true });
    }
  };

  // Add scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Check if already scrolled past threshold (e.g., page refresh)
  if (window.scrollY >= 300) {
    hasTriggered = true;
    isIntersecting = true;
    if (!isInitialized) {
      if (typeof Globe === "undefined") {
        loadGlobeScript();
      } else {
        initializeGlobe();
      }
    }
  }

  // Optimized resize handler
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (world) {
        const parent = globeElement.parentElement;
        world.width(parent.clientWidth).height(parent.clientHeight);
      }
    }, 250);
  }, { passive: true });

  // Cleanup
  const cleanup = () => {
    if (observer) observer.disconnect();
    if (world) world = null;
    clearTimeout(resizeTimeout);
    window.removeEventListener('scroll', handleScroll, { passive: true });
  };

  window.addEventListener("beforeunload", cleanup, { once: true });

  // Visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseGlobe();
    } else if (isIntersecting) {
      resumeGlobe();
    }
  }, { passive: true });
}

// Export the function for use in other files
window.setupLazyGlobe = setupLazyGlobe;

// Initialize the lazy globe when this script is loaded
setupLazyGlobe();
