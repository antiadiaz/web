/**
 * ANTIADIAZ.COM — SHARED LIGHTBOX & CURSOR TOOLTIP CONTROLLER
 *
 * Supports both multi-slide project cards (Home) and single-artwork
 * collection browsing (Illustration).
 */

const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let initialized = false;
let lightbox = null;
let lightboxImg = null;
let lightboxPrev = null;
let lightboxNext = null;
let lightboxTitle = null;
let lightboxDesc = null;
let lightboxLink = null;
let lightboxClose = null;
let cardTooltip = null;

let lastTrigger = null;
let currentMode = 'slides';
let currentSlides = [];
let activeSlideIndex = 0;
let currentCollectionCards = [];
let activeCardIndex = 0;
let fadeTimer = null;
let slideToken = 0;

let hoveredCard = null;
let hoveredOwnerScope = null;
let tipRafId = null;
let tipTargetX = 0;
let tipTargetY = 0;
let tipCurrentX = 0;
let tipCurrentY = 0;
let tipWidth = 0;
let tipHeight = 0;
let lastPointerX = -9999;
let lastPointerY = -9999;

const registeredGroups = [];

function ensureDOMRefs() {
  if (lightbox) return;
  lightbox = document.getElementById('hero-lightbox');
  lightboxImg = document.getElementById('hero-lightbox-img');
  lightboxPrev = document.getElementById('hero-lightbox-prev');
  lightboxNext = document.getElementById('hero-lightbox-next');
  lightboxTitle = document.getElementById('hero-lightbox-title');
  lightboxDesc = document.getElementById('hero-lightbox-desc');
  lightboxLink = document.getElementById('hero-lightbox-link');
  lightboxClose = document.getElementById('hero-lightbox-close');
  cardTooltip = document.getElementById('hero-card-tooltip');
}

export function isLightboxOpen() {
  ensureDOMRefs();
  return Boolean(lightbox && !lightbox.hidden);
}

export function hideCardTooltip() {
  hoveredCard = null;
  hoveredOwnerScope = null;
  if (tipRafId !== null) {
    cancelAnimationFrame(tipRafId);
    tipRafId = null;
  }
  if (cardTooltip) {
    cardTooltip.classList.remove('is-visible');
  }
}

function getClampedTipPosition(clientX, clientY) {
  const margin = 12;
  let x = clientX + 18;
  let y = clientY + 20;

  if (x + tipWidth > window.innerWidth - margin) {
    x = Math.max(margin, clientX - tipWidth - 10);
  }
  if (y + tipHeight > window.innerHeight - margin) {
    y = Math.max(margin, clientY - tipHeight - 10);
  }
  return { x, y };
}

function renderTooltip() {
  tipRafId = null;
  if (!hoveredCard || !cardTooltip) return;

  const dx = tipTargetX - tipCurrentX;
  const dy = tipTargetY - tipCurrentY;

  if (reducedMotionQuery.matches || (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25)) {
    tipCurrentX = tipTargetX;
    tipCurrentY = tipTargetY;
    cardTooltip.style.transform = `translate3d(${tipCurrentX.toFixed(1)}px, ${tipCurrentY.toFixed(1)}px, 0)`;
    return;
  }

  tipCurrentX += dx * 0.34;
  tipCurrentY += dy * 0.34;
  cardTooltip.style.transform = `translate3d(${tipCurrentX.toFixed(1)}px, ${tipCurrentY.toFixed(1)}px, 0)`;
  tipRafId = requestAnimationFrame(renderTooltip);
}

