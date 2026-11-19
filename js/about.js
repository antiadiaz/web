/**
 * ANTIADIAZ.COM — ABOUT SECTION MOBILE ACCORDIONS
 * On mobile viewports (<= 768px), the 4 capability sections behave as
 * collapsible accordions while staying permanently expanded on desktop/tablet.
 */

export function initAbout() {
  const rolesContainers = Array.from(document.querySelectorAll('.about-roles'));
  if (rolesContainers.length === 0) {
    return;
  }

  const roles = rolesContainers.flatMap((container) =>
    Array.from(container.querySelectorAll('.about-role'))
  );
  if (roles.length === 0) {
    return;
  }

  const mobileQuery = window.matchMedia('(max-width: 768px)');

  function syncViewportMode() {
    const isMobile = mobileQuery.matches;

    roles.forEach((role) => {
      const trigger = role.querySelector('.about-role__trigger');
      const panel = role.querySelector('.about-role__panel');
      if (!trigger || !panel) return;

      if (isMobile) {
        trigger.disabled = false;
        trigger.removeAttribute('tabindex');
        const isOpen = role.classList.contains('is-open');
        trigger.setAttribute('aria-expanded', String(isOpen));
        panel.setAttribute('aria-hidden', String(!isOpen));
      } else {
        trigger.disabled = true;
        trigger.setAttribute('tabindex', '-1');
        trigger.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');
      }
    });
  }

  roles.forEach((role) => {
    const trigger = role.querySelector('.about-role__trigger');
    const panel = role.querySelector('.about-role__panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => {
      if (!mobileQuery.matches) {
        return;
      }

      const nextOpen = !role.classList.contains('is-open');
      role.classList.toggle('is-open', nextOpen);
      trigger.setAttribute('aria-expanded', String(nextOpen));
      panel.setAttribute('aria-hidden', String(!nextOpen));
    });
  });

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', syncViewportMode);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(syncViewportMode);
  }

  syncViewportMode();
}
