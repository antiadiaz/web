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

  let activeSpace = SPACES.HOME;
  let activeSection = 'hero';
  let isMobileMenuOpen = false;
  let mobileMenuHideTimer = null;

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
    const isScrolled = activeSpace === SPACES.HOME && homeSpace.scrollTop > 48;
    siteHeader.classList.toggle('is-scrolled', isScrolled);
    if (headerMenu) {
      headerMenu.inert = !isScrolled;
      headerMenu.setAttribute('aria-hidden', String(!isScrolled));
    }
  }

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

    spaceButtons.forEach((button) => {
      const buttonSpace = button.getAttribute('data-nav-space');
      const isCurrent = buttonSpace === targetSpace;
      button.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    syncHeaderScrollState();
  }

  /**
   * Highlights the active HOME anchor link.
   */
  function syncAnchorState(sectionId) {
    activeSection = sectionId;
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
  function goToSpace(targetSpace, { updateHash = true } = {}) {
    if (!VALID_SPACES.has(targetSpace)) {
      return;
    }

    activeSpace = targetSpace;
    syncSpaceState(targetSpace);

    if (updateHash) {
      const nextHash =
        targetSpace === SPACES.HOME
          ? activeSection === 'hero'
            ? '#home'
            : `#${activeSection}`
          : `#${targetSpace}`;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', nextHash);
      }
    }
  }

  /**
   * Scrolls HOME vertically to a specific section ID.
   * If the user is currently in WRITING or ILLUSTRATION, returns to HOME first.
   */
  function goToHomeSection(sectionId, { smooth = true, updateHash = true } = {}) {
    const targetElement = document.getElementById(sectionId);
    if (!targetElement) {
      return;
    }

    if (activeSpace !== SPACES.HOME) {
      goToSpace(SPACES.HOME, { updateHash: false });
    }

    syncAnchorState(sectionId);

    targetElement.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    });

    if (updateHash) {
      const nextHash = `#${sectionId}`;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', nextHash);
      }
    }
  }

  homeSpace.addEventListener('scroll', syncHeaderScrollState, { passive: true });

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
        return;
      }
      goToSpace(targetSpace);
    });
  });

  /**
   * Handles clicks on HOME vertical anchor links.
   */
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setMobileMenuOpen(false);
      const targetSection = link.getAttribute('data-anchor-target');
      goToHomeSection(targetSection);
    });
  });

  /**
   * Tracks vertical scroll inside HOME to keep the active anchor indicator synchronized.
   */
  if ('IntersectionObserver' in window && sectionElements.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
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

  /**
   * Resolves an initial or changed URL hash to either a space or a HOME section.
   */
  function handleHashNavigation(smooth = false) {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();

    if (rawHash === SPACES.WRITING || rawHash === 'space-writing') {
      goToSpace(SPACES.WRITING, { updateHash: false });
      return;
    }

    if (rawHash === SPACES.ILLUSTRATION || rawHash === 'space-illustration') {
      goToSpace(SPACES.ILLUSTRATION, { updateHash: false });
      return;
    }

    if (HOME_SECTIONS.includes(rawHash)) {
      goToHomeSection(rawHash, { smooth, updateHash: false });
      return;
    }

    goToSpace(SPACES.HOME, { updateHash: false });
    syncAnchorState('hero');
  }

  window.addEventListener('hashchange', () => handleHashNavigation(true));

  // Initialize on HOME without overriding a direct deep-link hash if present
  handleHashNavigation(false);

  return {
    goToSpace,
    goToHomeSection,
    getActiveSpace: () => activeSpace,
  };
}
