/**
 * ANTIADIAZ.COM — PHASE 1: NAVIGATION CONTROLLER
 *
 * Manages:
 * 1. Horizontal space switching between WRITING (left), HOME (center), and ILLUSTRATION (right).
 * 2. Independent vertical anchor navigation inside HOME (HERO, CONTACT).
 * 3. Accessibility state (inert & aria-current) so off-screen spaces cannot steal keyboard focus.
 */

export const SPACES = Object.freeze({
  WRITING: 'writing',
  HOME: 'home',
  ILLUSTRATION: 'illustration',
});

const VALID_SPACES = new Set(Object.values(SPACES));
const HOME_SECTIONS = ['hero', 'contact'];

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

  const spaceButtons = Array.from(document.querySelectorAll('[data-nav-space]'));
  const anchorLinks = Array.from(document.querySelectorAll('[data-anchor-target]'));
  const sectionElements = HOME_SECTIONS.map((id) => document.getElementById(id)).filter(
    Boolean
  );

  let activeSpace = SPACES.HOME;
  let activeSection = 'hero';

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

  /**
   * Handles clicks on header navigation items and in-space return buttons.
   */
  spaceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetSpace = button.getAttribute('data-nav-space');
      goToSpace(targetSpace);
    });
  });

  /**
   * Handles clicks on HOME vertical anchor links.
   */
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
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
