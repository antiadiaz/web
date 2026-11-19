/**
 * ANTIADIAZ.COM — HERO ENTRANCE, EDGE-PANNING MASONRY, FILTERS & LIGHTBOX
 */

import { initSectionHalftone } from './halftone.js';
import { initSpaceEdgeLinks } from './edgeLinks.js';
import { attachGalleryCards, hideCardTooltip, isLightboxOpen } from './lightbox.js';

export function initHero() {
  const heroSection = document.getElementById('hero');
  if (!heroSection) {
    return;
  }

  initSectionHalftone({
    section: heroSection,
    canvas: document.getElementById('hero-halftone'),
    variant: 'hero-top',
    protectedSelectors: [
      '.hero-headline',
      '#hero-masonry-viewport',
    ],
  });

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 1. Trigger staggered entrance animation, then mark filter-ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroSection.classList.add('is-entered');
      window.setTimeout(() => {
        heroSection.classList.add('is-filter-ready');
      }, 1150);
    });
  });

  // 2. Mouse-driven horizontal edge reveal for overflowing masonry columns
  const viewport = document.getElementById('hero-masonry-viewport');
  const masonryTrack = document.getElementById('hero-masonry');
  const homeSpace = document.getElementById('space-home');

  let computeMaxPan = () => {};

  if (viewport && masonryTrack && homeSpace) {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    let maxPan = 0;
    let targetX = 0;
    let currentX = 0;
    let rafId = null;

    computeMaxPan = () => {
      if (window.innerWidth <= 768 || !hoverQuery.matches) {
        maxPan = 0;
        targetX = 0;
        currentX = 0;
        masonryTrack.style.transform = '';
        return;
      }

      const overflow = masonryTrack.offsetWidth - viewport.clientWidth;
      maxPan = overflow > 0 ? overflow / 2 + 24 : 0;
    };

    function tick() {
      const delta = targetX - currentX;
      if (Math.abs(delta) < 0.2 || reducedMotionQuery.matches) {
        currentX = targetX;
        masonryTrack.style.transform = `translate3d(${currentX.toFixed(2)}px, 0, 0)`;
        rafId = null;
        return;
      }

      currentX += delta * 0.085;
      masonryTrack.style.transform = `translate3d(${currentX.toFixed(2)}px, 0, 0)`;
      rafId = requestAnimationFrame(tick);
    }

    function scheduleTick() {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function handlePointerMove(event) {
      if (maxPan <= 0) return;

      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawRatio = (event.clientX - rect.left) / rect.width;
      const clamped = Math.min(1, Math.max(0, (rawRatio - 0.06) / 0.88));

      targetX = (0.5 - clamped) * 2 * maxPan;
      scheduleTick();
    }

    function handlePointerLeave() {
      if (maxPan <= 0) return;
      targetX = 0;
      scheduleTick();
    }

    computeMaxPan();
    window.addEventListener('resize', computeMaxPan);
    viewport.addEventListener('pointermove', handlePointerMove, { passive: true });
    viewport.addEventListener('pointerleave', handlePointerLeave);
  }

  // 3. Gallery filtering (ALL / DEV / DESIGN) with fade + background-upward depth motion
  const cards = Array.from(heroSection.querySelectorAll('.hero-card'));
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));

  if (filterButtons.length > 0 && cards.length > 0) {
    let activeFilter = 'all';
    let filterTimer = null;
    let heightCleanupTimer = null;

    function cardMatchesFilter(card, filter) {
      if (filter === 'all') return true;
      const tags = (card.getAttribute('data-tags') || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      return tags.includes(filter);
    }

    function syncFilterButtons(nextFilter) {
      filterButtons.forEach((button) => {
        const isCurrent = button.getAttribute('data-filter') === nextFilter;
        button.classList.toggle('is-active', isCurrent);
        button.setAttribute('aria-pressed', String(isCurrent));
      });
    }

    function applyFilter(nextFilter) {
      if (!nextFilter || nextFilter === activeFilter) {
        return;
      }

      activeFilter = nextFilter;
      heroSection.classList.add('is-filter-ready');
      syncFilterButtons(nextFilter);
      if (typeof window !== 'undefined') {
        heroSection.dispatchEvent(new CustomEvent('hero:filterchange'));
      }

      if (filterTimer !== null) {
        window.clearTimeout(filterTimer);
        filterTimer = null;
      }

      if (heightCleanupTimer !== null) {
        window.clearTimeout(heightCleanupTimer);
        heightCleanupTimer = null;
      }

      // If user is scrolled past the gallery into Contact, scroll smoothly back up to show results
      if (homeSpace && masonryTrack) {
        const galleryBottom = masonryTrack.offsetTop + masonryTrack.offsetHeight;
        if (homeSpace.scrollTop > galleryBottom - 100) {
          heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      // Clear any mid-flight FLIP transforms
      cards.forEach((card) => {
        card.classList.remove('is-flipping', 'is-entering-from');
        card.style.transform = '';
        card.style.removeProperty('--enter-i');
      });

      const leavingCards = [];
      const enteringCards = [];
      const stayingCards = [];

      cards.forEach((card) => {
        const isCurrentlyHidden = card.classList.contains('is-hidden');
        const shouldShow = cardMatchesFilter(card, nextFilter);

        if (shouldShow && isCurrentlyHidden) {
          enteringCards.push(card);
        } else if (!shouldShow && !isCurrentlyHidden) {
          leavingCards.push(card);
        } else if (shouldShow && !isCurrentlyHidden) {
          stayingCards.push(card);
        }
      });

      // Phase A: Fade out & send outgoing cards upward into background
      leavingCards.forEach((card) => {
        card.classList.add('is-leaving');
      });

      const exitDelay =
        leavingCards.length > 0 && !reducedMotionQuery.matches ? 260 : 0;

      filterTimer = window.setTimeout(() => {
        filterTimer = null;

        // First: capture current viewport height & staying card positions before layout change
        const startHeight = viewport ? viewport.getBoundingClientRect().height : 0;
        if (viewport && !reducedMotionQuery.matches) {
          viewport.style.transition = 'none';
          viewport.style.height = `${startHeight}px`;
        }

        const firstRects = new Map();
        stayingCards.forEach((card) => {
          firstRects.set(card, card.getBoundingClientRect());
        });

        // Collapse outgoing cards
        leavingCards.forEach((card) => {
          card.classList.remove('is-leaving');
          card.classList.add('is-hidden');
        });

        // Reveal incoming cards starting from background & upward state
        enteringCards.forEach((card, index) => {
          card.classList.remove('is-hidden', 'is-leaving');
          card.style.setProperty('--enter-i', String(index));
          if (!reducedMotionQuery.matches) {
            card.classList.add('is-entering-from');
          }
        });

        const endHeight = masonryTrack ? masonryTrack.getBoundingClientRect().height : 0;

        // Last + Invert: keep staying cards visually in place before animating
        if (!reducedMotionQuery.matches) {
          stayingCards.forEach((card) => {
            const first = firstRects.get(card);
            const last = card.getBoundingClientRect();
            if (!first) return;
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
              card.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
            }
          });
        }

        // Play FLIP + smooth height transition so Contact below glides cleanly
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (viewport && !reducedMotionQuery.matches) {
              if (Math.abs(endHeight - startHeight) > 0.5) {
                viewport.style.transition = 'height 560ms cubic-bezier(0.16, 1, 0.3, 1)';
                viewport.style.height = `${endHeight}px`;

                heightCleanupTimer = window.setTimeout(() => {
                  viewport.style.height = '';
                  viewport.style.transition = '';
                  heightCleanupTimer = null;
                }, 580);
              } else {
                viewport.style.height = '';
                viewport.style.transition = '';
              }
            }

            stayingCards.forEach((card) => {
              if (card.style.transform) {
                card.classList.add('is-flipping');
                card.style.transform = '';
              }
            });

            enteringCards.forEach((card) => {
              card.classList.remove('is-entering-from');
            });

            window.setTimeout(() => {
              stayingCards.forEach((card) => card.classList.remove('is-flipping'));
            }, 500);
          });
        });

        computeMaxPan();
      }, exitDelay);
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyFilter(button.getAttribute('data-filter'));
      });
    });
  }

  // 4. Shared lightbox & cursor tooltip for project showcase
  attachGalleryCards(cards, {
    scopeEl: heroSection,
    scrollContainer: homeSpace,
    mode: 'slides',
    onOpen: () => {
      heroSection.dispatchEvent(new CustomEvent('hero:lightboxopen'));
    },
  });

  heroSection.addEventListener('hero:lightboxopen', hideCardTooltip);
  heroSection.addEventListener('hero:filterchange', hideCardTooltip);

  // 5. Cursor-following Writing & Illustration edge links (hidden over the gallery)
  initSpaceEdgeLinks({
    spaceName: 'home',
    spaceElement: homeSpace,
    leftLink: heroSection.querySelector('.hero-side-link--left'),
    rightLink: heroSection.querySelector('.hero-side-link--right'),
    headlineEl: heroSection.querySelector('.hero-headline'),
    excludeSelector:
      '.hero-card, #hero-masonry-viewport, .home-anchors, .home-section--about, .home-section--contact, .site-header, .hero-lightbox, .legal-modal',
    getVerticalBounds: (side, headerBottom) => {
      const masonryRect = viewport ? viewport.getBoundingClientRect() : null;
      const colSelector = side === 'left' ? '.hero-masonry__col--1' : '.hero-masonry__col--4';
      const col = heroSection.querySelector(colSelector);
      const colTop = col ? col.getBoundingClientRect().top : Infinity;
      const cutoffY = masonryRect
        ? Math.min(colTop, masonryRect.top + (side === 'left' ? 24 : 8))
        : window.innerHeight - 24;
      return { minY: headerBottom + 8, maxY: cutoffY };
    },
    extraBlockers: [isLightboxOpen],
    extraHideTarget: heroSection,
    extraHideEvent: 'hero:lightboxopen',
  });
}
