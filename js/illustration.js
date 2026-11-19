/**
 * ANTIADIAZ.COM — ILLUSTRATION SPACE (INVERTED HOME AESTHETIC)
 * Initializes the white top-left interactive halftone grain on black ground.
 */

import { initSectionHalftone } from './halftone.js';

export function initIllustration() {
  const illustrationSpace = document.getElementById('space-illustration');
  const canvas = document.getElementById('illustration-halftone');
  if (!illustrationSpace || !canvas) {
    return;
  }

  initSectionHalftone({
    section: illustrationSpace,
    canvas,
    variant: 'illustration-top-left',
    rgb: '255, 255, 255',
    protectedSelectors: [
      '.illustration-headline',
      '.illustration-back-link',
    ],
  });
}
