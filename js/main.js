/**
 * ANTIADIAZ.COM — PHASE 1: APPLICATION ENTRY POINT
 */

import { initNavigation } from './navigation.js';
import { initHero } from './hero.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHero();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }
});