function showCardTooltip(card, scopeEl, clientX, clientY) {
  ensureDOMRefs();
  if (!cardTooltip) return;

  if (
    !hoverQuery.matches ||
    isLightboxOpen() ||
    card.classList.contains('is-hidden') ||
    card.classList.contains('is-leaving')
  ) {
    hideCardTooltip();
    return;
  }

  const caption = (card.getAttribute('data-caption') || '').trim();
  if (!caption) {
    hideCardTooltip();
    return;
  }

  if (hoveredCard !== card) {
    cardTooltip.textContent = caption;
    tipWidth = cardTooltip.offsetWidth;
    tipHeight = cardTooltip.offsetHeight;
    hoveredCard = card;
    hoveredOwnerScope = scopeEl || null;

    const pos = getClampedTipPosition(clientX, clientY);
    tipCurrentX = pos.x;
    tipCurrentY = pos.y;
    tipTargetX = pos.x;
    tipTargetY = pos.y;
    cardTooltip.style.transform = `translate3d(${tipCurrentX.toFixed(1)}px, ${tipCurrentY.toFixed(1)}px, 0)`;
    cardTooltip.classList.add('is-visible');
    return;
  }

  const pos = getClampedTipPosition(clientX, clientY);
  tipTargetX = pos.x;
  tipTargetY = pos.y;
  if (tipRafId === null) {
    tipRafId = requestAnimationFrame(renderTooltip);
  }
}

function getCardSlides(card) {
  const img = card.querySelector('img');
  if (!img) return [];

  const rawGallery = card.getAttribute('data-gallery');
  if (rawGallery) {
    try {
      const parsed = JSON.parse(rawGallery);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback to card's primary image
    }
  }
  return [{ src: img.currentSrc || img.src, label: card.getAttribute('data-caption') || 'Artwork' }];
}

function applyLightboxMeta(card) {
  const title = card.getAttribute('data-caption') || '';
  if (lightboxTitle) {
    lightboxTitle.textContent = title;
  }
  if (lightboxDesc) {
    const desc = card.getAttribute('data-desc') || '';
    lightboxDesc.textContent = desc;
    lightboxDesc.hidden = !desc;
  }
  if (lightboxLink) {
    const url = card.getAttribute('data-url') || '';
    if (url) {
      lightboxLink.href = url;
      lightboxLink.hidden = false;
    } else {
      lightboxLink.removeAttribute('href');
      lightboxLink.hidden = true;
    }
  }
}

function renderActiveSlide(animateFade) {
  if (!lightboxImg || currentSlides.length === 0) return;

  const slide = currentSlides[activeSlideIndex];
  const title = lightboxTitle ? lightboxTitle.textContent : '';
  const nextAlt = slide.label && slide.label !== title ? `${title} — ${slide.label}` : title;
  slideToken += 1;
  const token = slideToken;

  if (fadeTimer !== null) {
    window.clearTimeout(fadeTimer);
    fadeTimer = null;
  }

  const applySlideSrc = () => {
    if (token !== slideToken) return;
    const reveal = () => {
      if (token !== slideToken) return;
      requestAnimationFrame(() => {
        lightboxImg.classList.remove('is-fading');
      });
    };

    lightboxImg.onload = reveal;
    lightboxImg.onerror = reveal;
    lightboxImg.alt = nextAlt;
    lightboxImg.src = slide.src;

    if (lightboxImg.complete && lightboxImg.naturalWidth > 0) {
      reveal();
    }
  };

  if (!animateFade || reducedMotionQuery.matches) {
    lightboxImg.classList.remove('is-fading');
    lightboxImg.alt = nextAlt;
    lightboxImg.src = slide.src;
    return;
  }

  lightboxImg.classList.add('is-fading');
  fadeTimer = window.setTimeout(() => {
    fadeTimer = null;
    applySlideSrc();
  }, 180);
}

function stepLightbox(delta) {
  if (currentMode === 'collection') {
    if (currentCollectionCards.length <= 1) return;
    activeCardIndex =
      (activeCardIndex + delta + currentCollectionCards.length) % currentCollectionCards.length;
    const nextCard = currentCollectionCards[activeCardIndex];
    currentSlides = getCardSlides(nextCard);
    activeSlideIndex = 0;
    applyLightboxMeta(nextCard);
    renderActiveSlide(true);
    return;
  }

  if (currentSlides.length <= 1) return;
  activeSlideIndex = (activeSlideIndex + delta + currentSlides.length) % currentSlides.length;
  renderActiveSlide(true);
}

