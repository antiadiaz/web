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
let lightboxFigure = null;
let lightboxImg = null;
let lightboxPrev = null;
let lightboxNext = null;
let lightboxTitle = null;
let lightboxDesc = null;
let lightboxLink = null;
let lightboxClose = null;

let lightboxSheet = null;
let sheetHeader = null;
let sheetTitle = null;
let sheetMediaStack = null;
let sheetDesc = null;
let sheetDateRow = null;
let sheetDate = null;
let sheetRoleRow = null;
let sheetRole = null;
let sheetTechRow = null;
let sheetTechList = null;
let sheetLink = null;

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
  lightboxFigure = document.getElementById('hero-lightbox-figure');
  lightboxImg = document.getElementById('hero-lightbox-img');
  lightboxPrev = document.getElementById('hero-lightbox-prev');
  lightboxNext = document.getElementById('hero-lightbox-next');
  lightboxTitle = document.getElementById('hero-lightbox-title');
  lightboxDesc = document.getElementById('hero-lightbox-desc');
  lightboxLink = document.getElementById('hero-lightbox-link');
  lightboxClose = document.getElementById('hero-lightbox-close');

  lightboxSheet = document.getElementById('hero-lightbox-sheet');
  sheetHeader = lightboxSheet ? lightboxSheet.querySelector('.hero-lightbox__sheet-header') : null;
  sheetTitle = document.getElementById('hero-lightbox-sheet-title');
  sheetMediaStack = document.getElementById('hero-lightbox-media-stack');
  sheetDesc = document.getElementById('hero-lightbox-sheet-desc');
  sheetDateRow = document.getElementById('hero-lightbox-date-row');
  sheetDate = document.getElementById('hero-lightbox-sheet-date');
  sheetRoleRow = document.getElementById('hero-lightbox-role-row');
  sheetRole = document.getElementById('hero-lightbox-sheet-role');
  sheetTechRow = document.getElementById('hero-lightbox-tech-row');
  sheetTechList = document.getElementById('hero-lightbox-sheet-tech');
  sheetLink = document.getElementById('hero-lightbox-sheet-link');

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

function getCardTech(card) {
  const rawTech = card.getAttribute('data-tech');
  if (!rawTech) return [];
  try {
    const parsed = JSON.parse(rawTech);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && (item.name || typeof item === 'string'));
    }
  } catch {
    // Fallback to comma-separated tech list if plain text is ever provided
    return rawTech
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, detail: '' }));
  }
  return [];
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

function renderEditorialTitle(targetEl, rawTitle) {
  if (!targetEl) return;
  targetEl.textContent = '';
  const words = rawTitle.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  if (words.length === 1) {
    const serifSpan = document.createElement('span');
    serifSpan.className = 'hero-lightbox__sheet-title-serif';
    serifSpan.textContent = words[0].toLowerCase();
    targetEl.appendChild(serifSpan);
    return;
  }

  const splitIndex = words.length >= 3 && words[0].toLowerCase() === 'studio' ? 1 : words.length - 1;
  const sansText = words.slice(0, splitIndex).join(' ').toLowerCase();
  const serifText = words.slice(splitIndex).join(' ').toLowerCase();

  const sansSpan = document.createElement('span');
  sansSpan.className = 'hero-lightbox__sheet-title-sans';
  sansSpan.textContent = sansText;
  targetEl.appendChild(sansSpan);

  const serifSpan = document.createElement('span');
  serifSpan.className = 'hero-lightbox__sheet-title-serif';
  serifSpan.textContent = serifText;
  targetEl.appendChild(serifSpan);
}

function syncSheetHeaderScrollState() {
  if (!lightbox || !sheetHeader) return;
  const hasBg = currentMode === 'slides' && lightbox.scrollTop > 16;
  sheetHeader.classList.toggle('has-bg', hasBg);
}

