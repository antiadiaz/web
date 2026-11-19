/**
 * ANTIADIAZ.COM — ILLUSTRATION SPACE (INVERTED HOME AESTHETIC)
 * Initializes the white top-left interactive halftone grain on black ground.
 */

import { initSectionHalftone } from './halftone.js';
import { initSpaceEdgeLinks } from './edgeLinks.js';
import { attachGalleryCards, hideCardTooltip, isLightboxOpen } from './lightbox.js';

export function initIllustration() {
  const illustrationSpace = document.getElementById('space-illustration');
  const canvas = document.getElementById('illustration-halftone');
  if (!illustrationSpace || !canvas) {
    return;
  }

  initSectionHalftone({
    section: illustrationSpace,
    canvas,
    variant: 'illustration-top-left',
    rgb: '255, 255, 255',
    protectedSelectors: [
      '.illustration-headline',
    ],
  });

  // Living vertical column drift on scroll (opposite gentle column speeds + organic inertia)
  const masonrySection = document.getElementById('illustration-masonry-section');
  const masonryGrid = document.getElementById('illustration-masonry');
  const columns = masonryGrid
    ? Array.from(masonryGrid.querySelectorAll('.illustration-masonry__col'))
    : [];
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (masonrySection && masonryGrid && columns.length > 0) {
    const columnConfigs = columns.map((col, index) => {
      const rawSpeed = Number(col.getAttribute('data-scroll-shift') || 0);
      const easeRates = [0.095, 0.076, 0.088, 0.072];
      return {
        el: col,
        maxShift: rawSpeed,
        ease: easeRates[index % easeRates.length],
        currentY: 0,
        targetY: 0,
      };
    });

    let driftRafId = null;

    const computeTargets = () => {
      if (reducedMotionQuery.matches) {
        columnConfigs.forEach((cfg) => {
          cfg.targetY = 0;
          cfg.currentY = 0;
          cfg.el.style.transform = '';
        });
        return false;
      }

      const isMobile = window.innerWidth <= 768;
      const scale = isMobile ? 0.52 : 1;
      const scrollDistance = Math.max(460, masonryGrid.offsetHeight * 0.9);
      const progress = Math.max(0, Math.min(1.15, illustrationSpace.scrollTop / scrollDistance));

      columnConfigs.forEach((cfg) => {
        cfg.targetY = cfg.maxShift * scale * progress;
      });
      return true;
    };

    const tickDrift = () => {
      driftRafId = null;
      let needsAnotherFrame = false;

      columnConfigs.forEach((cfg) => {
        const delta = cfg.targetY - cfg.currentY;
        if (Math.abs(delta) < 0.06) {
          cfg.currentY = cfg.targetY;
        } else {
          cfg.currentY += delta * cfg.ease;
          needsAnotherFrame = true;
        }
        cfg.el.style.transform = `translate3d(0, ${cfg.currentY.toFixed(2)}px, 0)`;
      });

      if (needsAnotherFrame) {
        driftRafId = requestAnimationFrame(tickDrift);
      }
    };

    const scheduleDrift = () => {
      if (!computeTargets()) return;
      if (driftRafId === null) {
        driftRafId = requestAnimationFrame(tickDrift);
      }
    };

    illustrationSpace.addEventListener('scroll', scheduleDrift, { passive: true });
    window.addEventListener('resize', scheduleDrift, { passive: true });
    scheduleDrift();
  }

  // Lightbox + hover title tooltip for illustration cards
  const illustrationCards = Array.from(
    illustrationSpace.querySelectorAll('.illustration-card')
  );
  if (illustrationCards.length > 0) {
    attachGalleryCards(illustrationCards, {
      scopeEl: illustrationSpace,
      scrollContainer: illustrationSpace,
      mode: 'collection',
      onOpen: () => {
        illustrationSpace.dispatchEvent(new CustomEvent('illustration:lightboxopen'));
      },
    });
    illustrationSpace.addEventListener('illustration:lightboxopen', hideCardTooltip);
  }

  initSpaceEdgeLinks({
    spaceName: 'illustration',
    spaceElement: illustrationSpace,
    leftLink: illustrationSpace.querySelector('.illustration-back-link'),
    headlineEl: illustrationSpace.querySelector('.illustration-headline'),
    excludeSelector: '.illustration-content > *, .site-header, .hero-lightbox, .legal-modal',
    getVerticalBounds: (_side, headerBottom) => {
      const galleryRect = masonrySection ? masonrySection.getBoundingClientRect() : null;
      const cutoffY = galleryRect
        ? galleryRect.top - 10
        : window.innerHeight - 24;
      return { minY: headerBottom + 8, maxY: cutoffY };
    },
    extraBlockers: [isLightboxOpen],
    extraHideTarget: illustrationSpace,
    extraHideEvent: 'illustration:lightboxopen',
  });
}
