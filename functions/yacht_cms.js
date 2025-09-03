

// ============================================================================
// SWIPER MANAGEMENT
// ============================================================================

/**
 * Manages all Swiper instances and their lifecycle
 */
class SwiperManager {
  constructor() {
    this.swiperInstances = [];
    this.transitionMs = 300;
    this._interiorListTimer = null;
    this.variantGalleryCache = {};
    this.currentVariantFilterTerm = '';
    this._variantFirstFilterDone = false;
    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.initializeAllSwipers();
      this.setupTabHandlers();
      this.setupResizeHandler();
    });
  }

  initializeAllSwipers() {
    this.initializeBlockSliders();
    this.initializeRegularSliders();
    this.initializeYachtGallerySliders();
  }

  initializeBlockSliders() {
    const segments = document.querySelectorAll(".block-slider_grid");
    segments.forEach((segment) => {
      if (!segment) return; // Guard against null segment
      const sliderWrap = segment.querySelector(".block-slider_list-wrap");
      if (sliderWrap) {
        this.createSwiper(sliderWrap, {
          wrapperClass: "block-slider_list",
          slideClass: "block-slider_image",
          speed: 500,
          loop: false,
          navigation: {
            nextEl: segment.querySelector("[data-button-right]"),
            prevEl: segment.querySelector("[data-button-left]"),
          },
          on: {
            init: (swiper) => this.updateSlideCount(swiper, segment),
            slideChange: (swiper) => this.updateSlideCount(swiper, segment),
          },
        });
      }
    });
  }

  initializeRegularSliders() {
    document
      .querySelectorAll(".slider_wrapper:not(.yacht_gallery_component)")
      .forEach((parentElement) => {
        if (!parentElement) return; // Guard against null parentElement
        const sliderElement = parentElement.querySelector(".slider");
        if (sliderElement) {
          const isWideSlider = parentElement.hasAttribute("data-wide-slider");

          const breakpoints = {
            0: {
              slidesPerView: isWideSlider ? 1 : 1.1,
              allowTouchMove: true,
              spaceBetween: 16,
            },
            478: {
              slidesPerView: isWideSlider ? 1 : 1.1,
              allowTouchMove: true,
              spaceBetween: 24,
            },
            767: {
              slidesPerView: isWideSlider ? 1.2 : 1.5,
              allowTouchMove: true,
              spaceBetween: 24,
            },
            991: {
              slidesPerView: isWideSlider ? 1.2 : 1.5,
              allowTouchMove: true,
              spaceBetween: 24,
            },
          };

          this.createSwiper(sliderElement, {
            wrapperClass: "slider_list",
            slideClass: "slider_item",
            watchOverflow: true,
            allowTouchMove: false,
            breakpoints: breakpoints,
            pagination: {
              el: parentElement.querySelector(".slider_bullets"),
              clickable: true,
            },
            lazy: false,
            keyboard: { enabled: true },
            navigation: {
              nextEl: parentElement.querySelector("[data-button-right]"),
              prevEl: parentElement.querySelector("[data-button-left]"),
            },
            speed: 500,
            on: {
              init: (swiper) => {
                this.updateSlideCount(swiper, parentElement);
                setTimeout(() => {
                  swiper.update();
                  this.updateSlideCount(swiper, parentElement);
                }, 100);
              },
              slideChange: (swiper) =>
                this.updateSlideCount(swiper, parentElement),
              slideChangeTransitionEnd: (swiper) => {
                swiper.updateSlidesClasses();
                this.updateSlideCount(swiper, parentElement);
              },
            },
          });
        }
      });
  }

  initializeYachtGallerySliders() {
    const allYachtSwipers = document.querySelectorAll(".tabs .slider-full");
    allYachtSwipers.forEach((element) => {
      if (!element) return; // Guard against null element
      this.createYachtGallerySwiper(element);
      // Prime cache for variant gallery original slides
      const tabPanel = element.closest('.tabs_tab');
      if (tabPanel && tabPanel.id === 'tab-interior-variant-gallery') {
        const list = element.querySelector('.slider_list-full');
        if (list && !this.variantGalleryCache.originalHTML) {
          this.variantGalleryCache.originalHTML = list.innerHTML;
        }
      }
    });
  }

  createYachtGallerySwiper(selector) {
    const tabPanel = selector.closest(".tabs_tab");

    this.createSwiper(selector, {
      wrapperClass: "slider_list-full",
      slideClass: "slider_item-full",
      watchOverflow: true,
      slidesPerView: 1,
      loop: false,
      effect: "fade",
      grabCursor: true,
      spaceBetween: 16,
      allowTouchMove: true,
      lazy: false,
      keyboard: { enabled: true },
      speed: 500,
      observer: true,
      observeParents: true,
      initialSlide: 0,
      navigation: {
        nextEl: tabPanel?.querySelector("[data-button-right]"),
        prevEl: tabPanel?.querySelector("[data-button-left]"),
      },
      on: {
        init: (swiper) => {
          const totalSlides = this.getVisibleSlidesCount(selector);
          this.updateYachtGallerySlideCount(swiper, tabPanel, totalSlides);

          setTimeout(() => {
            swiper.update();
            this.updateYachtGallerySlideCount(swiper, tabPanel, this.getVisibleSlidesCount(selector));
          }, 100);
        },
        slideChange: (swiper) => {
          this.updateYachtGallerySlideCount(swiper, tabPanel, this.getVisibleSlidesCount(selector));
        },
        slideChangeTransitionEnd: (swiper) => {
          swiper.updateSlidesClasses();
          this.updateYachtGallerySlideCount(swiper, tabPanel, this.getVisibleSlidesCount(selector));
        },
      },
    });
  }

  // Validate that the container has a proper wrapper and at least one slide
  canInitializeSwiper(container, config) {
    try {
      if (!container || container.nodeType !== 1) return false;
      const wrapperClass = (config && config.wrapperClass) ? String(config.wrapperClass).trim() : '';
      const slideClass = (config && config.slideClass) ? String(config.slideClass).trim() : '';
      if (!wrapperClass || !slideClass) return false;
      const wrapper = container.querySelector(`.${wrapperClass}`);
      if (!wrapper) return false;
      const slides = wrapper.querySelectorAll(`.${slideClass}`);
      return slides && slides.length > 0;
    } catch (_) {
      return false;
    }
  }

  createSwiper(element, config) {
    // Guard: ensure a valid Element is provided
    if (!element || (element.nodeType !== 1 && !(typeof Element !== 'undefined' && element instanceof Element))) {
      return null;
    }

    // Defensive clone and sanitize of config
    const safeConfig = { ...(config || {}) };

    // Sanitize navigation controls to avoid passing null/undefined
    if (safeConfig.navigation) {
      const nextEl = safeConfig.navigation.nextEl;
      const prevEl = safeConfig.navigation.prevEl;
      const isElement = (el) => !!el && (el.nodeType === 1 || (typeof Element !== 'undefined' && el instanceof Element));
      if (isElement(nextEl) && isElement(prevEl)) {
        safeConfig.navigation = { nextEl, prevEl };
      } else {
        delete safeConfig.navigation;
      }
    }

    // Sanitize pagination element
    if (safeConfig.pagination) {
      const el = safeConfig.pagination.el;
      const isElement = (node) => !!node && (node.nodeType === 1 || (typeof Element !== 'undefined' && node instanceof Element));
      if (isElement(el)) {
        safeConfig.pagination = { ...safeConfig.pagination, el };
      } else {
        delete safeConfig.pagination;
      }
    }

    // Do not initialize when wrapper/slides are missing (e.g., empty CMS collections)
    if (!this.canInitializeSwiper(element, safeConfig)) {
      return null;
    }

    const swiper = new Swiper(element, safeConfig);
    this.swiperInstances.push(swiper);
    return swiper;
  }

  updateSlideCount(swiper, container) {
    const slideCountElement = container.querySelector("[data-slide-count]");
    const slidesTotalElement = container.querySelector("[data-slides-total]");

    if (slideCountElement) {
      const currentSlide = (swiper.activeIndex + 1).toString().padStart(2, "0");
      slideCountElement.innerHTML = currentSlide;
    }

    if (slidesTotalElement) {
      const totalSlides = swiper.slides.length.toString().padStart(2, "0");
      slidesTotalElement.innerHTML = totalSlides;
    }
  }

  updateYachtGallerySlideCount(swiper, tabPanel, totalSlides = null) {
    const slideCountElement = tabPanel?.querySelector("[data-slide-count]");
    const slidesTotalElement = tabPanel?.querySelector("[data-slides-total]");

    if (slideCountElement) {
      const totalForCurrent = totalSlides !== null && totalSlides !== undefined ? totalSlides : ((swiper && swiper.slides) ? Array.from(swiper.slides).filter(s => s.style.display !== 'none').length : 0);
      const indexRaw = (typeof swiper?.realIndex === 'number') ? swiper.realIndex : (typeof swiper?.activeIndex === 'number' ? swiper.activeIndex : 0);
      const indexSafe = Math.min(Math.max(indexRaw, 0), Math.max(totalForCurrent - 1, 0));
      const currentSlide = (totalForCurrent === 0 ? 0 : indexSafe + 1).toString().padStart(2, "0");
      slideCountElement.innerHTML = currentSlide;
    }

    if (slidesTotalElement) {
      let total = totalSlides;
      if (total === null || total === undefined) {
        const visible = Array.from(swiper.slides || []).filter((s) => s.style.display !== 'none');
        total = visible.length || (swiper.slides ? swiper.slides.length : 0);
      }
      const totalSlidesFormatted = total.toString().padStart(2, "0");
      slidesTotalElement.innerHTML = totalSlidesFormatted;
    }
  }

  getVisibleSlidesCount(sliderElement) {
    try {
      if (!sliderElement) return 0; // Guard against null sliderElement
      const slides = Array.from(sliderElement.querySelectorAll('.slider_item-full'));
      return slides.filter(s => s && s.style.display !== 'none').length || slides.length;
    } catch (_) {
      return 0;
    }
  }

  destroySwipersInTab(tabPanel) {
    if (!tabPanel) return; // Guard against null tabPanel
    const swipersInTab = tabPanel.querySelectorAll(".slider-full");
    swipersInTab.forEach((swiperEl) => {
      if (!swiperEl) return; // Guard against null swiperEl
      
      this.swiperInstances.forEach((swiper, index) => {
        if (swiper && swiper.el === swiperEl) {
          swiper.destroy(true, true);
          this.swiperInstances[index] = null;
        }
      });
    });
  }

  initializeSwipersInTab(tabPanel) {
    if (!tabPanel) return; // Guard against null tabPanel
    const swipersInTab = tabPanel.querySelectorAll(".slider-full");
    swipersInTab.forEach((swiperEl) => {
      if (!swiperEl) return; // Guard against null swiperEl
      
      // Clear any inline hiding from previous tab switch
      try {
        swiperEl.style.removeProperty('visibility');
        swiperEl.style.removeProperty('opacity');
        swiperEl.style.removeProperty('transition');
      } catch (_) {}
      const existingSwiper = this.swiperInstances.find(
        (swiper) => swiper && swiper.el === swiperEl
      );
      if (!existingSwiper) {
        this.createYachtGallerySwiper(swiperEl);
      }
    });
  }

  setupTabHandlers() {
    const yachtGalleryTabs = document.querySelector(
      ".tabs_buttons.is-yacht-gallery"
    );
    if (!yachtGalleryTabs) return; // Early return if no yacht gallery tabs found
    if (yachtGalleryTabs) {
      const tabButtons = yachtGalleryTabs.querySelectorAll(".tabs_button");

      this.initializeInteriorListVisibility();

      tabButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const buttonId = e.target.closest(".tabs_button").id;
          let targetTabId = "";

          if (buttonId === "button-interior-gallery") {
            targetTabId = "tab-interior-gallery";
          } else if (buttonId === "button-exterior-gallery") {
            targetTabId = "tab-exterior-gallery";
          } else if (buttonId === "button-cockpit-gallery") {
            targetTabId = "tab-cockpit-gallery";
          }

          if (targetTabId) {
            const currentlyActivePanel = document.querySelector('.tabs_tab.active-tab');
            if (currentlyActivePanel && currentlyActivePanel.id === targetTabId) {
              return;
            }

            const previousActivePanel = document.querySelector('.tabs_tab.active-tab');

            if (previousActivePanel) {
              const swiperEls = Array.from(previousActivePanel.querySelectorAll('.slider-full'));
              swiperEls.forEach((el) => {
                if (!el) return; // Guard against null elements
                const sw = this.swiperInstances.find(s => s && s.el === el);
                if (sw) {
                  try {
                    sw.allowSlideNext = false;
                    sw.allowSlidePrev = false;
                    sw.allowTouchMove = false;
                  } catch (_) {}
                }
                // Hide slider immediately to mask any index changes before fade-out completes
                try {
                  el.style.transition = 'opacity 0ms';
                  el.style.opacity = '0';
                  el.style.visibility = 'hidden';
                } catch (_) {}
              });
            }

            const interiorVariant = document.getElementById('tab-interior-variant-gallery');
            if (interiorVariant && targetTabId !== 'tab-interior-variant-gallery') {
              interiorVariant.classList.remove('active-tab');
              interiorVariant.style.display = 'none';
              interiorVariant.style.opacity = '0';
            }
            
            this.switchToTab(targetTabId);
            
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
              const TRANSITION = this.transitionMs || 300;

              setTimeout(() => {
                if (previousActivePanel) {
                  this.destroySwipersInTab(previousActivePanel);
                  this.swiperInstances = this.swiperInstances.filter((swiper) => swiper !== null);
                }
              }, TRANSITION + 20);

              setTimeout(() => {
                this.initializeSwipersInTab(targetTab);
              }, TRANSITION + 50);
            }

            clearTimeout(this._interiorListTimer);
            this._interiorListTimer = setTimeout(() => {
              const showList =
                targetTabId === "tab-interior-gallery" ||
                targetTabId === "tab-interior-variant-gallery";
              this.showInteriorList(showList);
              
              if (targetTabId === 'tab-interior-gallery') {
                document.querySelectorAll('.interior_list-wrapper .tabs_button').forEach(btn => {
                  btn.classList.remove('active-tab');
                  btn.setAttribute('aria-selected', 'false');
                });
              }
            }, this.transitionMs);
          }
        });
      });
    }
  }

  showInteriorList(show) {
    const wrapper = document.querySelector('.interior_list-wrapper');
    if (wrapper) {
      const DURATION = this.transitionMs || 300;
      if (show) {
        wrapper.style.transition = `opacity ${DURATION}ms ease`;
        wrapper.style.display = 'block';
        wrapper.style.opacity = '0';
        wrapper.offsetHeight; // reflow
        wrapper.style.opacity = '1';
      } else {
        wrapper.style.transition = `opacity ${DURATION}ms ease`;
        wrapper.style.opacity = '0';
        setTimeout(() => {
          wrapper.style.display = 'none';
        }, DURATION);
      }
    }
  }

  initializeInteriorListVisibility() {
    const selectedButton = document.querySelector('.tabs_button.is-yacht-gallery[aria-selected="true"]');
    if (selectedButton) {
      const controls = selectedButton.getAttribute('aria-controls');
      this.showInteriorList(
        controls === 'tab-interior-gallery' ||
        controls === 'tab-interior-variant-gallery'
      );
    }
    
    this.initializeInteriorListButtons();
  }

  switchToTab(targetTabId) {
    const allTabPanels = document.querySelectorAll('.tabs_tab');
    const currentActive = Array.from(allTabPanels).find(p => p.classList.contains('active-tab'));
    const targetTab = document.getElementById(targetTabId);
    const tabsContainer = targetTab ? targetTab.closest('.tabs') : null;
    const containerEl = tabsContainer || (targetTab ? targetTab.parentElement : null);
    const TRANSITION_MS = 300;
    
    if (containerEl) {
      const containerHeight = containerEl.offsetHeight;
      containerEl.style.minHeight = containerHeight + 'px';
    }
    
    if (currentActive && currentActive !== targetTab) {
      currentActive.style.transition = `opacity ${TRANSITION_MS}ms ease`;
      currentActive.style.opacity = '0';
      setTimeout(() => {
        currentActive.classList.remove('active-tab');
        currentActive.style.display = 'none';
        
        if (targetTab) {
          targetTab.classList.add('active-tab');
          targetTab.style.display = 'flex';
          targetTab.style.transition = `opacity ${TRANSITION_MS}ms ease`;
          targetTab.style.opacity = '0';
          targetTab.offsetHeight;
          targetTab.style.opacity = '1';
        }
        
        setTimeout(() => {
          if (containerEl) containerEl.style.minHeight = '';
        }, TRANSITION_MS + 20);
      }, TRANSITION_MS);
    } else if (currentActive && currentActive === targetTab) {
      currentActive.style.display = 'flex';
      currentActive.style.opacity = '1';
      if (containerEl) containerEl.style.minHeight = '';
      return;
    }
    
    if (targetTab) {
      if (!currentActive) {
        targetTab.classList.add('active-tab');
        targetTab.style.display = 'flex';
        targetTab.style.transition = `opacity ${TRANSITION_MS}ms ease`;
        targetTab.style.opacity = '0';
        targetTab.offsetHeight;
        targetTab.style.opacity = '1';
        setTimeout(() => {
          if (containerEl) containerEl.style.minHeight = '';
        }, TRANSITION_MS + 20);
      }
    }
    
    const allTabButtons = document.querySelectorAll('.tabs_button.is-yacht-gallery');
    allTabButtons.forEach(btn => {
      btn.classList.remove('active-tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    
    const activeButton = document.querySelector(`[aria-controls="${targetTabId}"]`);
    if (activeButton) {
      activeButton.classList.add('active-tab');
      activeButton.setAttribute('aria-selected', 'true');
      activeButton.setAttribute('tabindex', '0');
    }
  }

  initializeInteriorListButtons() {
    const interiorListWrappers = document.querySelectorAll('.interior_list-wrapper');
    interiorListWrappers.forEach((wrapper) => {
      const buttons = wrapper.querySelectorAll('.tabs_button');
      if (buttons.length > 0) {
        buttons.forEach(btn => {
          btn.classList.remove('active-tab');
          btn.setAttribute('aria-selected', 'false');
        });
        
        buttons.forEach(button => {
          button.addEventListener("click", (e) => {
            const term = (button.textContent || button.innerText || '').trim();
            const termSan = this.sanitizeString(term);
            const panel = document.getElementById('tab-interior-variant-gallery');
            const isVariantActive = !!(panel && panel.classList.contains('active-tab'));
            const isAlreadyActive = button.getAttribute('aria-selected') === 'true';

            if (isAlreadyActive) {
              return;
            }

            if (isVariantActive && this.currentVariantFilterTerm === termSan) {
              return;
            }

            if (isAlreadyActive && isVariantActive && this.currentVariantFilterTerm === termSan) {
              return;
            }

            buttons.forEach(btn => {
              btn.classList.remove('active-tab');
              btn.setAttribute('aria-selected', 'false');
            });
            button.classList.add('active-tab');
            button.setAttribute('aria-selected', 'true');

            this.pendingVariantFilterTerm = term;
            this.switchToInteriorVariant(term);
          });
        });
      }
    });
  }

  switchToInteriorVariant(term) {
    const targetTabId = 'tab-interior-variant-gallery';
    const targetTab = document.getElementById(targetTabId);
    if (!targetTab) return;

    const wasAlreadyActive = targetTab.classList.contains('active-tab');
    const prehideSlider = () => {
      try {
        const sliderEl = targetTab.querySelector('.slider-full');
        if (sliderEl) {
          const DURATION = this.transitionMs || 300;
          sliderEl.style.transition = `opacity ${DURATION}ms ease`;
          sliderEl.style.opacity = '0';
          sliderEl.style.visibility = 'hidden';
        }
      } catch (_) {}
    };

    if (!wasAlreadyActive) {
      prehideSlider();
    }
    this.switchToTab(targetTabId);

    const interiorMainButton = document.getElementById('button-interior-gallery');
    if (interiorMainButton) {
      const allTabButtons = document.querySelectorAll('.tabs_button.is-yacht-gallery');
      allTabButtons.forEach(btn => {
        if (btn !== interiorMainButton) {
          btn.classList.remove('active-tab');
          btn.setAttribute('aria-selected', 'false');
          btn.setAttribute('tabindex', '-1');
        }
      });
      interiorMainButton.classList.add('active-tab');
      interiorMainButton.setAttribute('aria-selected', 'true');
      interiorMainButton.setAttribute('tabindex', '0');
    }

    if (!wasAlreadyActive) {
      const tabsContainer = targetTab.closest('.tabs');
      const allTabsInContainer = tabsContainer ? tabsContainer.querySelectorAll('.tabs_tab') : [];
      allTabsInContainer.forEach((tab) => {
        this.destroySwipersInTab(tab);
      });

      this.swiperInstances = this.swiperInstances.filter((swiper) => swiper !== null);

      setTimeout(() => {
        const termToApply = this.pendingVariantFilterTerm || term || '';
        // First-time: filter immediately while hidden to avoid any flash
        this.filterInteriorVariantByTerm(termToApply, true, true);
        setTimeout(() => {
          this.refreshInteriorVariantSwiper(termToApply);
          const sliderEl = targetTab.querySelector('.slider-full');
          const DURATION = this.transitionMs || 300;
          if (sliderEl) {
            sliderEl.style.transition = `opacity ${DURATION}ms ease`;
            sliderEl.style.visibility = 'visible';
            // ensure transition applies
            sliderEl.offsetHeight;
            sliderEl.style.opacity = '1';
          }
          this.pendingVariantFilterTerm = '';
          this._variantFirstFilterDone = true;
        }, 80);
      }, this.transitionMs + 50);
    } else {
      const termToApply = this.pendingVariantFilterTerm || term || '';
      this.filterInteriorVariantByTerm(termToApply, false, true);
      // Ensure visibility is correct for subsequent transitions
      setTimeout(() => {
        const sliderEl = targetTab.querySelector('.slider-full');
        if (sliderEl) sliderEl.style.visibility = 'visible';
        this.pendingVariantFilterTerm = '';
      }, 80);
    }

    clearTimeout(this._interiorListTimer);
    this._interiorListTimer = setTimeout(() => {
      this.showInteriorList(true);
    }, this.transitionMs);
  }

  sanitizeString(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  slugifyForMatch(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  extractVariantSlugFromFilename(filename) {
    if (!filename) return '';
    let base = String(filename).toLowerCase();
    // strip query
    base = base.split('?')[0];
    // strip extension
    base = base.replace(/\.[a-z0-9]+$/i, '');
    // if cdn hash prefix exists like "<hash>_<slug>", take part after last underscore
    if (base.includes('_')) {
      base = base.substring(base.lastIndexOf('_') + 1);
    }
    // remove trailing size/suffix tokens: -p-500, -w-1920, -500w, -2x, -1, -2, -w, etc. (repeat while present)
    let changed = true;
    while (changed) {
      const before = base;
      base = base
        .replace(/-(?:p-\d+|w-\d+|\d+w|\d+x|\d+|w)$/i, '');
      changed = before !== base;
    }
    // final slug normalize (collapse non-alnum to hyphens)
    base = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base;
  }

  getVariantSlugsFromSlide(slideEl) {
    const names = this.getFilenamesFromSlide(slideEl);
    return names.map(n => this.extractVariantSlugFromFilename(n)).filter(Boolean);
  }

  getAltLabelsFromSlide(slideEl) {
    if (!slideEl) return [];
    const labels = [];
    const imgs = Array.from(slideEl.querySelectorAll('img'));
    imgs.forEach(img => {
      if (!img) return;
      const alt = img.getAttribute('alt') || img.alt || '';
      if (alt && alt.trim()) labels.push(alt.trim());
    });
    return labels;
  }

  getAltSlugsFromSlide(slideEl) {
    const labels = this.getAltLabelsFromSlide(slideEl);
    return labels.map(l => this.slugifyForMatch(l)).filter(Boolean);
  }

  getFilenamesFromSlide(slideEl) {
    if (!slideEl) return []; // Guard against null slideEl
    
    const names = [];
    const imgs = Array.from(slideEl.querySelectorAll('img'));
    imgs.forEach((img) => {
      if (!img) return; // Guard against null img elements
      
      const candidates = [];
      if (img.currentSrc) candidates.push(img.currentSrc);
      if (img.src) candidates.push(img.src);
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(entry => {
          const url = entry.trim().split(' ')[0];
          if (url) candidates.push(url);
        });
      }
      candidates.forEach((url) => {
        try {
          const clean = url.split('?')[0];
          const parts = clean.split('/');
          const filename = parts[parts.length - 1];
          if (filename) names.push(filename);
        } catch (_) {}
      });
    });
    return names;
  }

  filterInteriorVariantByTerm(termRaw, immediate = false, preserveActive = false) {
    const panel = document.getElementById('tab-interior-variant-gallery');
    if (!panel) return;

    const termSan = this.sanitizeString(termRaw);
    // Build slug from visible label text inside button (e.g., Walnut High Gloss)
    const termSlug = this.slugifyForMatch(termSan);
    const sliderEl = panel.querySelector('.slider-full');
    const list = panel.querySelector('.slider_list-full');
    if (!sliderEl || !list) {
      console.warn('Required slider elements not found in variant gallery');
      return;
    }

    const DURATION = this.transitionMs || 300;
    const containerEl = panel;
    const lockHeight = () => {
      if (containerEl) {
        const h = containerEl.offsetHeight;
        containerEl.style.minHeight = h + 'px';
      }
    };
    const releaseHeight = () => {
      if (containerEl) containerEl.style.minHeight = '';
    };

    const performFilter = () => {
      const existing = this.swiperInstances.find(sw => sw && sw.el === sliderEl);
      let prevKey = null;
      if (preserveActive && existing && existing.slides) {
        try {
          const prevIdx = (typeof existing.realIndex === 'number') ? existing.realIndex : (typeof existing.activeIndex === 'number' ? existing.activeIndex : 0);
          const prevSlideEl = existing.slides[prevIdx];
          if (prevSlideEl) {
            const slugs = this.getAltSlugsFromSlide(prevSlideEl);
            if (slugs && slugs.length) prevKey = slugs[0];
          }
        } catch (_) {}
      }

      if (existing) {
        try {
          const idx = (typeof existing.realIndex === 'number') ? existing.realIndex : (typeof existing.activeIndex === 'number' ? existing.activeIndex : 0);
          existing.allowSlideNext = false;
          existing.allowSlidePrev = false;
          existing.allowTouchMove = false;
          existing.slideTo(idx, 0);
        } catch (_) {}
      }

      if (this.variantGalleryCache.originalHTML) {
        list.innerHTML = this.variantGalleryCache.originalHTML;
      } else {
        this.variantGalleryCache.originalHTML = list.innerHTML;
      }

      const allSlides = Array.from(list.querySelectorAll('.slider_item-full'));
      const matchingSlides = allSlides.filter((slide) => {
        const altSlugs = this.getAltSlugsFromSlide(slide);
        return termSlug.length === 0 ? true : altSlugs.includes(termSlug);
      });

      allSlides.forEach((slide) => {
        if (!matchingSlides.includes(slide)) {
          slide.remove();
        }
      });

      if (existing) {
        existing.destroy(true, true);
        this.swiperInstances = this.swiperInstances.filter(sw => sw && sw !== existing);
      }

      this.createYachtGallerySwiper(sliderEl);
      const newSwiper = this.swiperInstances.find(sw => sw && sw.el === sliderEl);
      if (newSwiper) {
        setTimeout(() => {
          if (typeof newSwiper.updateSlides === 'function') newSwiper.updateSlides();
          if (typeof newSwiper.updateSlidesClasses === 'function') newSwiper.updateSlidesClasses();
          if (typeof newSwiper.update === 'function') newSwiper.update();
          let targetIndex = 0;
          if (preserveActive && prevKey) {
            try {
              const newSlides = Array.from(list.querySelectorAll('.slider_item-full'));
              for (let i = 0; i < newSlides.length; i++) {
                const slugs = this.getAltSlugsFromSlide(newSlides[i]);
                if (slugs.includes(prevKey)) { targetIndex = i; break; }
              }
            } catch (_) {}
          }
          if (matchingSlides.length > 0) newSwiper.slideTo(targetIndex, 0);
          setTimeout(() => {
            this.updateYachtGallerySlideCount(newSwiper, panel, matchingSlides.length);
          }, 30);
        }, 50);
      }

      this.currentVariantFilterTerm = termSan;

      if (!immediate) {
        sliderEl.style.transition = `opacity ${DURATION}ms ease`;
        sliderEl.style.opacity = '1';
        setTimeout(releaseHeight, DURATION + 20);
      } else {
        releaseHeight();
      }
    };

    if (!immediate) {
      lockHeight();
      sliderEl.style.transition = `opacity ${DURATION}ms ease`;
      sliderEl.style.opacity = '0';
      setTimeout(performFilter, DURATION + 20);
    } else {
      performFilter();
    }
  }

  refreshInteriorVariantSwiper(termRaw) {
    const panel = document.getElementById('tab-interior-variant-gallery');
    if (!panel) return;
    
    const slides = Array.from(panel.querySelectorAll('.slider_item-full'));
    const sliderEl = panel.querySelector('.slider-full');
    
    if (!sliderEl) {
      console.warn('Slider element not found in variant gallery');
      return;
    }
    
    const swiper = this.swiperInstances.find(sw => sw && sw.el === sliderEl);
    if (!swiper) {
      console.warn('Swiper instance not found for variant gallery');
      return;
    }

    swiper.updateSlides();
    swiper.updateSlidesClasses();
    swiper.update();

    const visibleSlides = slides.filter(s => s.style.display !== 'none');
    const firstVisible = visibleSlides.length ? visibleSlides[0] : null;
    if (firstVisible) {
      const index = slides.indexOf(firstVisible);
      if (index >= 0) swiper.slideTo(index, 0);
    }
    
    this.updateYachtGallerySlideCount(swiper, panel, visibleSlides.length);
  }

  setupResizeHandler() {
    window.addEventListener("resize", () => {
      this.swiperInstances.forEach((swiper) => {
        if (swiper) {
          setTimeout(() => {
            swiper.update();
            swiper.updateSize();
            swiper.updateSlides();
            swiper.updateProgress();
            swiper.updateSlidesClasses();
          }, 100);
        }
      });
    });
  }
}

// ============================================================================
// VIDEO CANVAS ANIMATIONS
// ============================================================================

/**
 * Mobile Video Canvas Animation (≤991px)
 */
function initMobileVideoCanvas() {
  if (window.innerWidth > 991) return;
  
  if (!gsap.core.globals().ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const canvas = document.getElementById("videoCanvasMobile");
  const ctx = canvas.getContext("2d");
  const loadingDiv = document.getElementById("loading");

  const imageFolder = canvas.getAttribute("video-src-mobile");
  const frameCount = parseInt(canvas.getAttribute("video-frames-mobile"), 10);
  const imagePad = (i) => String(i + 1).padStart(5, "0") + ".avif";

  const images = [];
  const loaded = [];
  let imagesLoaded = 0;
  let currentFrame = 0;
  let lastDrawnFrame = 0;
  let firstFramesReady = false;

  // Load images
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = `${imageFolder.replace(/\/?$/, "/")}${imagePad(i)}`;
    images.push(img);
    loaded.push(false);
    
    img.onload = () => {
      loaded[i] = true;
      imagesLoaded++;
      if (i === 0) drawFrame(0);
      
      if (loadingDiv) {
        if (!firstFramesReady && imagesLoaded >= 3) {
          firstFramesReady = true;
          loadingDiv.style.display = "none";
        } else if (!firstFramesReady) {
          loadingDiv.textContent = `Loading... ${Math.round(
            (imagesLoaded / Math.min(frameCount, 10)) * 100
          )}%`;
        }
      }
    };
    
    img.onerror = () => {
      loaded[i] = false;
    };
  }

  function isReady(idx) {
    return loaded[idx];
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    drawFrame(currentFrame);
  }

  function drawFrame(idx) {
    if (!isReady(idx)) {
      if (isReady(lastDrawnFrame)) {
        drawFrame(lastDrawnFrame);
      }
      return;
    }
    
    const img = images[idx];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.min(
      canvas.offsetWidth / img.width,
      canvas.offsetHeight / img.height
    );
    const x = (canvas.offsetWidth - img.width * scale) / 2;
    const y = (canvas.offsetHeight - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    lastDrawnFrame = idx;
  }

  // Throttled frame updates
  let rafId = null;

  function updateFrameThrottled(progress) {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      updateFrame(progress);
      rafId = null;
    });
  }

  function updateFrame(progress) {
    currentFrame = Math.min(
      frameCount - 1,
      Math.floor(progress * (frameCount - 1))
    );
    drawFrame(currentFrame);
  }

  // GSAP ScrollTrigger setup
  gsap.to({}, {
    scrollTrigger: {
      trigger: ".track",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => updateFrameThrottled(self.progress),
      invalidateOnRefresh: true,
    },
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

/**
 * Desktop Video Canvas Animation (≥992px)
 */
function initDesktopVideoCanvas() {
  if (window.innerWidth < 992) return;
  
  if (!gsap.core.globals().ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const canvas = document.getElementById("videoCanvas");
  const ctx = canvas.getContext("2d");
  const videoSrc = canvas.getAttribute("video-src");

  let video, frameWidth, frameHeight, timeline;

  function resizeCanvasVideo() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    
    if (video && video.videoWidth && video.videoHeight) {
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;
      
      if (videoRatio > canvasRatio) {
        frameHeight = canvas.height / dpr;
        frameWidth = frameHeight * videoRatio;
      } else {
        frameWidth = canvas.width / dpr;
        frameHeight = frameWidth / videoRatio;
      }
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function renderFrameVideo() {
    if (video && video.videoWidth && video.videoHeight) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = (canvas.offsetWidth - frameWidth) / 2;
      const y = (canvas.offsetHeight - frameHeight) / 2;
      ctx.drawImage(video, x, y, frameWidth, frameHeight);
    }
  }

  function seekAndDrawVideo(time) {
    return new Promise((resolve) => {
      function onSeeked() {
        video.removeEventListener("seeked", onSeeked);
        renderFrameVideo();
        resolve();
      }
      video.addEventListener("seeked", onSeeked);
      video.currentTime = time;
      video.play().then(() => video.pause());
    });
  }

  function initTimelineVideo() {
    if (timeline) {
      timeline.kill();
      timeline = null;
    }
    
    timeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".track",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const targetTime = video.duration * self.progress;
          if (Math.abs(video.currentTime - targetTime) > 0.01) {
            seekAndDrawVideo(targetTime);
          }
        },
      },
    }).to(video, {
      currentTime: video.duration,
      ease: "none",
    });
  }

  function setupVideo() {
    video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.loop = false;
    video.src = videoSrc;
    video.load();

    video.addEventListener("loadedmetadata", function onMeta() {
      video.removeEventListener("loadedmetadata", onMeta);
      resizeCanvasVideo();
      video.currentTime = 0;
      renderFrameVideo();
      initTimelineVideo();
      ScrollTrigger.refresh();
    });
  }

  window.addEventListener("resize", () => {
    resizeCanvasVideo();
    renderFrameVideo();
    ScrollTrigger.refresh();
  });

  window.addEventListener("scroll", renderFrameVideo, { passive: true });
  setupVideo();
}

// ============================================================================
// TAB MANAGEMENT (jQuery-based)
// ============================================================================

/**
 * Layout tabs functionality
 */
$(function () {
  function showPins(tabId) {
    var tabSuffix = tabId.replace(/^button-/, '');
    $('.layouts_pin-list > [role="listitem"]').each(function () {
      var show =
        $(this).find('.modal_button[data-tab="' + tabSuffix + '"]').length > 0;
      $(this).css('display', show ? 'block' : 'none');
    });
  }

  function activateTab($btn) {
    var idx = $btn.index();
    $("[data-control='layouts']")
      .removeClass('active-tab')
      .attr({ 'aria-selected': 'false', tabindex: '-1' });
    $btn
      .addClass('active-tab')
      .attr({ 'aria-selected': 'true', tabindex: '0' })
      .focus();
    var tabId = $btn.attr('id');

    $("[data-control='layouts']").each(function () {
      var isActive = $(this).attr('id') === tabId;
      $(this)
        .toggleClass('active-tab', isActive)
        .attr('tabindex', isActive ? '0' : '-1');
    });

    $('.tabs_tab-item').each(function () {
      var isActive = $(this).attr('aria-labelledby') === tabId;
      $(this).toggleClass('active-tab', isActive);
    });

    showPins(tabId);
  }

  function initializeTabStates() {
    var $visibleTabs = $("[data-control='layouts']").filter(function() {
      return !$(this).hasClass('w-condition-invisible');
    });
    
    if ($visibleTabs.length === 0) return;
    
    var $firstVisibleTab = $visibleTabs.first();
    var firstVisibleTabId = $firstVisibleTab.attr('id');
    
    $("[data-control='layouts']").each(function () {
      $(this).removeClass('active-tab')
        .attr({ 'aria-selected': 'false', tabindex: '-1' });
    });
    
    $('.tabs_tab-item').each(function () {
      $(this).removeClass('active-tab');
    });
    
    $firstVisibleTab
      .addClass('active-tab')
      .attr({ 'aria-selected': 'true', tabindex: '0' });
    
    $('.tabs_tab-item').each(function () {
      var isActive = $(this).attr('aria-labelledby') === firstVisibleTabId;
      $(this).toggleClass('active-tab', isActive);
    });
    
    showPins(firstVisibleTabId);
  }

  $("[data-control='layouts']").on('click', function () {
    activateTab($(this));
  });

  $("[data-control='layouts']").on('keydown', function (e) {
    var $buttons = $("[data-control='layouts']");
    var idx = $buttons.index(this);
    if (e.key === 'ArrowRight' || e.keyCode === 39) {
      e.preventDefault();
      var next = (idx + 1) % $buttons.length;
      $buttons.eq(next).focus();
    }
    if (e.key === 'ArrowLeft' || e.keyCode === 37) {
      e.preventDefault();
      var prev = (idx - 1 + $buttons.length) % $buttons.length;
      $buttons.eq(prev).focus();
    }
    if (
      e.key === 'Enter' ||
      e.key === ' ' ||
      e.keyCode === 13 ||
      e.keyCode === 32
    ) {
      e.preventDefault();
      activateTab($(this));
    }
  });

  initializeTabStates();
});

// ============================================================================
// CMS TAB MANAGEMENT
// ============================================================================

/**
 * Fix invisible active tabs in CMS
 */
function fixInvisibleActiveTab() {
  const tabButtons = Array.from(document.querySelectorAll('.tabs_button.is-cms'));
  const tabPanels = Array.from(document.querySelectorAll('.tabs_tab'));

  if (!tabButtons.some(btn => !btn.classList.contains('w-condition-invisible'))) {
    return;
  }

  const currentActiveButton = tabButtons.find(btn =>
    btn.getAttribute('aria-selected') === 'true' && btn.classList.contains('active-tab')
  );

  if (currentActiveButton && currentActiveButton.classList.contains('w-condition-invisible')) {
    const nextVisibleButton = tabButtons.find(btn => !btn.classList.contains('w-condition-invisible'));

    if (nextVisibleButton) {
      tabButtons.forEach(btn => {
        btn.classList.remove('active-tab');
        btn.setAttribute('aria-selected', 'false');
        btn.tabIndex = -1;
      });

      nextVisibleButton.classList.add('active-tab');
      nextVisibleButton.setAttribute('aria-selected', 'true');
      nextVisibleButton.tabIndex = 0;

      const panelId = nextVisibleButton.getAttribute('aria-controls');
      const nextPanel = tabPanels.find(panel => panel.id === panelId && !panel.classList.contains('w-condition-invisible'));

      tabPanels.forEach(panel => {
        panel.classList.remove('active-tab');
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
        panel.style.opacity = '0';
      });

      if (nextPanel) {
        nextPanel.classList.add('active-tab');
        nextPanel.setAttribute('aria-hidden', 'false');
        nextPanel.style.display = 'flex';
        nextPanel.style.opacity = '1';
      }
    }
  }
}

// ============================================================================
// FINISH LIST INITIALIZATION
// ============================================================================

/**
 * Initialize finish list selection
 */
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    const currentScrollY = window.scrollY;
    const finishLists = document.querySelectorAll(".custom_finish_list");
    
    finishLists.forEach(function (finishList) {
      if (!finishList) return; // Guard against null finishList
      
      const finishItems = finishList.querySelectorAll(".custom_finish_item");
      
      for (let i = 0; i < finishItems.length; i++) {
        const finishItem = finishItems[i];
        
        // Guard against null/undefined finishItem before calling getComputedStyle
        if (!finishItem) continue;
        
        try {
          const computedStyle = window.getComputedStyle(finishItem);
          if (computedStyle && computedStyle.display !== "none") {
            const radioLabel = finishItem.querySelector(".custom_radio_label");
            if (radioLabel) {
              radioLabel.click();
              radioLabel.classList.add("is-list-active");
            }
            break;
          }
        } catch (error) {
          // Silently handle any getComputedStyle errors and continue with next item
          console.warn("Error getting computed style for finish item:", error);
          continue;
        }
      }
    });
    
    window.scrollTo(0, currentScrollY);
  }, 2000);
});

