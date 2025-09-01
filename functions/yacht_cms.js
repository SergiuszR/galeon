
if (window.innerWidth <= 991) {
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

  // Throttle drawing with requestAnimationFrame
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

  gsap.to(
    {},
    {
      scrollTrigger: {
        trigger: ".track",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => updateFrameThrottled(self.progress),
        invalidateOnRefresh: true,
      },
    }
  );

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}
if (window.innerWidth >= 992) {
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
    timeline = gsap
      .timeline({
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
      })
      .to(video, {
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

  window.addEventListener("scroll", renderFrameVideo, {
    passive: true,
  });

  setupVideo();
}
 
 
class SwiperManager {
  constructor() {
    this.swiperInstances = [];
    this.transitionMs = 300;
    this._interiorListTimer = null;
    this.variantGalleryCache = {}; // cache original slides for rebuilding
    this.currentVariantFilterTerm = '';
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

          setTimeout(() => {
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

  createSwiper(element, config) {
    const swiper = new Swiper(element, config);
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
      // totalSlides may represent filtered visible slides; otherwise count only non-hidden
      let total = totalSlides;
      if (total === null || total === undefined) {
        const visible = Array.from(swiper.slides || []).filter((s) => s.style.display !== 'none');
        total = visible.length || (swiper.slides ? swiper.slides.length : 0);
      }
      const totalSlidesFormatted = total.toString().padStart(2, "0");
      slidesTotalElement.innerHTML = totalSlidesFormatted;
    }
  }

  // Count only visible slides inside a given slider element
  getVisibleSlidesCount(sliderElement) {
    try {
      const slides = Array.from(sliderElement.querySelectorAll('.slider_item-full'));
      return slides.filter(s => s.style.display !== 'none').length || slides.length;
    } catch (_) {
      return 0;
    }
  }

  destroySwipersInTab(tabPanel) {
    const swipersInTab = tabPanel.querySelectorAll(".slider-full");
    swipersInTab.forEach((swiperEl) => {
      this.swiperInstances.forEach((swiper, index) => {
        if (swiper && swiper.el === swiperEl) {
          swiper.destroy(true, true);
          this.swiperInstances[index] = null;
        }
      });
    });
  }

  initializeSwipersInTab(tabPanel) {
    const swipersInTab = tabPanel.querySelectorAll(".slider-full");
    swipersInTab.forEach((swiperEl) => {
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
                const sw = this.swiperInstances.find(s => s && s.el === el);
                if (sw) {
                  try {
                    const idx = (typeof sw.realIndex === 'number') ? sw.realIndex : (typeof sw.activeIndex === 'number' ? sw.activeIndex : 0);
                    sw.allowSlideNext = false;
                    sw.allowSlidePrev = false;
                    sw.allowTouchMove = false;
                    sw.slideTo(idx, 0);
                  } catch (_) {}
                }
              });
            } // Handle tab switching - show/hide tab panels
            // Also ensure interior variant gallery is hidden when switching main tabs
            const interiorVariant = document.getElementById('tab-interior-variant-gallery');
            if (interiorVariant && targetTabId !== 'tab-interior-variant-gallery') {
              interiorVariant.classList.remove('active-tab');
              interiorVariant.style.display = 'none';
              interiorVariant.style.opacity = '0';
            }
            this.switchToTab(targetTabId);
            
            // Handle tab switching for swipers
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
              const TRANSITION = this.transitionMs || 300;

              // After fade-out completes, destroy swipers in the previous (now hidden) tab
              setTimeout(() => {
                if (previousActivePanel) {
                  this.destroySwipersInTab(previousActivePanel);
                  this.swiperInstances = this.swiperInstances.filter((swiper) => swiper !== null);
                }
              }, TRANSITION + 20);

              // Initialize swipers in the new target tab after it becomes visible
              setTimeout(() => {
                this.initializeSwipersInTab(targetTab);
              }, TRANSITION + 50);
            }

            // Handle interior list visibility after fade sequence
            clearTimeout(this._interiorListTimer);
            this._interiorListTimer = setTimeout(() => {
              const showList =
                targetTabId === "tab-interior-gallery" ||
                targetTabId === "tab-interior-variant-gallery";
              this.showInteriorList(showList);
              // Clear active state on interior buttons when returning to base interior
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
        // reflow
        wrapper.offsetHeight;
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
    
    // Initialize interior list button states
    this.initializeInteriorListButtons();
  }

  switchToTab(targetTabId) {
    // Find all tab panels
    const allTabPanels = document.querySelectorAll('.tabs_tab');
    
    // Identify currently active panel (if any)
    const currentActive = Array.from(allTabPanels).find(p => p.classList.contains('active-tab'));
    const targetTab = document.getElementById(targetTabId);
    const tabsContainer = targetTab ? targetTab.closest('.tabs') : null;
    const containerEl = tabsContainer || (targetTab ? targetTab.parentElement : null);
    const TRANSITION_MS = 300;
    
    // Lock container height during transition to prevent layout jumping
    if (containerEl) {
      const containerHeight = containerEl.offsetHeight;
      containerEl.style.minHeight = containerHeight + 'px';
    }
    
    if (currentActive && currentActive !== targetTab) {
      // Fade out current panel, then hide
      currentActive.style.transition = `opacity ${TRANSITION_MS}ms ease`;
      currentActive.style.opacity = '0';
      setTimeout(() => {
        currentActive.classList.remove('active-tab');
        currentActive.style.display = 'none';
        
        // After old is hidden, show new one and fade it in
        if (targetTab) {
          targetTab.classList.add('active-tab');
          targetTab.style.display = 'flex';
          targetTab.style.transition = `opacity ${TRANSITION_MS}ms ease`;
          targetTab.style.opacity = '0';
          targetTab.offsetHeight; // reflow
          targetTab.style.opacity = '1';
        }
        
        // Release height lock after fade-in completes
        setTimeout(() => {
          if (containerEl) containerEl.style.minHeight = '';
        }, TRANSITION_MS + 20);
      }, TRANSITION_MS);
    } else if (currentActive && currentActive === targetTab) {
      // Already on the target; ensure visible
      currentActive.style.display = 'flex';
      currentActive.style.opacity = '1';
      if (containerEl) containerEl.style.minHeight = '';
      return;
    }
    
    if (targetTab) {
      // If no current active, show target directly with fade-in
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
    
    // Update button states
    const allTabButtons = document.querySelectorAll('.tabs_button.is-yacht-gallery');
    allTabButtons.forEach(btn => {
      btn.classList.remove('active-tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    
    // Find and activate the button that controls this tab
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
        // Ensure no button is active initially
        buttons.forEach(btn => {
          btn.classList.remove('active-tab');
          btn.setAttribute('aria-selected', 'false');
        });
        
        // Add click handlers to interior list buttons
        buttons.forEach(button => {
          button.addEventListener('click', (e) => {
            // Determine filter term from button text (early to allow guard)
            const term = (button.textContent || button.innerText || '').trim();
            const termSan = this.sanitizeString(term);
            const panel = document.getElementById('tab-interior-variant-gallery');
            const isVariantActive = !!(panel && panel.classList.contains('active-tab'));
            const isAlreadyActive = button.getAttribute('aria-selected') === 'true';

            // Strict guard: ignore clicks on already-active interior filter buttons
            if (isAlreadyActive) {
              return;
            }

            // Guard: if clicking the already-active filter while the tab is active and term unchanged, do nothing
            if (isAlreadyActive && isVariantActive && this.currentVariantFilterTerm === termSan) {
              return;
            }

            buttons.forEach(btn => {
              btn.classList.remove('active-tab');
              btn.setAttribute('aria-selected', 'false');
            });
            button.classList.add('active-tab');
            button.setAttribute('aria-selected', 'true');

            // Switch to the interior variant gallery with animations and swiper setup
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

    // Perform animated switch (no-op if already on target)
    this.switchToTab(targetTabId);

    // Ensure main Interior tab button remains active while filtering variant
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
      // Re-init swipers after transition only when switching tabs
      const tabsContainer = targetTab.closest('.tabs');
      const allTabsInContainer = tabsContainer ? tabsContainer.querySelectorAll('.tabs_tab') : [];
      allTabsInContainer.forEach((tab) => {
        this.destroySwipersInTab(tab);
      });

      this.swiperInstances = this.swiperInstances.filter((swiper) => swiper !== null);

      setTimeout(() => {
        this.initializeSwipersInTab(targetTab);
        // After swiper exists and panel is visible, perform filtering and refresh
        setTimeout(() => {
          const termToApply = this.pendingVariantFilterTerm || term || '';
          // If we just switched tabs, skip inner fade to avoid double animation
          this.filterInteriorVariantByTerm(termToApply, true, false);
          setTimeout(() => {
            this.refreshInteriorVariantSwiper(termToApply);
            this.pendingVariantFilterTerm = '';
          }, 50);
        }, 60);
      }, this.transitionMs + 50);
    } else {
      // Already on the variant tab: do not destroy/re-init the swiper; just filter in place and preserve index
      const termToApply = this.pendingVariantFilterTerm || term || '';
      this.filterInteriorVariantByTerm(termToApply, false, true);
      setTimeout(() => {
        this.refreshInteriorVariantSwiper(termToApply);
        this.pendingVariantFilterTerm = '';
      }, 80);
    }

    // Ensure interior list remains visible when variant is active
    clearTimeout(this._interiorListTimer);
    this._interiorListTimer = setTimeout(() => {
      this.showInteriorList(true);
    }, this.transitionMs);
  }

  // Robust sanitize helper: lowercase, remove accents, collapse non-alphanumerics
  sanitizeString(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Extract possible filenames from any media tags inside a slide
  getFilenamesFromSlide(slideEl) {
    const names = [];
    const imgs = Array.from(slideEl.querySelectorAll('img'));
    imgs.forEach((img) => {
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
    const tokens = termSan.split(/\s+/).filter(Boolean);
    const sliderEl = panel.querySelector('.slider-full');
    const list = panel.querySelector('.slider_list-full');
    if (!sliderEl || !list) return;

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
      // Capture current active slide identity to preserve after filtering
      const existing = this.swiperInstances.find(sw => sw && sw.el === sliderEl);
      let prevKey = null;
      if (preserveActive && existing && existing.slides) {
        try {
          const prevIdx = (typeof existing.realIndex === 'number') ? existing.realIndex : (typeof existing.activeIndex === 'number' ? existing.activeIndex : 0);
          const prevSlideEl = existing.slides[prevIdx];
          if (prevSlideEl) {
            const names = this.getFilenamesFromSlide(prevSlideEl);
            if (names && names.length) prevKey = this.sanitizeString(names[0]);
          }
        } catch (_) {}
      }

      // Rebuild slide list from original cache, then keep only matches
      if (this.variantGalleryCache.originalHTML) {
        list.innerHTML = this.variantGalleryCache.originalHTML;
      } else {
        this.variantGalleryCache.originalHTML = list.innerHTML;
      }

      const allSlides = Array.from(list.querySelectorAll('.slider_item-full'));
      const matchingSlides = allSlides.filter((slide) => {
        const filenames = this.getFilenamesFromSlide(slide);
        const fileSanPool = filenames.map(n => this.sanitizeString(n)).join(' | ');
        return tokens.length === 0 ? true : tokens.every(t => fileSanPool.includes(t));
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
                const names = this.getFilenamesFromSlide(newSlides[i]).map(n => this.sanitizeString(n));
                if (names.includes(prevKey)) { targetIndex = i; break; }
              }
            } catch (_) {}
          }
          if (matchingSlides.length > 0) newSwiper.slideTo(targetIndex, 0);
          setTimeout(() => {
            this.updateYachtGallerySlideCount(newSwiper, panel, matchingSlides.length);
          }, 30);
        }, 50);
      }

      // Remember the last applied filter term (sanitized)
      this.currentVariantFilterTerm = termSan;

      if (!immediate) {
        // Fade back in
        sliderEl.style.transition = `opacity ${DURATION}ms ease`;
        sliderEl.style.opacity = '1';
        setTimeout(releaseHeight, DURATION + 20);
      } else {
        releaseHeight();
      }
    };

    if (!immediate) {
      // Fade out then filter
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
    const swiper = this.swiperInstances.find(sw => sw && sw.el === sliderEl);
    if (!swiper) return;

    swiper.updateSlides();
    swiper.updateSlidesClasses();
    swiper.update();

    const visibleSlides = slides.filter(s => s.style.display !== 'none');
    const firstVisible = visibleSlides.length ? visibleSlides[0] : null;
    if (firstVisible) {
      const index = slides.indexOf(firstVisible);
      if (index >= 0) swiper.slideTo(index, 0);
    }
    // Update displayed counters inside the panel
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

new SwiperManager();


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

	// Also activate the corresponding .tabs_tab-item elements
	$('.tabs_tab-item').each(function () {
		var isActive = $(this).attr('aria-labelledby') === tabId;
		$(this).toggleClass('active-tab', isActive);
	});

		showPins(tabId);
	}

	// Initialize tab states and find first visible tab
	function initializeTabStates() {
		var $visibleTabs = $("[data-control='layouts']").filter(function() {
			return !$(this).hasClass('w-condition-invisible');
		});
		
		if ($visibleTabs.length === 0) return;
		
		var $firstVisibleTab = $visibleTabs.first();
		var firstVisibleTabId = $firstVisibleTab.attr('id');
		
		// Set all tabs to inactive state
		$("[data-control='layouts']").each(function () {
			$(this).removeClass('active-tab')
				.attr({ 'aria-selected': 'false', tabindex: '-1' });
		});
		
		// Set all tab panels to inactive state
		$('.tabs_tab-item').each(function () {
			$(this).removeClass('active-tab');
		});
		
		// Activate the first visible tab
		$firstVisibleTab
			.addClass('active-tab')
			.attr({ 'aria-selected': 'true', tabindex: '0' });
		
		// Activate the corresponding tab panel
		$('.tabs_tab-item').each(function () {
			var isActive = $(this).attr('aria-labelledby') === firstVisibleTabId;
			$(this).toggleClass('active-tab', isActive);
		});
		
		// Show pins for the first visible tab
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

	// Initialize tab states when DOM is ready
	initializeTabStates();
});


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

document.addEventListener('DOMContentLoaded', fixInvisibleActiveTab);

 

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    const currentScrollY = window.scrollY;
    const finishLists = document.querySelectorAll(".custom_finish_list");
    
    finishLists.forEach(function (finishList) {
      const finishItems = finishList.querySelectorAll(".custom_finish_item");
      
      for (let i = 0; i < finishItems.length; i++) {
        const finishItem = finishItems[i];
        if (window.getComputedStyle(finishItem).display !== "none") {
          const radioLabel = finishItem.querySelector(".custom_radio_label");
          if (radioLabel) {
            radioLabel.click();
            radioLabel.classList.add("is-list-active");
          }
          break;
        }
      }
    });
    
    window.scrollTo(0, currentScrollY);
  }, 2000);
});
 


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

  // First fade out all items
  $(".custom_item").css("opacity", "0").removeClass("is-custom-show");

  // Wait for fade out to complete, then hide with display
  setTimeout(() => {
    $(".custom_item").css("display", "none");
    
    // Now show matching items
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

    

function setPinHeight() {
  var h = $('.tabs_tab-item').first().outerHeight();
  $('.layouts_pin-wrapper').height(h);
}
$(function() {
  setPinHeight();
  $(window).on('resize', setPinHeight);
});
 
