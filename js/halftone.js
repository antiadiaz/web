/**
 * ANTIADIAZ.COM — ORGANIC STOCHASTIC HALFTONE BACKGROUND
 * Renders a crisp B&W photographic stipple grain on a <canvas> while preserving
 * a smooth exclusion zone around all typography and interactive controls.
 * Particles smoothly scatter away from the cursor and spring back to rest.
 */

const ALPHA_BUCKETS = 24;
const ALPHA_STYLES = Array.from({ length: ALPHA_BUCKETS }, (_, i) => {
  const alpha = 0.07 + (i / (ALPHA_BUCKETS - 1)) * 0.84;
  return `rgba(17, 17, 17, ${alpha.toFixed(3)})`;
});

function hash2(ix, iy) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y) {
  return (
    valueNoise(x, y) * 0.56 +
    valueNoise(x * 2.13 + 11.7, y * 2.13 + 5.3) * 0.29 +
    valueNoise(x * 4.41 + 27.1, y * 4.41 + 19.8) * 0.15
  );
}

function rectDistance(x, y, rect, pad) {
  const dx = Math.max(rect.left - pad - x, 0, x - (rect.right + pad));
  const dy = Math.max(rect.top - pad - y, 0, y - (rect.bottom + pad));
  return Math.hypot(dx, dy);
}

