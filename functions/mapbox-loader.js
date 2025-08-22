// Mapbox Loader - Handles Mapbox map initialization and functionality
// This file contains the Mapbox functionality that triggers on click within #globe-section

const MAPBOX_CONFIG = {
  accessToken:
    "pk.eyJ1IjoiZ2FsZW9ueWFjaHRpbmciLCJhIjoiY21kenVxc2lvMGRnNTJtc2lmYXE5dGIycSJ9.VqerV12FQZLO9Xbzs5WNUg",
  style: "mapbox://styles/mapbox/streets-v12",
  defaultCenter: [10.4515, 51.1657],
  defaultZoom: 2,
  countryZoomDefault: 3,
  locationZoom: 5,
  mapContainerId: "globe-map-container",
  enableDrag: true,
};

let map = null;
let currentMarkers = [];
let mapLoaded = false;
let isResetting = false;
let resizeObserver = null;
let navigationState = {
  currentContinent: null,
  currentCountry: null,
  currentCountryData: null,
};

document.addEventListener('keydown', () => {
  document.body.classList.add('keyboard-user');
});

document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-user');
});

const utils = {
  createMapContainer: () => {
    const mapContainer = document.createElement("div");
    mapContainer.id = MAPBOX_CONFIG.mapContainerId;
    mapContainer.style.cssText =
      "width:1px; height:1px; position:absolute; left:-9999px;";
    document.body.appendChild(mapContainer);
    return mapContainer;
  },

  disableMapControls: (mapInstance) => {
    const controls = [
      "dragRotate",
      "scrollZoom",
      "touchZoomRotate",
      "doubleClickZoom",
      "keyboard",
    ];
    if (!MAPBOX_CONFIG.enableDrag) {
      controls.push("dragPan");
    }
    controls.forEach((control) => mapInstance[control]?.disable());
  },

  parseLocationData: (script) => {
    try {
      return JSON.parse(script.textContent);
    } catch (e) {
      return null;
    }
  },

  resetNavigationState: () => {
    navigationState = {
      currentContinent: null,
      currentCountry: null,
      currentCountryData: null,
    };
  },
};

async function initializeMap() {
  // Load Mapbox API dynamically
  if (typeof mapboxgl === "undefined") {
    try {
      // Load CSS first
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.14.0/mapbox-gl.css";
      document.head.appendChild(cssLink);
      
      // Load JS
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://api.mapbox.com/mapbox-gl-js/v3.14.0/mapbox-gl.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error("Failed to load Mapbox API:", error);
      return;
    }
  }

  utils.createMapContainer();

  map = new mapboxgl.Map({
    container: MAPBOX_CONFIG.mapContainerId,
    style: MAPBOX_CONFIG.style,
    center: MAPBOX_CONFIG.defaultCenter,
    zoom: MAPBOX_CONFIG.defaultZoom,
    accessToken: MAPBOX_CONFIG.accessToken,
  });

  map.on("load", () => {
    mapLoaded = true;
    utils.disableMapControls(map);

    setTimeout(() => {
      moveMapToParent();
      attachResizeObserver();
      syncMapSize();
      requestAnimationFrame(syncMapSize);
      setTimeout(syncMapSize, 350);
    }, 300);
  });

  map.on("error", (error) => console.error("Mapbox error:", error));
}

function moveMapToParent() {
  const globeItemMap = document.querySelector(".globe_item_map");
  const mapContainer = document.getElementById(MAPBOX_CONFIG.mapContainerId);
  if (globeItemMap && mapContainer) {
    mapContainer.style.position = "relative";
    mapContainer.style.left = "0";
    globeItemMap.appendChild(mapContainer);
  }
}

function syncMapSize() {
  const parent = document.querySelector(".globe_item_map");
  const el = document.getElementById(MAPBOX_CONFIG.mapContainerId);
  if (!parent || !el) return;

  const rect = parent.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";
    map?.resize();
  }
}

