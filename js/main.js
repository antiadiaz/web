/**
 * ANTIADIAZ.COM — PHASE 1: APPLICATION ENTRY POINT
 */

import { initNavigation } from './navigation.js';
import { initHero } from './hero.js';
import { initContact, initLegalModal } from './contact.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHero();
  initContact();
  initLegalModal();
});