export function initSectionHalftone({
  section,
  canvas,
  variant = 'contact',
  protectedSelectors = [],
}) {
  if (!section || !canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const homeSpace = document.getElementById('space-home');

  let canvasWidth = 0;
  let canvasHeight = 0;
  let buckets = Array.from({ length: ALPHA_BUCKETS }, () => []);
  let dotCount = 0;

  // Flat typed arrays for fast zero-GC simulation
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let dotSize = new Float32Array(0);
  let mobility = new Float32Array(0);
  let reachScale = new Float32Array(0);
  let cosJitter = new Float32Array(0);
  let sinJitter = new Float32Array(0);

  let pointerClientX = 0;
  let pointerClientY = 0;
  let lastPointerClientX = 0;
  let lastPointerClientY = 0;
  let pointerVx = 0;
  let pointerVy = 0;
  let pointerActive = false;
  let rafId = null;

  function buildParticles() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    canvasWidth = width;
    canvasHeight = height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const canvasRect = canvas.getBoundingClientRect();
    const sectionStyle = window.getComputedStyle(section);
    const paddingTop = parseFloat(sectionStyle.paddingTop) || 72;

    const protectedRects = protectedSelectors
      .map((selector) => section.querySelector(selector))
      .filter(Boolean)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - canvasRect.left,
          top: r.top - canvasRect.top,
          right: r.right - canvasRect.left,
          bottom: r.bottom - canvasRect.top,
        };
      });

    const isMobile = width <= 768;
    const step = isMobile ? 2.2 : 1.95;
    const cols = Math.ceil(width / step);
    const rows = Math.ceil(height / step);

    const pad = isMobile ? 22 : variant === 'hero-top' ? 32 : 28;
    const feather = variant === 'hero-top' ? 54 : 46;

    const collectedX = [];
    const collectedY = [];
    const collectedSize = [];
    const collectedBucket = [];
    const collectedMobility = [];
    const collectedReach = [];
    const collectedCos = [];
    const collectedSin = [];

    for (let row = 0; row < rows; row += 1) {
      const ry = row * step;
      const ny = ry / height;

      if (variant === 'contact') {
        const inTopBand = ry < Math.max(paddingTop * 1.4, height * 0.28);
        const inBottomRegion = ny > 0.24;
        if (!inTopBand && !inBottomRegion) {
          continue;
        }
      } else if (variant === 'hero-top' && ny > 0.84) {
        continue;
      }

      for (let col = 0; col < cols; col += 1) {
        const rx = col * step;
        const nx = rx / width;

        let baseDensity = 0;
        let radialFade = 1;

        if (variant === 'contact') {
          // 1A. Bottom-left corner: same organic halftone grain & dispersion as the Hero block
          if (ny > 0.24 && nx < 0.56) {
            const cornerProx = Math.max(0, 1 - Math.hypot(nx * 2.08, (1 - ny) * 1.65));
            const cloud = fbm(nx * 5.4 + 1.4, (1 - ny) * 4.8 + 2.7);
            const cloudMask = smoothstep(0.12, 0.65, cloud);
            const blDensity =
              Math.pow(cornerProx, 1.05) * (0.28 + cloudMask * 0.88) * (isMobile ? 0.62 : 0.94);

            if (blDensity > baseDensity) {
              baseDensity = blDensity;
              radialFade = Math.max(0.28, Math.min(1, cornerProx * 1.25));
            }
          }

          // 1B. Top-left padding area noise (slightly more pronounced while respecting headings)
          if (ry < paddingTop * 1.28 && nx < 0.58) {
            const topFade = Math.max(0, 1 - ry / (paddingTop * 1.22));
            const leftSweep = Math.max(0, 1 - nx / 0.58);
            const topCloud = fbm(nx * 5.8 + 7.2, ny * 6.8 + 3.9);
            const topMask = smoothstep(0.14, 0.66, topCloud);
            const wisp =
              Math.pow(topFade, 1.05) *
              Math.pow(leftSweep, 0.72) *
              (0.25 + topMask * 0.82) *
              (isMobile ? 0.48 : 0.68);
            if (wisp > baseDensity) {
              baseDensity = wisp;
              radialFade = Math.max(0.3, Math.min(0.92, 0.34 + topFade * leftSweep * 0.62));
            }
          }

          // 1C. Subtle noise accent in the top-right corner of the Contact block
          if (ny < 0.28 && nx > 0.62) {
            const topRightProx = Math.max(0, 1 - Math.hypot((1 - nx) * 2.75, ny * 3.2));
            const trCloud = fbm(nx * 5.4 + 9.4, ny * 5.2 + 2.3);
            const trMask = smoothstep(0.14, 0.66, trCloud);
            const trDensity =
              Math.pow(topRightProx, 1.25) * (0.26 + trMask * 0.82) * (isMobile ? 0.34 : 0.54);
            if (trDensity > baseDensity) {
              baseDensity = trDensity;
              radialFade = Math.max(0.22, Math.min(0.86, topRightProx));
            }
          }
        } else if (variant === 'hero-top' && nx > 0.44) {
          // Stronger organic halftone trace strictly in the top-right corner of the Hero block
          const cornerProx = Math.max(0, 1 - Math.hypot((1 - nx) * 2.08, ny * 1.48));
          const cloud = fbm(nx * 5.4 + 4.3, ny * 4.8 + 2.1);
          const cloudMask = smoothstep(0.12, 0.65, cloud);
          baseDensity =
            Math.pow(cornerProx, 1.05) * (0.28 + cloudMask * 0.88) * (isMobile ? 0.62 : 0.94);
          radialFade = Math.max(0.28, Math.min(1, cornerProx * 1.25));
        }

        if (baseDensity <= 0.015) {
          continue;
        }

        // Smoothly suppress density around all protected text & interactive elements
        let clearance = 1;
        for (let i = 0; i < protectedRects.length; i += 1) {
          const dist = rectDistance(rx, ry, protectedRects[i], pad);
          if (dist <= 0) {
            clearance = 0;
            break;
          }
          if (dist < feather) {
            clearance = Math.min(clearance, smoothstep(0, feather, dist));
          }
        }

        const density = Math.min(0.94, baseDensity * clearance);
        if (density <= 0.015) {
          continue;
        }

        const jitterX = (hash2(col + 17, row + 31) - 0.5) * step * 1.25;
        const jitterY = (hash2(col + 71, row + 97) - 0.5) * step * 1.25;
        const threshold = hash2(col + 193, row + 389);

        if (threshold < density) {
          const tone = Math.pow(radialFade, 1.3) * (0.35 + density * 0.65);
          const bucket = Math.max(
            0,
            Math.min(ALPHA_BUCKETS - 1, Math.round(tone * (ALPHA_BUCKETS - 1)))
          );
          const size = 0.6 + hash2(col + 409, row + 613) * (0.32 + tone * 0.98);
          const dotMob = 0.14 + Math.pow(hash2(col + 733, row + 911), 1.35) * 1.02;
          const reach = 0.52 + hash2(col + 811, row + 1013) * 0.96;
          const angle = (hash2(col + 1213, row + 1409) - 0.5) * 1.65;

          collectedX.push(rx + jitterX);
          collectedY.push(ry + jitterY);
          collectedSize.push(size);
          collectedBucket.push(bucket);
          collectedMobility.push(dotMob);
          collectedReach.push(reach);
          collectedCos.push(Math.cos(angle));
          collectedSin.push(Math.sin(angle));
        }
      }
    }

    dotCount = collectedX.length;
    hx = new Float32Array(collectedX);
    hy = new Float32Array(collectedY);
    px = new Float32Array(collectedX);
    py = new Float32Array(collectedY);
    vx = new Float32Array(dotCount);
    vy = new Float32Array(dotCount);
    dotSize = new Float32Array(collectedSize);
    mobility = new Float32Array(collectedMobility);
    reachScale = new Float32Array(collectedReach);
    cosJitter = new Float32Array(collectedCos);
    sinJitter = new Float32Array(collectedSin);

    buckets = Array.from({ length: ALPHA_BUCKETS }, () => []);
    for (let i = 0; i < dotCount; i += 1) {
      buckets[collectedBucket[i]].push(i);
    }

    drawParticles();
  }

  function drawParticles() {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let b = 0; b < ALPHA_BUCKETS; b += 1) {
      const indices = buckets[b];
      if (indices.length === 0) continue;

      ctx.fillStyle = ALPHA_STYLES[b];
      for (let k = 0; k < indices.length; k += 1) {
        const i = indices[k];
        const s = dotSize[i];
        ctx.fillRect(px[i], py[i], s, s);
      }
    }
  }

  function stepFrame() {
    rafId = null;
    if (dotCount === 0 || reducedMotionQuery.matches) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const baseRadius = canvasWidth <= 768 ? 72 : 96;
    const maxRadius = baseRadius * 1.48;
    const maxRadiusSq = maxRadius * maxRadius;
    const margin = maxRadius + 36;

    let localMouseX = -9999;
    let localMouseY = -9999;
    let cursorNearCanvas = false;

    if (pointerActive && rect.width > 0 && rect.height > 0) {
      localMouseX = pointerClientX - rect.left;
      localMouseY = pointerClientY - rect.top;
      cursorNearCanvas =
        localMouseX >= -margin &&
        localMouseX <= rect.width + margin &&
        localMouseY >= -margin &&
        localMouseY <= rect.height + margin;
    }

    // Decay pointer sweep velocity smoothly
    pointerVx *= 0.72;
    pointerVy *= 0.72;

    const springK = 0.036;
    const damping = 0.88;
    const maxDisp = 28;
    const maxDispSq = maxDisp * maxDisp;
    let stillMoving = false;

    for (let i = 0; i < dotCount; i += 1) {
      let x = px[i];
      let y = py[i];
      let velX = vx[i];
      let velY = vy[i];
      const homeX = hx[i];
      const homeY = hy[i];

      if (cursorNearCanvas) {
        const dx = x - localMouseX;
        const dy = y - localMouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxRadiusSq) {
          const personalRadius = baseRadius * reachScale[i];
          if (distSq < personalRadius * personalRadius) {
            const dist = Math.sqrt(distSq) || 0.5;
            const falloff = 1 - dist / personalRadius;
            const force = falloff * falloff * 1.45 * mobility[i];

            const ux = dx / dist;
            const uy = dy / dist;
            const c = cosJitter[i];
            const s = sinJitter[i];
            const dirX = ux * c - uy * s;
            const dirY = ux * s + uy * c;

            velX += dirX * force + pointerVx * falloff * 0.075 * mobility[i];
            velY += dirY * force + pointerVy * falloff * 0.075 * mobility[i];
          }
        }
      }

      // Gentle elastic return toward halftone home position
      velX = (velX + (homeX - x) * springK) * damping;
      velY = (velY + (homeY - y) * springK) * damping;

      x += velX;
      y += velY;

      // Softly clamp maximum scatter distance so dots stay airy and natural
      const offX = x - homeX;
      const offY = y - homeY;
      const offSq = offX * offX + offY * offY;
      if (offSq > maxDispSq) {
        const scale = maxDisp / Math.sqrt(offSq);
        x = homeX + offX * scale;
        y = homeY + offY * scale;
        velX *= 0.7;
        velY *= 0.7;
      }

      if (
        Math.abs(offX) > 0.06 ||
        Math.abs(offY) > 0.06 ||
        Math.abs(velX) > 0.03 ||
        Math.abs(velY) > 0.03
      ) {
        stillMoving = true;
      } else {
        x = homeX;
        y = homeY;
        velX = 0;
        velY = 0;
      }

      px[i] = x;
      py[i] = y;
      vx[i] = velX;
      vy[i] = velY;
    }

    drawParticles();

    if (stillMoving || cursorNearCanvas) {
      rafId = requestAnimationFrame(stepFrame);
    }
  }

  function wakeAnimation() {
    if (reducedMotionQuery.matches || rafId !== null) {
      return;
    }
    rafId = requestAnimationFrame(stepFrame);
  }

  function handlePointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return;
    }

    if (pointerActive) {
      pointerVx = Math.max(-24, Math.min(24, event.clientX - lastPointerClientX));
      pointerVy = Math.max(-24, Math.min(24, event.clientY - lastPointerClientY));
    }

    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    lastPointerClientX = event.clientX;
    lastPointerClientY = event.clientY;
    pointerActive = true;

    const rect = canvas.getBoundingClientRect();
    const margin = 150;
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      pointerClientX >= rect.left - margin &&
      pointerClientX <= rect.right + margin &&
      pointerClientY >= rect.top - margin &&
      pointerClientY <= rect.bottom + margin
    ) {
      wakeAnimation();
    }
  }

  function handlePointerLeave() {
    pointerActive = false;
    pointerVx = 0;
    pointerVy = 0;
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('mouseleave', handlePointerLeave);
  window.addEventListener('blur', handlePointerLeave);

  if (homeSpace) {
    homeSpace.addEventListener(
      'scroll',
      () => {
        if (pointerActive) {
          wakeAnimation();
        }
      },
      { passive: true }
    );
  }

  let resizeTimer = null;
  function scheduleRebuild() {
    if (resizeTimer !== null) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      requestAnimationFrame(buildParticles);
    }, 60);
  }

  requestAnimationFrame(buildParticles);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(buildParticles));
  }
  window.addEventListener('resize', scheduleRebuild);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleRebuild);
    observer.observe(section);
  }
}