function attachResizeObserver() {
  const parent = document.querySelector(".globe_item_map");
  if (!parent) return;

  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(syncMapSize);
  resizeObserver.observe(parent);
}

function clearMarkers() {
  currentMarkers.forEach((marker) => marker.remove());
  currentMarkers = [];
}

function createMarkerElement(poi) {
  const markerEl = document.createElement("div");
  markerEl.className = "custom-marker";
  markerEl.style.cssText = "width:30px; height:30px; cursor:pointer;";
  markerEl.innerHTML = `<img src="https://cdn.prod.website-files.com/6809e14c25e5cac9d89f62fe/6841b976ba7131f192625c04_Group%2075.svg" style="width:100%; height:auto; cursor:pointer;" title="${poi.name}">`;

  markerEl.addEventListener("click", () => {
    zoomToCoordinates(poi.lng, poi.lat, MAPBOX_CONFIG.locationZoom);
    showModal(poi);
  });

  return markerEl;
}

async function addPoiMarkers(poiData) {
  if (!mapLoaded || !map) {
    // Initialize map if not already done
    await initializeMap();
    if (!mapLoaded || !map) {
      setTimeout(() => addPoiMarkers(poiData), 100);
      return;
    }
  }

  clearMarkers();
  currentMarkers = poiData.map((poi) => {
    const markerEl = createMarkerElement(poi);
    return new mapboxgl.Marker(markerEl)
      .setLngLat([poi.lng, poi.lat])
      .addTo(map);
  });
}

function zoomToCoordinates(lng, lat, zoom = 8) {
  map?.flyTo({ center: [lng, lat], zoom, duration: 1000 });
}

function getAllDealersForCountry(countryName) {
  const dealerItems = document.querySelectorAll(".globe_filter_item.is-loc");
  const dealers = [];

  dealerItems.forEach((item) => {
    const locationScript = item.querySelector(
      'script[type="application/json"][data-element="location-data-item"]'
    );
    if (!locationScript) return;

    const locationData = utils.parseLocationData(locationScript);
    if (
      locationData?.country === countryName &&
      locationData.lng != null &&
      locationData.lat != null
    ) {
      dealers.push({
        lng: parseFloat(locationData.lng),
        lat: parseFloat(locationData.lat),
        name: locationData.name || "Dealer Location",
        country: locationData.country,
      });
    }
  });

  return dealers;
}

function showModal(poi) {
  document.querySelectorAll(".globe_item_modal").forEach((modal) => {
    modal.style.display = "none";
    modal.classList.remove("is-open-modal");
  });

  const locationScripts = document.querySelectorAll(
    'script[data-element="location-data-item"]'
  );
  let targetScript = null;

  for (const script of locationScripts) {
    const locationData = utils.parseLocationData(script);
    if (locationData?.lat === poi.lat && locationData?.lng === poi.lng) {
      targetScript = script;
      break;
    }
  }

  if (targetScript) {
    const listItem = targetScript.closest(".globe_filter_item.is-loc");
    const modal = listItem?.querySelector(".globe_item_modal");

    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("is-open-modal");
      modal.querySelector("#back-to-dealers")?.focus({ preventScroll: true });
    }
  }
}

function hideModal() {
  document.querySelectorAll(".globe_item_modal").forEach((modal) => {
    modal.style.display = "none";
    modal.classList.remove("is-open-modal");
  });
}

async function resetToCountryView() {
  if (navigationState.currentCountry && navigationState.currentCountryData) {
    const { lng, lat, zoom } = navigationState.currentCountryData;
    const dealers = getAllDealersForCountry(navigationState.currentCountry);

    await addPoiMarkers(dealers);
    zoomToCoordinates(
      parseFloat(lng),
      parseFloat(lat),
      zoom ? parseInt(zoom) : MAPBOX_CONFIG.countryZoomDefault
    );
  }
}