function openLightboxForCard(card, { cards = [], mode = 'slides', onOpen = null } = {}) {
  ensureDOMRefs();
  if (!lightbox || !lightboxImg) return;

  const slides = getCardSlides(card);
  if (slides.length === 0) return;

  hideCardTooltip();
  if (typeof onOpen === 'function') {
    onOpen();
  }

  lastTrigger = card;
  currentMode = mode;
  currentCollectionCards = cards;
  activeCardIndex = Math.max(0, cards.indexOf(card));
  currentSlides = slides;
  activeSlideIndex = 0;

  if (mode === 'collection') {
    cards.forEach((item) => {
      if (item === card) return;
      const itemImg = item.querySelector('img');
      if (itemImg) {
        const preload = new Image();
        preload.src = itemImg.currentSrc || itemImg.src;
      }
    });
  } else {
    slides.slice(1).forEach((slide) => {
      const preload = new Image();
      preload.src = slide.src;
    });
  }

  const showNav = mode === 'collection' ? cards.length > 1 : slides.length > 1;
  if (lightboxPrev) lightboxPrev.hidden = !showNav;
  if (lightboxNext) lightboxNext.hidden = !showNav;

  applyLightboxMeta(card);
  renderActiveSlide(false);

  lightbox.hidden = false;
  requestAnimationFrame(() => {
    lightbox.classList.add('is-open');
  });
  if (lightboxClose) {
    lightboxClose.focus();
  }
}

export function closeLightbox() {
  ensureDOMRefs();
  if (!lightbox || lightbox.hidden) return;
  if (fadeTimer !== null) {
    window.clearTimeout(fadeTimer);
    fadeTimer = null;
  }
  slideToken += 1;
  lightbox.classList.remove('is-open');
  window.setTimeout(() => {
    lightbox.hidden = true;
    if (lightboxImg) {
      lightboxImg.classList.remove('is-fading');
      lightboxImg.removeAttribute('src');
    }
    currentSlides = [];
    currentCollectionCards = [];
  }, 200);
  if (lastTrigger && typeof lastTrigger.focus === 'function') {
    lastTrigger.focus();
  }
}

function initGlobalListeners() {
  if (initialized) return;
  initialized = true;

  ensureDOMRefs();
  if (!lightbox) return;

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => stepLightbox(-1));
  }
  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => stepLightbox(1));
  }
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      stepLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      stepLightbox(1);
    }
  });

  document.addEventListener('mouseleave', hideCardTooltip);
  window.addEventListener('blur', hideCardTooltip);
}

export function attachGalleryCards(
  cards,
  { scopeEl = null, scrollContainer = null, mode = 'slides', onOpen = null } = {}
) {
  initGlobalListeners();
  ensureDOMRefs();

  if (!Array.isArray(cards) || cards.length === 0) {
    return;
  }

  registeredGroups.push({ cards, scopeEl });

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      openLightboxForCard(card, { cards, mode, onOpen });
    });

    if (!cardTooltip) return;

    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      showCardTooltip(card, scopeEl, event.clientX, event.clientY);
    });

    card.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      showCardTooltip(card, scopeEl, event.clientX, event.clientY);
    });

    card.addEventListener('pointerleave', () => {
      if (hoveredCard === card) {
        hideCardTooltip();
      }
    });
  });

  if (scrollContainer) {
    scrollContainer.addEventListener(
      'scroll',
      () => {
        if ((!hoveredCard || hoveredOwnerScope !== scopeEl) && lastPointerX < 0) return;
        const underCursor = document.elementFromPoint(lastPointerX, lastPointerY);
        const matchingGroup = registeredGroups.find(
          (group) => underCursor && group.cards.some((c) => underCursor.closest('button') === c)
        );
        const cardUnder = underCursor ? underCursor.closest('button') : null;
        if (matchingGroup && cardUnder && cards.includes(cardUnder)) {
          showCardTooltip(cardUnder, scopeEl, lastPointerX, lastPointerY);
        } else if (hoveredOwnerScope === scopeEl) {
          hideCardTooltip();
        }
      },
      { passive: true }
    );
  }
}
