/**
 * ANTIADIAZ.COM — WRITING SPACE (HOME AESTHETIC)
 * Initializes the interactive top-right halftone grain on warm paper ground.
 */

import { initSectionHalftone } from './halftone.js';

export function initWriting() {
  const writingSpace = document.getElementById('space-writing');
  const canvas = document.getElementById('writing-halftone');
  if (!writingSpace || !canvas) {
    return;
  }

  initSectionHalftone({
    section: writingSpace,
    canvas,
    variant: 'hero-top',
    rgb: '17, 17, 17',
    protectedSelectors: [
      '.writing-headline',
      '.writing-back-link',
    ],
  });
}