async function handleContinentChange(event) {
  if (isResetting || !event.target.matches(".globe_radio_input")) return;

  const listItem = event.target.closest(".globe_filter_item");
  if (!listItem?.classList.contains("is-continent")) return;

  const locationScript = listItem.querySelector(
    'script[type="application/json"][data-element="location-data"]'
  );
  if (!locationScript) return;

  const locationData = utils.parseLocationData(locationScript);
  if (!locationData?.lng || !locationData?.lat) return;

  const lng = parseFloat(locationData.lng);
  const lat = parseFloat(locationData.lat);
  const zoom = locationData.zoom
    ? parseInt(locationData.zoom)
    : MAPBOX_CONFIG.countryZoomDefault;

  navigationState.currentCountry = event.target.value;
  navigationState.currentCountryData = locationData;

  const dealers = getAllDealersForCountry(event.target.value);
  await addPoiMarkers(dealers);

  setTimeout(() => zoomToCoordinates(lng, lat, zoom), 300);
}

function handleDealerClick(event) {
  const dealerButton = event.target.closest(".globe_item_button.is-loc");
  if (!dealerButton) return;

  const listItem = dealerButton.closest(".globe_filter_item");
  const locationScript = listItem?.querySelector(
    'script[type="application/json"][data-element="location-data-item"]'
  );
  if (!locationScript) return;

  const locationData = utils.parseLocationData(locationScript);
  if (!locationData?.lng || !locationData?.lat) return;

  const poi = {
    lng: parseFloat(locationData.lng),
    lat: parseFloat(locationData.lat),
    name: locationData.name || "Dealer Location",
  };

  zoomToCoordinates(poi.lng, poi.lat, MAPBOX_CONFIG.locationZoom);
  showModal(poi);
}

function handleNavigationClick(event) {
  const target = event.target;

  if (target.matches("#back-to-countries")) {
    isResetting = true;
    map?.flyTo({
      center: MAPBOX_CONFIG.defaultCenter,
      zoom: MAPBOX_CONFIG.defaultZoom,
      duration: 1000,
    });
    clearMarkers();
    utils.resetNavigationState();
    setTimeout(() => (isResetting = false), 1000);
  }

  if (target.matches("#back-to-continents")) {
    map?.flyTo({
      center: MAPBOX_CONFIG.defaultCenter,
      zoom: MAPBOX_CONFIG.defaultZoom,
      duration: 1000,
    });
    clearMarkers();
    utils.resetNavigationState();
  }

  if (
    target.matches("#back-to-dealers") ||
    target.closest("#back-to-dealers")
  ) {
    hideModal();
    resetToCountryView().catch(console.error);
  }
}

// Event listeners
document.addEventListener("change", (event) => handleContinentChange(event).catch(console.error));
document.addEventListener("click", handleDealerClick);
document.addEventListener("click", handleNavigationClick);
window.addEventListener("resize", syncMapSize);

// Lazy load Mapbox when user clicks on #globe-section
function setupMapboxLazyLoad() {
  const globeSection = document.getElementById("globe-section");
  if (globeSection) {
    globeSection.addEventListener("click", async () => {
      if (!mapLoaded && !map) {
        // Show loading state
        const loadingIndicator = document.createElement("div");
        loadingIndicator.textContent = "Loading map...";
        loadingIndicator.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 9999;";
        document.body.appendChild(loadingIndicator);
        
        try {
          await initializeMap();
        } catch (error) {
          console.error("Failed to initialize map:", error);
        } finally {
          // Remove loading indicator
          if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
          }
        }
      }
    });
  }
}

