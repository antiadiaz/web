/**
 * ANTIADIAZ.COM — PHASE 1: APPLICATION ENTRY POINT
 */

import { initNavigation } from './navigation.js';
import { initHero } from './hero.js';
import { initAbout } from './about.js';
import { initContact, initLegalModal } from './contact.js';
import { initWriting } from './writing.js';
import { initIllustration } from './illustration.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHero();
  initAbout();
  initContact();
  initLegalModal();
  initWriting();
  initIllustration();
});
