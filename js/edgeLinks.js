/**
 * ANTIADIAZ.COM — CURSOR-FOLLOWING EDGE SPACE LINKS
 *
 * Reveals edge navigation links (.hero-side-link) on pointer-fine desktops when
 * the cursor approaches the configured screen margin and smoothly tracks it,
 * while staying suppressed over excluded areas (e.g. gallery, header, modals).
 */

export function initSpaceEdgeLinks({
  spaceName,
  spaceElement,
  leftLink = null,
  rightLink = null,
  headlineEl = null,
  excludeSelector = '.site-header, .legal-modal',
  getVerticalBounds = null,
  extraBlockers = [],
  extraHideTarget = null,
  extraHideEvent = '',
}) {
  if (!leftLink && !rightLink) {
    return;
  }

  const siteHeader = document.getElementById('site-header');
  const spacesTrack = document.getElementById('spaces-track');
  const legalModal = document.getElementById('legal-modal');
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeSide = null;
  let rafId = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastPointerX = -9999;
  let lastPointerY = -9999;

  const getActiveEl = (side) => (side === 'left' ? leftLink : rightLink);

  const hideLinks = () => {
    activeSide = null;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (leftLink) leftLink.classList.remove('is-visible');
    if (rightLink) rightLink.classList.remove('is-visible');
    if (hoverQuery.matches && window.innerWidth > 768) {
      if (leftLink) leftLink.style.transform = '';
      if (rightLink) rightLink.style.transform = '';
    }
  };

  const renderLink = () => {
    rafId = null;
    if (!activeSide) return;

    const el = getActiveEl(activeSide);
    if (!el) return;

    const dx = targetX - currentX;
    const dy = targetY - currentY;

    if (reducedMotionQuery.matches || (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25)) {
      currentX = targetX;
      currentY = targetY;
      el.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
      return;
    }

    currentX += dx * 0.24;
    currentY += dy * 0.24;
    el.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
    rafId = requestAnimationFrame(renderLink);
  };

  const evaluate = (clientX, clientY) => {
    const isBlocked =
      window.innerWidth <= 768 ||
      !hoverQuery.matches ||
      (spacesTrack && spacesTrack.getAttribute('data-active-space') !== spaceName) ||
      (legalModal && !legalModal.hidden) ||
      extraBlockers.some((fn) => fn());

    if (isBlocked) {
      hideLinks();
      return;
    }

    const headerBottom = siteHeader ? siteHeader.getBoundingClientRect().bottom : 56;
    const vw = window.innerWidth;
    const headlineRect = headlineEl ? headlineEl.getBoundingClientRect() : null;

    const underEl = document.elementFromPoint(clientX, clientY);
    if (underEl && excludeSelector && underEl.closest(excludeSelector)) {
      hideLinks();
      return;
    }

    const baseEdgeSpan = Math.min(240, Math.max(150, vw * 0.175));
    const leftZoneEnd = headlineRect
      ? Math.min(baseEdgeSpan, Math.max(115, headlineRect.left - 10))
      : baseEdgeSpan;
    const rightZoneStart = headlineRect
      ? Math.max(vw - baseEdgeSpan, Math.min(vw - 135, headlineRect.right + 10))
      : vw - baseEdgeSpan;

    const resolveBounds = (side) => {
      if (typeof getVerticalBounds === 'function') {
        return getVerticalBounds(side, headerBottom);
      }
      return {
        minY: headerBottom + 8,
        maxY: window.innerHeight - 24,
      };
    };

    let nextSide = null;
    if (leftLink && clientX >= 0 && clientX <= leftZoneEnd) {
      const { minY, maxY } = resolveBounds('left');
      if (clientY >= minY - 4 && clientY < maxY) {
        nextSide = 'left';
      }
    }
    if (!nextSide && rightLink && clientX <= vw && clientX >= rightZoneStart) {
      const { minY, maxY } = resolveBounds('right');
      if (clientY >= minY - 4 && clientY < maxY) {
        nextSide = 'right';
      }
    }

    if (!nextSide) {
      hideLinks();
      return;
    }

    const el = getActiveEl(nextSide);
    if (!el) return;

    const otherEl = getActiveEl(nextSide === 'left' ? 'right' : 'left');
    if (otherEl) {
      otherEl.classList.remove('is-visible');
      otherEl.style.transform = '';
    }

    const w = el.offsetWidth || 120;
    const h = el.offsetHeight || 34;
    const { minY, maxY: rawMaxY } = resolveBounds(nextSide);
    const maxY = Math.max(minY, rawMaxY - h - 6);

    const clampedX =
      nextSide === 'left'
        ? Math.max(18, Math.min(leftZoneEnd - w, clientX - w * 0.48))
        : Math.min(vw - w - 18, Math.max(rightZoneStart, clientX - w * 0.52));
    const clampedY = Math.max(minY, Math.min(maxY, clientY - h * 0.5));

    const parentRect = el.offsetParent
      ? el.offsetParent.getBoundingClientRect()
      : { left: 0, top: 0 };
    const localX = clampedX - parentRect.left;
    const localY = clampedY - parentRect.top;

    if (activeSide !== nextSide) {
      activeSide = nextSide;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      currentX = localX;
      currentY = localY;
      targetX = localX;
      targetY = localY;
      el.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
      el.classList.add('is-visible');
      return;
    }

    targetX = localX;
    targetY = localY;
    if (rafId === null) {
      rafId = requestAnimationFrame(renderLink);
    }
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      evaluate(event.clientX, event.clientY);
    },
    { passive: true }
  );

  if (spaceElement) {
    spaceElement.addEventListener(
      'scroll',
      () => {
        if (lastPointerX < 0) return;
        evaluate(lastPointerX, lastPointerY);
      },
      { passive: true }
    );
  }

  if (spacesTrack) {
    const observer = new MutationObserver(() => {
      if (spacesTrack.getAttribute('data-active-space') !== spaceName) {
        hideLinks();
      }
    });
    observer.observe(spacesTrack, {
      attributes: true,
      attributeFilter: ['data-active-space'],
    });
  }

  if (leftLink) leftLink.addEventListener('click', hideLinks);
  if (rightLink) rightLink.addEventListener('click', hideLinks);
  if (extraHideTarget && extraHideEvent) {
    extraHideTarget.addEventListener(extraHideEvent, hideLinks);
  }
  document.addEventListener('mouseleave', hideLinks);
  window.addEventListener('blur', hideLinks);
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 || !hoverQuery.matches) {
      hideLinks();
    }
  });
}
