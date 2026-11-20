/**
 * ANTIADIAZ.COM — WRITING SPACE (HOME AESTHETIC)
 * Initializes the interactive top-right halftone grain on warm paper ground,
 * the layered print collage hover & lightbox interactions, and edge navigation.
 */

import { initSectionHalftone } from './halftone.js';
import { initSpaceEdgeLinks } from './edgeLinks.js';
import { attachGalleryCards, hideCardTooltip, isLightboxOpen } from './lightbox.js';

export function initWriting() {
  const writingSpace = document.getElementById('space-writing');
  const canvas = document.getElementById('writing-halftone');
  if (!writingSpace || !canvas) {
    return;
  }

  initSectionHalftone({
    section: writingSpace,
    canvas,
    variant: 'hero-top',
    rgb: '17, 17, 17',
    protectedSelectors: [
      '.writing-headline',
    ],
  });

  const collageSection = document.getElementById('writing-collage-section');
  const collageEl = document.getElementById('writing-collage');
  const writingCards = Array.from(writingSpace.querySelectorAll('.writing-card'));
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let readyTimer = null;
  const syncCollageReady = () => {
    if (!collageEl) return;
    if (writingSpace.classList.contains('is-entered')) {
      if (reducedMotionQuery.matches) {
        collageEl.classList.add('is-collage-ready');
        return;
      }
      if (!collageEl.classList.contains('is-collage-ready') && readyTimer === null) {
        readyTimer = window.setTimeout(() => {
          readyTimer = null;
          collageEl.classList.add('is-collage-ready');
        }, 1050);
      }
    } else {
      if (readyTimer !== null) {
        window.clearTimeout(readyTimer);
        readyTimer = null;
      }
      collageEl.classList.remove('is-collage-ready');
    }
  };

  if (collageEl) {
    const classObserver = new MutationObserver(syncCollageReady);
    classObserver.observe(writingSpace, {
      attributes: true,
      attributeFilter: ['class'],
    });
    syncCollageReady();
  }

  // Smooth front-layer elevation & unhurried settling back into the paper pile
  const settleTimers = new WeakMap();
  writingCards.forEach((card) => {
    const clearSettle = () => {
      const existing = settleTimers.get(card);
      if (existing) {
        window.clearTimeout(existing);
        settleTimers.delete(card);
      }
      card.classList.remove('is-settling');
    };

    const startHover = () => {
      writingCards.forEach((other) => {
        if (other !== card) {
          other.classList.remove('is-settling');
          const t = settleTimers.get(other);
          if (t) {
            window.clearTimeout(t);
            settleTimers.delete(other);
          }
        }
      });
      clearSettle();
    };

    const endHover = () => {
      clearSettle();
      card.classList.add('is-settling');
      const timer = window.setTimeout(() => {
        card.classList.remove('is-settling');
        settleTimers.delete(card);
      }, 650);
      settleTimers.set(card, timer);
    };

    card.addEventListener('pointerenter', startHover);
    card.addEventListener('focus', startHover);
    card.addEventListener('pointerleave', endHover);
    card.addEventListener('blur', endHover);
  });

  // Lightbox + hover title tooltip for writing cards
  if (writingCards.length > 0) {
    attachGalleryCards(writingCards, {
      scopeEl: writingSpace,
      scrollContainer: writingSpace,
      mode: 'collection',
      onOpen: () => {
        writingSpace.dispatchEvent(new CustomEvent('writing:lightboxopen'));
      },
    });
    writingSpace.addEventListener('writing:lightboxopen', hideCardTooltip);
  }

  initSpaceEdgeLinks({
    spaceName: 'writing',
    spaceElement: writingSpace,
    rightLink: writingSpace.querySelector('.writing-back-link'),
    headlineEl: writingSpace.querySelector('.writing-headline'),
    excludeSelector: '.writing-content > *, .writing-contact, .site-header, .hero-lightbox, .legal-modal',
    getVerticalBounds: (_side, headerBottom) => {
      const galleryRect = collageSection ? collageSection.getBoundingClientRect() : null;
      const cutoffY = galleryRect
        ? galleryRect.top - 10
        : window.innerHeight - 24;
      return { minY: headerBottom + 8, maxY: cutoffY };
    },
    extraBlockers: [isLightboxOpen],
    extraHideTarget: writingSpace,
    extraHideEvent: 'writing:lightboxopen',
  });
}