// ============================================================================
// VIDEO FILTERING SYSTEM
// ============================================================================

let currentFilters = {
  space: null,
  finish: null,
};

function updateVideoVisibility() {
  $(".plyr_component").each(function () {
    let player = $(this).data("plyr-player");
    if (player && player.playing) {
      player.pause();
    }
  });

  $(".custom_item").css("opacity", "0").removeClass("is-custom-show");

  setTimeout(() => {
    $(".custom_item").css("display", "none");
    
    $(".custom_item").each(function () {
      let videoItem = $(this);
      let shouldShow = shouldShowVideo(videoItem, currentFilters);

      if (shouldShow) {
        videoItem.addClass("is-custom-show");
        videoItem.css("display", "block");
        setTimeout(() => {
          videoItem.css("opacity", "1");
        }, 50);
      }
    });
  }, 500);
}

function shouldShowVideo(videoItem, filters) {
  if (!filters.space && !filters.finish) {
    return true;
  }

  let videoSpace = videoItem.attr('data-space');
  let videoFinish = videoItem.attr('data-finish');

  if (filters.space && filters.space !== videoSpace) {
    return false;
  }

  if (filters.finish && filters.finish !== videoFinish) {
    return false;
  }

  return true;
}

// ============================================================================
// PLYR VIDEO PLAYER SETUP
// ============================================================================