function populateProjectSheet(card, slides) {
  if (!lightboxSheet) return;

  const title = card.getAttribute('data-caption') || '';
  const desc = card.getAttribute('data-desc') || '';
  const date = card.getAttribute('data-date') || '';
  const role = card.getAttribute('data-role') || '';
  const url = card.getAttribute('data-url') || '';
  const techItems = getCardTech(card);

  renderEditorialTitle(sheetTitle, title);

  if (sheetDesc) {
    sheetDesc.textContent = desc;
    sheetDesc.hidden = !desc;
  }

  if (sheetDateRow && sheetDate) {
    sheetDate.textContent = date;
    sheetDateRow.hidden = !date;
  }

  if (sheetRoleRow && sheetRole) {
    sheetRole.textContent = role;
    sheetRoleRow.hidden = !role;
  }

  if (sheetTechRow && sheetTechList) {
    sheetTechList.textContent = '';
    techItems.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'hero-lightbox__tech-item';

      const nameEl = document.createElement('span');
      nameEl.className = 'hero-lightbox__tech-name';
      nameEl.textContent = typeof item === 'string' ? item : item.name || '';
      li.appendChild(nameEl);

      if (typeof item === 'object' && item.detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'hero-lightbox__tech-detail';
        detailEl.textContent = item.detail;
        li.appendChild(detailEl);
      }

      sheetTechList.appendChild(li);
    });
    sheetTechRow.hidden = techItems.length === 0;
  }

  if (sheetLink) {
    if (url) {
      sheetLink.href = url;
      sheetLink.hidden = false;
    } else {
      sheetLink.removeAttribute('href');
      sheetLink.hidden = true;
    }
  }

  if (sheetMediaStack) {
    sheetMediaStack.textContent = '';
    slides.forEach((slide, index) => {
      const figure = document.createElement('figure');
      figure.className = 'hero-lightbox__shot';

      const img = document.createElement('img');
      img.className = 'hero-lightbox__shot-img';
      img.src = slide.src;
      img.alt =
        slide.label && slide.label !== title
          ? `${title} — ${slide.label}`
          : `${title} (${index + 1})`;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      figure.appendChild(img);

      if (slide.label) {
        const caption = document.createElement('figcaption');
        caption.className = 'hero-lightbox__shot-caption';
        const indexText = String(index + 1).padStart(2, '0');
        caption.textContent = `${indexText} / ${slide.label}`;
        figure.appendChild(caption);
      }

      sheetMediaStack.appendChild(figure);
    });
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
  if (currentMode !== 'collection') return;
  if (currentCollectionCards.length <= 1) return;
  activeCardIndex =
    (activeCardIndex + delta + currentCollectionCards.length) % currentCollectionCards.length;
  const nextCard = currentCollectionCards[activeCardIndex];
  currentSlides = getCardSlides(nextCard);
  activeSlideIndex = 0;
  applyLightboxMeta(nextCard);
  renderActiveSlide(true);
}

function openLightboxForCard(card, { cards = [], mode = 'slides', onOpen = null } = {}) {
  ensureDOMRefs();
  if (!lightbox) return;

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

  const isProjectSheet = mode === 'slides' && Boolean(lightboxSheet);
  lightbox.classList.toggle('is-project-sheet', isProjectSheet);
  lightbox.classList.toggle('is-collection-view', !isProjectSheet);

  if (isProjectSheet) {
    lightbox.setAttribute('aria-labelledby', 'hero-lightbox-sheet-title');
    if (lightboxFigure) lightboxFigure.hidden = true;
    lightboxSheet.hidden = false;
    populateProjectSheet(card, slides);
  } else {
    if (!lightboxImg) return;
    lightbox.setAttribute('aria-labelledby', 'hero-lightbox-title');
    if (lightboxSheet) lightboxSheet.hidden = true;
    if (lightboxFigure) lightboxFigure.hidden = false;

    cards.forEach((item) => {
      if (item === card) return;
      const itemImg = item.querySelector('img');
      if (itemImg) {
        const preload = new Image();
        preload.src = itemImg.currentSrc || itemImg.src;
      }
    });

    const showNav = cards.length > 1;
    if (lightboxPrev) lightboxPrev.hidden = !showNav;
    if (lightboxNext) lightboxNext.hidden = !showNav;

    applyLightboxMeta(card);
    renderActiveSlide(false);
  }

  lightbox.hidden = false;
  lightbox.scrollTop = 0;
  syncSheetHeaderScrollState();
  requestAnimationFrame(() => {
    lightbox.scrollTop = 0;
    syncSheetHeaderScrollState();
    lightbox.classList.add('is-open');
  });
  if (lightboxClose) {
    lightboxClose.focus({ preventScroll: true });
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
    lightbox.classList.remove('is-project-sheet', 'is-collection-view');
    if (lightboxImg) {
      lightboxImg.classList.remove('is-fading');
      lightboxImg.removeAttribute('src');
    }
    if (sheetHeader) {
      sheetHeader.classList.remove('has-bg');
    }
    if (sheetMediaStack) {
      sheetMediaStack.textContent = '';
    }
    if (sheetTechList) {
      sheetTechList.textContent = '';
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

  lightbox.addEventListener('scroll', syncSheetHeaderScrollState, { passive: true });

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
    if (event.target === lightbox || event.target === lightboxSheet) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (currentMode === 'collection' && event.key === 'ArrowLeft') {
      stepLightbox(-1);
    } else if (currentMode === 'collection' && event.key === 'ArrowRight') {
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