// Navigation and accessibility functionality
function setupNavigationAccessibility() {
  const elements = {
    toggleNav: document.getElementById("toggle-nav"),
    closeNav: document.getElementById("close-nav"),
    continents: document.getElementById("continents"),
    countries: document.getElementById("countries"),
    dealers: document.getElementById("dealers"),
  };

  const selectors = {
    radioButtons: 'input[type="radio"]',
    dealerButtons: ".globe_item_button.is-loc",
    continentList: ".globe_filter-list",
    dealerList: '.globe_list-list[role="list"]',
    backToCountries: "#back-to-countries",
    backToDealers: "#back-to-dealers",
    backToContinents: "#back-to-continents",
    modal: ".globe_item_modal",
    focusable:
      'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])',
  };

  if (!Object.values(elements).every(Boolean)) {
    return;
  }

  const utils = {
    isElementVisible: (element) => {
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        element.offsetParent !== null
      );
    },

    isDropdownOpen: () =>
      elements.toggleNav.getAttribute("aria-expanded") === "true",

    getVisibleItems: (container, selector) => {
      if (container === elements.dealers) {
        const dealerList = container.querySelector(selectors.dealerList);
        if (dealerList) {
          const mainDealerButtons = dealerList.querySelectorAll(
            selectors.dealerButtons
          );
          return Array.from(mainDealerButtons).filter(utils.isElementVisible);
        }
      }
      return Array.from(container.querySelectorAll(selector)).filter(
        utils.isElementVisible
      );
    },

    focusFirstVisible: (container, selector, delay = 300) => {
      if (!document.body.classList.contains('keyboard-user')) return;
      
      setTimeout(() => {
        const visibleItems = utils.getVisibleItems(container, selector);
        const firstItem = visibleItems[0];
        if (firstItem) {
          firstItem.focus();
        }
      }, delay);
    },
  };

  const handlers = {
    continentClick: (e) => {
      if (!e.target.closest(selectors.radioButtons)) return;
      utils.focusFirstVisible(elements.countries, selectors.radioButtons);
    },

    countryClick: (e) => {
      const radioButton = e.target.closest(selectors.radioButtons);
      if (!radioButton || e.target.closest(selectors.backToContinents)) return;
      utils.focusFirstVisible(elements.dealers, selectors.dealerButtons);
    },

    dealerClick: (e) => {
      const dealerButton = e.target.closest(selectors.dealerButtons);
      if (!dealerButton) return;

      setTimeout(() => {
        const modal = dealerButton
          .closest(".globe_filter_item")
          .querySelector(selectors.modal);
        if (modal && modal.style.display !== "none") {
          handlers.setupModalFocusTrap(modal);
        }
      }, 100);
    },

    setupModalFocusTrap: (modal) => {
      const allFocusable = modal.querySelectorAll(selectors.focusable);
      const links = Array.from(allFocusable).filter((el) => el.tagName === "A");
      const otherElements = Array.from(allFocusable).filter(
        (el) => el.tagName !== "A"
      );
      const focusableElements = [...links, ...otherElements];

      const [firstElement, lastElement] = [
        focusableElements[0],
        focusableElements[focusableElements.length - 1],
      ];

      if (firstElement) {
        firstElement.focus();
        modal.addEventListener(
          "keydown",
          handlers.modalKeydown.bind(null, firstElement, lastElement)
        );
      }

      const backToDealers = modal.querySelector(selectors.backToDealers);
      if (backToDealers) {
        backToDealers.addEventListener("click", () => {
          utils.focusFirstVisible(
            elements.dealers,
            selectors.dealerButtons,
            1200
          );
        });
      }
    },

    modalKeydown: (firstElement, lastElement, e) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
  };

  const navigation = {
    setupArrowNavigation: () => {
      const setupListNavigation = (container, selector) => {
        const list =
          container.querySelector(selectors.continentList) ||
          container.querySelector(selectors.dealerList);
        if (!list) return;

        list.addEventListener("keydown", (e) => {
          if (!utils.isDropdownOpen()) return;

          const visibleItems = utils.getVisibleItems(container, selector);
          const currentIndex = visibleItems.indexOf(document.activeElement);

          if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIndex =
              currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
            visibleItems[nextIndex].focus();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIndex =
              currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
            visibleItems[prevIndex].focus();
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.activeElement.click();
          }
        });
      };

      setupListNavigation(elements.continents, selectors.radioButtons);
      setupListNavigation(elements.countries, selectors.radioButtons);
      setupListNavigation(elements.dealers, selectors.dealerButtons);
    },

    setupTabNavigation: () => {
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Tab" || !utils.isDropdownOpen()) return;

        const activeElement = document.activeElement;
        const activeContainer = activeElement.closest(
          "#continents, #countries, #dealers"
        );
        if (!activeContainer) return;

        const clearButton = navigation.getClearButton(activeContainer);
        const firstListItem = navigation.getFirstListItem(activeContainer);

        if (!clearButton || !firstListItem) return;

        if (e.shiftKey && activeElement === firstListItem) {
          e.preventDefault();
          clearButton.focus();
        } else if (!e.shiftKey && activeElement === clearButton) {
          e.preventDefault();
          firstListItem.focus();
        }
      });
    },

    getClearButton: (container) => {
      if (container === elements.continents) return elements.closeNav;
      if (container === elements.countries)
        return container.querySelector(selectors.backToContinents);
      if (container === elements.dealers)
        return container.querySelector(selectors.backToCountries);
      return null;
    },

    getFirstListItem: (container) => {
      const selector =
        container === elements.dealers
          ? selectors.dealerButtons
          : selectors.radioButtons;
      const visibleItems = utils.getVisibleItems(container, selector);
      return visibleItems[0];
    },
  };

  const clearButtons = {
    setup: () => {
      if (elements.closeNav) {
        elements.closeNav.addEventListener("click", () => {
          elements.toggleNav.focus();
        });
      }

      const backToCountries = elements.dealers.querySelector(
        selectors.backToCountries
      );
      if (backToCountries) {
        backToCountries.addEventListener("click", () => {
          utils.focusFirstVisible(
            elements.countries,
            selectors.radioButtons,
            800
          );
        });
      }

      const backToContinents = elements.countries.querySelector(
        selectors.backToContinents
      );
      if (backToContinents) {
        backToContinents.addEventListener("click", () => {
          utils.focusFirstVisible(
            elements.continents,
            selectors.radioButtons,
            800
          );
        });
      }
    },
  };

  elements.continents.addEventListener("click", handlers.continentClick);
  elements.countries.addEventListener("click", handlers.countryClick);
  elements.dealers.addEventListener("click", handlers.dealerClick);

  function init() {
    navigation.setupArrowNavigation();
    navigation.setupTabNavigation();
    clearButtons.setup();
  }

  init();
}

