/**
 * ANTIADIAZ.COM — PHASE 1: NAVIGATION CONTROLLER
 *
 * Manages:
 * 1. Horizontal space switching between WRITING (left), HOME (center), and ILLUSTRATION (right).
 * 2. Independent vertical anchor navigation inside HOME (HERO, ABOUT, CONTACT).
 * 3. Accessibility state (inert & aria-current) so off-screen spaces cannot steal keyboard focus.
 */

export const SPACES = Object.freeze({
  WRITING: 'writing',
  HOME: 'home',
  ILLUSTRATION: 'illustration',
});

const VALID_SPACES = new Set(Object.values(SPACES));
const HOME_SECTIONS = ['hero', 'about', 'contact'];
const SPACE_TITLES = Object.freeze({
  [SPACES.WRITING]: 'Antía Díaz — Writing',
  [SPACES.HOME]: 'Antía Díaz — Developer & Product Designer',
  [SPACES.ILLUSTRATION]: 'Antía Díaz — Editorial Illustration & Character Design',
});

function detectBasePath(pathname = window.location.pathname) {
  const cleaned = pathname
    .replace(/\/(writing|illustration)(?:\.html)?\/?$/i, '/')
    .replace(/\/index\.html$/i, '/');
  return cleaned.endsWith('/') ? cleaned : `${cleaned}/`;
}