$(document).ready(function () {
  $("[data-vimeo]").css({
    opacity: "1",
    transition: "opacity 0.5s ease-in-out",
  });

  setTimeout(function () {
    updateVideoVisibility();
  }, 2000);

  $(document).on("change", "input[type='radio']", function () {
    let field = $(this).attr("name");
    let value = $(this).val();
    currentFilters[field] = value;
    updateVideoVisibility();
  });

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.type === "childList" &&
        mutation.target.classList.contains("custom_list")
      ) {
        updateVideoVisibility();
      }
    });
  });

  const filterList = document.querySelector(".custom_list");
  if (filterList) {
    observer.observe(filterList, {
      childList: true,
      subtree: true,
    });
  }
});

$(document).ready(function () {
  $(".plyr_component")
    .has(".plyr_cover")
    .each(function (index) {
      let thisComponent = $(this);
      let embedContainer = thisComponent.find(".plyr_embed")[0];
      let iframe =
        thisComponent.find(".plyr_video")[0] ||
        (embedContainer ? $(embedContainer).find("iframe")[0] : null);

      if (!iframe && !embedContainer) return;

      if (iframe && iframe.classList.contains("plyr_video")) {
        let videoId =
          iframe.getAttribute("data-vimeo-id") ||
          iframe.getAttribute("data-video-id") ||
          thisComponent.attr("data-video-id") ||
          thisComponent.attr("data-vimeo-id");

        if (videoId) {
          iframe.src = `https://player.vimeo.com/video/${videoId}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media`;
          iframe.setAttribute("allowfullscreen", "");
          iframe.setAttribute("allowtransparency", "");
          iframe.setAttribute("allow", "autoplay");

          if (iframe.parentElement) {
            iframe.parentElement.classList.add("plyr__video-embed");
          }
        } else {
          return;
        }
      } else if (embedContainer) {
        iframe = $(embedContainer).find("iframe")[0];

        if (!iframe) {
          let videoId =
            thisComponent.attr("data-video-id") ||
            thisComponent.attr("data-vimeo-id");

          if (videoId) {
            $(embedContainer).addClass("plyr__video-embed").html(`
              <iframe
                src="https://player.vimeo.com/video/${videoId}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media"
                allowfullscreen
                allowtransparency
                allow="autoplay">
              </iframe>
            `);
            iframe = $(embedContainer).find("iframe")[0];
          } else {
            return;
          }
        } else {
          let videoId = iframe.getAttribute("data-vimeo-id");
          if (videoId) {
            iframe.src = `https://player.vimeo.com/video/${videoId}?loop=false&byline=false&portrait=false&title=false&speed=true&transparent=0&gesture=media`;
          }
          $(embedContainer).addClass("plyr__video-embed");
        }
      }

      try {
        let playerElement =
          iframe.classList && iframe.classList.contains("plyr_video")
            ? iframe.parentElement
            : embedContainer || iframe;

        let isFilteredVideo = thisComponent.closest(".custom_list").length > 0;
        let controls = isFilteredVideo
          ? []
          : ["play", "progress", "current-time", "mute", "fullscreen"];

        let player = new Plyr(playerElement, {
          controls: controls,
          resetOnEnd: true,
          autoplay: false,
          muted: false,
          volume: 1,
          vimeo: {
            byline: false,
            portrait: false,
            title: false,
            speed: true,
            transparent: false,
          },
        });

        function disablePlyrTabNavigation() {
          thisComponent.find(".plyr__control").attr("tabindex", "-1");
          thisComponent
            .find(".plyr__progress input[data-plyr='seek']")
            .attr("tabindex", "-1");
          thisComponent.find(".plyr").attr("tabindex", "-1");
          thisComponent.find("iframe").attr("tabindex", "-1");
          thisComponent.find(".plyr_cover").attr("tabindex", "0");
          thisComponent.find(".plyr_pause-trigger").hide();
        }

        function enablePlyrTabNavigation() {
          thisComponent.find(".plyr__control").attr("tabindex", "0");
          thisComponent
            .find(".plyr__progress input[data-plyr='seek']")
            .attr("tabindex", "0");
          thisComponent.find(".plyr").attr("tabindex", "0");
          thisComponent.find("iframe").attr("tabindex", "0");
          thisComponent.find(".plyr_cover").attr("tabindex", "-1");
          thisComponent.find(".plyr_pause-trigger").show();
        }

        player.on("ready", () => {
          disablePlyrTabNavigation();
          thisComponent.removeClass("hide-cover");
        });

        thisComponent.find(".plyr_cover").on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          player.play();
        });

        player.on("ended", () => {
          thisComponent.removeClass("hide-cover");
          disablePlyrTabNavigation();
        });

        player.on("play", () => {
          $(".plyr_component").removeClass("hide-cover");
          thisComponent.addClass("hide-cover");
          enablePlyrTabNavigation();

          $(".plyr_component")
            .not(thisComponent)
            .each(function () {
              let otherPlayer = $(this).data("plyr-player");
              if (otherPlayer && otherPlayer.playing) {
                otherPlayer.pause();
              }
            });
        });

        player.on("pause", () => {});

        thisComponent.find(".plyr_pause-trigger").on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          player.pause();
        });

        player.on("ended", () => {
          if (player.fullscreen.active) {
            player.fullscreen.exit();
          }
        });

        player.on("enterfullscreen", () => {
          thisComponent.addClass("contain-video");
        });

        player.on("exitfullscreen", () => {
          thisComponent.removeClass("contain-video");
        });

        player.on("error", (event) => {
          thisComponent.find(".plyr_cover").html(`
            <div class="plyr_error">
              <p>Video failed to load. Please try again.</p>
              <button onclick="location.reload()">Reload Page</button>
            </div>
          `);
        });

        thisComponent.find(".plyr_cover").on("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            player.play();
          }
        });

        thisComponent.find(".plyr_cover").attr({
          role: "button",
          "aria-label": "Play video",
          tabindex: "0",
        });

        thisComponent.data("plyr-player", player);
      } catch (error) {
        thisComponent.find(".plyr_cover").html(`
          <div class="plyr_error">
            <p>Failed to initialize video player: ${error.message}</p>
            <button onclick="location.reload()">Reload Page</button>
          </div>
        `);
      }
    });

  window.cleanupPlyrPlayers = function () {
    $(".plyr_component").each(function () {
      let player = $(this).data("plyr-player");
      if (player && typeof player.destroy === "function") {
        player.destroy();
      }
    });
  };

  $(window).on("beforeunload", function () {
    window.cleanupPlyrPlayers();
  });

  $(window).on("resize", function () {
    $(".plyr_component").each(function () {
      let player = $(this).data("plyr-player");
      if (player && typeof player.resize === "function") {
        player.resize();
      }
    });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      $(".plyr_component").each(function () {
        let player = $(this).data("plyr-player");
        if (player && player.playing) {
          player.pause();
        }
      });
    }
  });
});

// ============================================================================
// PIN HEIGHT MANAGEMENT
// ============================================================================

function setPinHeight() {
  var h = $('.tabs_tab-item').first().outerHeight();
  $('.layouts_pin-wrapper').height(h);
}

$(function() {
  setPinHeight();
  $(window).on('resize', setPinHeight);
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize video canvas animations
initMobileVideoCanvas();
initDesktopVideoCanvas();

// Initialize SwiperManager
new SwiperManager();

// Fix invisible active tabs
document.addEventListener('DOMContentLoaded', fixInvisibleActiveTab);