// Toggle navigation functionality
function setupToggleNavigation() {
  const toggle = document.getElementById("toggle-nav");
  let closeTimeout = null;
  let clearTimeoutId = null;

  if (!toggle) return;

  setTimeout(() => toggle.setAttribute("aria-expanded", "false"), 3000);

  const observer = new MutationObserver(() => {
    const isOpen = toggle.classList.contains("w--open");

    if (isOpen) {
      if (closeTimeout) clearTimeout(closeTimeout);
      if (clearTimeoutId) clearTimeout(clearTimeoutId);
      setTimeout(() => toggle.setAttribute("aria-expanded", "true"), 0);
    } else {
      if (clearTimeoutId) clearTimeout(clearTimeoutId);
      clearTimeoutId = setTimeout(() => {
        document
          .querySelectorAll('.globe_form [fs-list-element="clear"]')
          .forEach((el) => typeof el.click === "function" && el.click());
      }, 10);

      if (closeTimeout) clearTimeout(closeTimeout);
      closeTimeout = setTimeout(() => {
        if (!toggle.classList.contains("w--open")) {
          toggle.setAttribute("aria-expanded", "false");
        }
      }, 1100);
    }
  });

  observer.observe(toggle, { attributes: true, attributeFilter: ["class"] });
}

// Export functions for use in other files
window.setupMapboxLazyLoad = setupMapboxLazyLoad;
window.setupNavigationAccessibility = setupNavigationAccessibility;
window.setupToggleNavigation = setupToggleNavigation;

// Initialize when this script is loaded
setupMapboxLazyLoad();
setupNavigationAccessibility();
setupToggleNavigation();

// Signal that initialization is complete
window.mapboxReady = true;
console.log('Mapbox functionality fully initialized and ready');