export function initNavigation() {
  const track = document.getElementById('spaces-track');
  const homeSpace = document.getElementById('space-home');
  const spaceElements = {
    [SPACES.WRITING]: document.getElementById('space-writing'),
    [SPACES.HOME]: homeSpace,
    [SPACES.ILLUSTRATION]: document.getElementById('space-illustration'),
  };

  if (!track || !homeSpace) {
    return null;
  }

  const siteHeader = document.getElementById('site-header');
  const headerMenu = document.getElementById('site-header-menu');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const mobileBackdrop = document.getElementById('mobile-menu-backdrop');
  const spaceButtons = Array.from(document.querySelectorAll('[data-nav-space]'));
  const anchorLinks = Array.from(document.querySelectorAll('[data-anchor-target]'));
  const sectionElements = HOME_SECTIONS.map((id) => document.getElementById(id)).filter(
    Boolean
  );

  const basePath = detectBasePath();
  let activeSpace = SPACES.HOME;
  let activeSection = 'hero';
  let isMobileMenuOpen = false;
  let mobileMenuHideTimer = null;

  function buildSpaceUrl(targetSpace, hash = '') {
    const cleanHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
    if (targetSpace === SPACES.WRITING) {
      return `${basePath}writing${cleanHash}`;
    }
    if (targetSpace === SPACES.ILLUSTRATION) {
      return `${basePath}illustration${cleanHash}`;
    }
    return `${basePath}${cleanHash}`;
  }

  function setMobileMenuOpen(open) {
    if (!mobileToggle || !mobileDrawer || !mobileBackdrop) return;
    if (isMobileMenuOpen === open) return;

    isMobileMenuOpen = open;
    if (mobileMenuHideTimer !== null) {
      window.clearTimeout(mobileMenuHideTimer);
      mobileMenuHideTimer = null;
    }

    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute(
      'aria-label',
      open ? 'Close navigation menu' : 'Open navigation menu'
    );
    mobileDrawer.setAttribute('aria-hidden', String(!open));
    if (siteHeader) {
      siteHeader.classList.toggle('is-menu-open', open);
    }

    if (open) {
      mobileDrawer.hidden = false;
      mobileBackdrop.hidden = false;
      requestAnimationFrame(() => {
        mobileDrawer.classList.add('is-open');
      });
    } else {
      mobileDrawer.classList.remove('is-open');
      mobileBackdrop.hidden = true;
      mobileMenuHideTimer = window.setTimeout(() => {
        mobileMenuHideTimer = null;
        if (!isMobileMenuOpen) {
          mobileDrawer.hidden = true;
        }
      }, 540);
    }
  }

  function syncHeaderScrollState() {
    if (!siteHeader) return;
    const activeSpaceEl = spaceElements[activeSpace];
    const scrollTop = activeSpaceEl ? activeSpaceEl.scrollTop : 0;
    const hasBg = scrollTop > 24;
    const isScrollMenuSpace =
      activeSpace === SPACES.HOME || activeSpace === SPACES.ILLUSTRATION;
    const isScrolled = isScrollMenuSpace && scrollTop > 48;

    siteHeader.classList.toggle('has-bg', hasBg);
    siteHeader.classList.toggle('is-scrolled', isScrolled);
    if (headerMenu) {
      headerMenu.inert = !isScrolled;
      headerMenu.setAttribute('aria-hidden', String(!isScrolled));
    }
  }

  const contextNavSlots = Array.from(
    document.querySelectorAll('[data-nav-context-slot="illustration-home"]')
  );

  /**
   * Updates header active button states and marks inactive off-screen spaces as inert.
   */
  function syncSpaceState(targetSpace) {
    track.setAttribute('data-active-space', targetSpace);

    Object.entries(spaceElements).forEach(([spaceName, element]) => {
      if (!element) return;
      const isCurrent = spaceName === targetSpace;
      element.inert = !isCurrent;
      element.setAttribute('aria-hidden', String(!isCurrent));
    });

    contextNavSlots.forEach((button) => {
      if (targetSpace === SPACES.ILLUSTRATION) {
        button.textContent = 'Dev & Design';
        button.setAttribute('data-nav-space', SPACES.HOME);
        button.setAttribute('aria-controls', 'space-home');
      } else {
        button.textContent = 'Illustration';
        button.setAttribute('data-nav-space', SPACES.ILLUSTRATION);
        button.setAttribute('aria-controls', 'space-illustration');
      }
    });

    spaceButtons.forEach((button) => {
      const buttonSpace = button.getAttribute('data-nav-space');
      const isCurrent =
        buttonSpace === targetSpace &&
        !(targetSpace === SPACES.ILLUSTRATION && button.hasAttribute('data-nav-context-slot'));
      button.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    [SPACES.WRITING, SPACES.ILLUSTRATION].forEach((spaceKey) => {
      const spaceEl = spaceElements[spaceKey];
      if (!spaceEl) return;
      if (targetSpace === spaceKey) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            spaceEl.classList.add('is-entered');
          });
        });
      } else {
        spaceEl.classList.remove('is-entered');
      }
    });

    if (targetSpace === SPACES.HOME) {
      syncAnchorState(activeSection);
    } else if (targetSpace === SPACES.ILLUSTRATION) {
      syncAnchorState(activeIllustrationSection);
    } else {
      syncAnchorState('');
    }

    if (SPACE_TITLES[targetSpace]) {
      document.title = SPACE_TITLES[targetSpace];
    }

    syncHeaderScrollState();
  }

  let activeIllustrationSection = '';

  /**
   * Highlights the active vertical anchor link (About me / Contact).
   */
  function syncAnchorState(sectionId) {
    if (activeSpace === SPACES.HOME && sectionId) {
      activeSection = sectionId;
    } else if (activeSpace === SPACES.ILLUSTRATION) {
      activeIllustrationSection = sectionId;
    }

    anchorLinks.forEach((link) => {
      const isCurrent = link.getAttribute('data-anchor-target') === sectionId;
      link.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Moves horizontally to the requested space ('writing', 'home', or 'illustration').
   */
  function goToSpace(targetSpace, { updateUrl = true, replace = false } = {}) {
    if (!VALID_SPACES.has(targetSpace)) {
      return;
    }

    activeSpace = targetSpace;
    syncSpaceState(targetSpace);

    if (updateUrl) {
      const nextHash =
        targetSpace === SPACES.HOME && activeSection !== 'hero'
          ? `#${activeSection}`
          : '';
      const nextUrl = buildSpaceUrl(targetSpace, nextHash);
      const currentUrl = `${window.location.pathname}${window.location.hash}`;
      if (currentUrl !== nextUrl) {
        if (replace) {
          history.replaceState(null, '', nextUrl);
        } else {
          history.pushState(null, '', nextUrl);
        }
      }
    }
  }

  /**
   * Scrolls HOME vertically to a specific section ID.
   * If the user is currently in WRITING or ILLUSTRATION, returns to HOME first.
   */
  function goToHomeSection(sectionId, { smooth = true, updateUrl = true } = {}) {
    const targetElement = document.getElementById(sectionId);
    if (!targetElement) {
      return;
    }

    const wasInOtherSpace = activeSpace !== SPACES.HOME;
    if (wasInOtherSpace) {
      goToSpace(SPACES.HOME, { updateUrl: false });
    }

    syncAnchorState(sectionId);

    targetElement.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    });

    if (updateUrl) {
      const nextHash = sectionId === 'hero' ? '' : `#${sectionId}`;
      const nextUrl = buildSpaceUrl(SPACES.HOME, nextHash);
      const currentUrl = `${window.location.pathname}${window.location.hash}`;
      if (currentUrl !== nextUrl) {
        if (wasInOtherSpace) {
          history.pushState(null, '', nextUrl);
        } else {
          history.replaceState(null, '', nextUrl);
        }
      }
    }
  }

  Object.values(spaceElements).forEach((spaceEl) => {
    if (spaceEl) {
      spaceEl.addEventListener('scroll', syncHeaderScrollState, { passive: true });
    }
  });

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      setMobileMenuOpen(!isMobileMenuOpen);
    });
  }

  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', () => {
      setMobileMenuOpen(false);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMobileMenuOpen) {
      setMobileMenuOpen(false);
      if (mobileToggle) mobileToggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  });

  function goToIllustrationSection(sectionKey, { smooth = true } = {}) {
    const illustrationSpace = spaceElements[SPACES.ILLUSTRATION];
    const sectionMap = {
      about: 'illustration-about',
      contact: 'illustration-contact',
    };
    const targetId = sectionMap[sectionKey];
    const targetElement = targetId ? document.getElementById(targetId) : null;
    if (!illustrationSpace || !targetElement) {
      goToHomeSection(sectionKey, { smooth });
      return;
    }

    syncAnchorState(sectionKey);
    targetElement.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    });
  }

  /**
   * Handles clicks on header navigation items and in-space return buttons.
   */
  spaceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMobileMenuOpen(false);
      const targetSpace = button.getAttribute('data-nav-space');
      if (
        targetSpace === SPACES.HOME &&
        activeSpace === SPACES.HOME &&
        button.classList.contains('site-nav__brand')
      ) {
        homeSpace.scrollTo({ top: 0, behavior: 'smooth' });
        syncAnchorState('hero');
        const heroUrl = buildSpaceUrl(SPACES.HOME);
        if (`${window.location.pathname}${window.location.hash}` !== heroUrl) {
          history.replaceState(null, '', heroUrl);
        }
        return;
      }
      if (
        targetSpace === SPACES.ILLUSTRATION &&
        activeSpace === SPACES.ILLUSTRATION
      ) {
        const illustrationSpace = spaceElements[SPACES.ILLUSTRATION];
        if (illustrationSpace) {
          illustrationSpace.scrollTo({ top: 0, behavior: 'smooth' });
          syncAnchorState('');
        }
        return;
      }
      goToSpace(targetSpace);
    });
  });

  /**
   * Handles clicks on vertical anchor links (About me / Contact).
   */
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setMobileMenuOpen(false);
      const targetSection = link.getAttribute('data-anchor-target');
      if (activeSpace === SPACES.ILLUSTRATION) {
        goToIllustrationSection(targetSection);
        return;
      }
      goToHomeSection(targetSection);
    });
  });

  /**
   * Tracks vertical scroll inside HOME & ILLUSTRATION to synchronize anchor highlights.
   */
  if ('IntersectionObserver' in window && sectionElements.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (activeSpace !== SPACES.HOME) return;
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry && visibleEntry.target.id) {
          syncAnchorState(visibleEntry.target.id);
        }
      },
      {
        root: homeSpace,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.1, 0.4, 0.7],
      }
    );

    sectionElements.forEach((section) => observer.observe(section));
  }

  const illustrationSpace = spaceElements[SPACES.ILLUSTRATION];
  if ('IntersectionObserver' in window && illustrationSpace) {
    const illusTargets = [
      document.getElementById('illustration-masonry-section'),
      document.getElementById('illustration-about'),
      document.getElementById('illustration-contact'),
    ].filter(Boolean);

    if (illusTargets.length > 0) {
      const illusObserver = new IntersectionObserver(
        (entries) => {
          if (activeSpace !== SPACES.ILLUSTRATION) return;
          const visibleEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

          if (!visibleEntry) return;
          if (visibleEntry.target.id === 'illustration-about') {
            syncAnchorState('about');
          } else if (visibleEntry.target.id === 'illustration-contact') {
            syncAnchorState('contact');
          } else {
            syncAnchorState('');
          }
        },
        {
          root: illustrationSpace,
          rootMargin: '-20% 0px -50% 0px',
          threshold: [0.1, 0.35, 0.65],
        }
      );

      illusTargets.forEach((el) => illusObserver.observe(el));
    }
  }

  /**
   * Resolves an initial, popstate, or hash URL to the corresponding space or section.
   */
  function handleUrlNavigation(smooth = false, { fromPopState = false } = {}) {
    const cleanPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    const rawHash = window.location.hash.replace('#', '').toLowerCase();

    if (cleanPath.endsWith('/writing') || cleanPath.endsWith('/writing.html')) {
      goToSpace(SPACES.WRITING, { updateUrl: false });
      const canonical = buildSpaceUrl(SPACES.WRITING);
      if (!fromPopState && `${window.location.pathname}${window.location.hash}` !== canonical) {
        history.replaceState(null, '', canonical);
      }
      return;
    }

    if (cleanPath.endsWith('/illustration') || cleanPath.endsWith('/illustration.html')) {
      goToSpace(SPACES.ILLUSTRATION, { updateUrl: false });
      if (rawHash === 'about' || rawHash === 'illustration-about') {
        goToIllustrationSection('about', { smooth });
      } else if (rawHash === 'contact' || rawHash === 'illustration-contact') {
        goToIllustrationSection('contact', { smooth });
      } else {
        const canonical = buildSpaceUrl(SPACES.ILLUSTRATION);
        if (!fromPopState && `${window.location.pathname}${window.location.hash}` !== canonical) {
          history.replaceState(null, '', canonical);
        }
      }
      return;
    }

    if (rawHash === SPACES.WRITING || rawHash === 'space-writing') {
      goToSpace(SPACES.WRITING, { updateUrl: !fromPopState, replace: true });
      return;
    }

    if (rawHash === SPACES.ILLUSTRATION || rawHash === 'space-illustration') {
      goToSpace(SPACES.ILLUSTRATION, { updateUrl: !fromPopState, replace: true });
      return;
    }

    if (HOME_SECTIONS.includes(rawHash)) {
      goToHomeSection(rawHash, { smooth, updateUrl: false });
      return;
    }

    goToSpace(SPACES.HOME, { updateUrl: false });
    syncAnchorState('hero');
  }

  window.addEventListener('popstate', () => handleUrlNavigation(true, { fromPopState: true }));
  window.addEventListener('hashchange', () => handleUrlNavigation(true));

  // Initialize from current pathname/hash without overriding valid deep links
  handleUrlNavigation(false);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.classList.remove('is-instant');
    });
  });

  return {
    goToSpace,
    goToHomeSection,
    getActiveSpace: () => activeSpace,
  };
}
