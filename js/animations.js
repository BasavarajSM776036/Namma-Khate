/**
 * Premium Animations Engine — Mahalingeshwar Kirani Store
 * Counter animations, ripple effects, particle header, animated chart
 */

// ─── Number Counter Animation ──────────────────────────────────

export function animateNumber(element, fromVal, toVal, duration = 700, prefix = '₹', suffix = '') {
  if (!element) return;
  const start = performance.now();
  const diff = toVal - fromVal;

  function step(now) {
    const elapsed = Math.min(now - start, duration);
    const progress = easeOutExpo(elapsed / duration);
    const current = fromVal + diff * progress;

    // Format with Indian commas
    const formatted = Math.abs(current).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    element.textContent = `${current < 0 ? '-' : ''}${prefix}${formatted}${suffix}`;

    if (elapsed < duration) requestAnimationFrame(step);
    else element.textContent = `${toVal < 0 ? '-' : ''}${prefix}${Math.abs(toVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  }

  requestAnimationFrame(step);
}

export function animateInt(element, fromVal, toVal, duration = 600) {
  if (!element) return;
  const start = performance.now();
  const diff = toVal - fromVal;
  function step(now) {
    const elapsed = Math.min(now - start, duration);
    const progress = easeOutExpo(elapsed / duration);
    element.textContent = Math.round(fromVal + diff * progress);
    if (elapsed < duration) requestAnimationFrame(step);
    else element.textContent = toVal;
  }
  requestAnimationFrame(step);
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ─── Ripple Effect on tap ──────────────────────────────────────

export function addRippleEffect(element) {
  element.addEventListener('pointerdown', function(e) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: 0; height: 0;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      transform: translate(-50%, -50%);
      left: ${x}px; top: ${y}px;
      pointer-events: none;
      animation: rippleExpand 0.5s ease-out forwards;
    `;
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 520);
  });
}

// Inject ripple CSS once
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleExpand {
    to { width: 300px; height: 300px; opacity: 0; }
  }
`;
document.head.appendChild(rippleStyle);

// ─── Particle System for Dashboard Header ─────────────────────

export function initHeaderParticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0.6;
  `;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const PARTICLE_COUNT = 18;
  const EMOJIS = ['🌾', '🫙', '🧂', '⭐', '✨', '•', '·'];

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  resize();

  // Create particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 6 + 4,
      opacity: Math.random() * 0.4 + 0.1,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      isEmoji: Math.random() > 0.7,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
      if (p.y < -20) p.y = canvas.height + 20;
      if (p.y > canvas.height + 20) p.y = -20;

      ctx.save();
      ctx.globalAlpha = p.opacity;

      if (p.isEmoji) {
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,184,48,0.7)';
        ctx.fill();
      }
      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  draw();
  window.addEventListener('resize', resize);
}

// ─── Animated Bar Chart for Profit ────────────────────────────

export function drawAnimatedBars(canvasId, collection, purchase, lang = 'en') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Set canvas to actual pixel size
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const max = Math.max(collection, purchase, 1);
  const barW = Math.min(60, W * 0.2);
  const totalW = barW * 2 + 40;
  const startX = (W - totalW) / 2;
  const maxBarH = H - 55;
  const bottomY = H - 30;

  const labels = lang === 'kn'
    ? ['ಸಂಗ್ರಹ', 'ಖರೀದಿ']
    : ['Collection', 'Purchase'];

  const colors = [
    { fill: '#1E8A3C', glow: 'rgba(30,138,60,0.4)' },
    { fill: '#FF6B2C', glow: 'rgba(255,107,44,0.4)' }
  ];
  const values = [collection, purchase];
  const xPositions = [startX, startX + barW + 40];

  let progress = 0;
  const duration = 900;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = Math.min(now - startTime, duration);
    progress = easeOutExpo(elapsed / duration);

    ctx.clearRect(0, 0, W, H);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = bottomY - (maxBarH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(startX - 10, y);
      ctx.lineTo(startX + totalW + 10, y);
      ctx.stroke();
    }

    values.forEach((val, i) => {
      const targetH = (val / max) * maxBarH * progress;
      const x = xPositions[i];
      const y = bottomY - targetH;

      // Glow shadow
      ctx.shadowColor = colors[i].glow;
      ctx.shadowBlur = 15;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, bottomY);
      grad.addColorStop(0, colors[i].fill);
      grad.addColorStop(1, colors[i].fill + '66');
      ctx.fillStyle = grad;

      // Rounded top bar
      const r = Math.min(8, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, bottomY);
      ctx.lineTo(x, bottomY);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      // Value label on top
      if (progress > 0.5) {
        const displayVal = val >= 100000
          ? '₹' + (val / 100000).toFixed(1) + 'L'
          : val >= 1000
          ? '₹' + (val / 1000).toFixed(1) + 'K'
          : '₹' + val.toFixed(0);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (progress - 0.5) * 2) + ')';
        ctx.font = `bold ${Math.min(10, barW * 0.18)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(displayVal, x + barW / 2, y - 8);
      }

      // Label below
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `600 10px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, bottomY + 16);
    });

    if (elapsed < duration) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ─── Success flash animation ───────────────────────────────────

export function flashSuccess(element) {
  if (!element) return;
  element.style.transition = 'box-shadow 0.15s, transform 0.15s';
  element.style.boxShadow = '0 0 30px rgba(34,197,94,0.6)';
  element.style.transform = 'scale(1.02)';
  setTimeout(() => {
    element.style.boxShadow = '';
    element.style.transform = '';
  }, 350);
}

// ─── Stagger animate list items ───────────────────────────────

export function staggerReveal(selector, delay = 60) {
  const items = document.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = `opacity 0.3s ${i * delay}ms ease, transform 0.3s ${i * delay}ms ease`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });
}

// ─── Page entry animation helper ──────────────────────────────

export function revealCards(parentSelector) {
  setTimeout(() => staggerReveal(`${parentSelector} .feature-card`, 60), 50);
  setTimeout(() => staggerReveal(`${parentSelector} .period-card`, 80), 100);
}

// ─── Coin Rain ─────────────────────────────────────────────────

export function coinRain(count = 12) {
  let container = document.getElementById('coin-rain-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'coin-rain-container';
    container.className = 'coin-rain-container';
    document.body.appendChild(container);
  }

  const coins = ['💰', '🪙', '💵', '💴', '✨', '⭐'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const coin = document.createElement('div');
      coin.className = 'coin-drop';
      coin.textContent = coins[Math.floor(Math.random() * coins.length)];
      coin.style.left = `${10 + Math.random() * 80}%`;
      coin.style.setProperty('--drop-dist', `${150 + Math.random() * 200}px`);
      coin.style.animationDuration = `${0.6 + Math.random() * 0.5}s`;
      container.appendChild(coin);
      setTimeout(() => coin.remove(), 1200);
    }, i * 60);
  }
}

// ─── Star Burst on save ────────────────────────────────────────

export function starBurst(x, y, count = 8) {
  const starEmojis = ['⭐', '✨', '🌟', '💫', '✦', '★'];
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star-burst';
    star.textContent = starEmojis[Math.floor(Math.random() * starEmojis.length)];
    const angle = (i / count) * 360;
    const dist = 40 + Math.random() * 40;
    const rad = (angle * Math.PI) / 180;
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.setProperty('--tx', `${Math.cos(rad) * dist}px`);
    star.style.setProperty('--ty', `${Math.sin(rad) * dist}px`);
    star.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
    star.style.fontSize = `${12 + Math.random() * 12}px`;
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 900);
  }
}

// ─── Touch Sparkle Trail ──────────────────────────────────────

const SPARKLE_EMOJIS = ['✨', '⭐', '💫', '🌟', '✦', '•', '·'];

export function initSparkleTrail() {
  let lastSparkle = 0;
  document.addEventListener('pointermove', (e) => {
    const now = Date.now();
    if (now - lastSparkle < 80) return; // Throttle
    lastSparkle = now;

    const dot = document.createElement('div');
    dot.className = 'sparkle-trail-dot';
    dot.textContent = SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)];
    dot.style.left = `${e.clientX - 8}px`;
    dot.style.top = `${e.clientY - 8}px`;
    dot.style.opacity = Math.random() * 0.6 + 0.3;
    dot.style.fontSize = `${10 + Math.random() * 10}px`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  });
}

// ─── Shop Mascot Running Animation ────────────────────────────

export function initShopMascots() {
  // Already handled via CSS @keyframes marchLeft on .splash-mascot
  // This adds mascots dynamically to the dashboard too
  const dashboard = document.getElementById('page-dashboard');
  if (!dashboard) return;

  const mascots = ['🏃', '🚶', '🛒', '🧹', '👨‍🍳'];
  const mascotEl = document.createElement('div');
  mascotEl.style.cssText = `
    position: absolute;
    bottom: 0;
    font-size: 28px;
    pointer-events: none;
    z-index: 1;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    animation: marchLeft 12s linear infinite;
  `;
  mascotEl.textContent = mascots[Math.floor(Math.random() * mascots.length)];
  dashboard.style.position = 'relative';
  dashboard.style.overflow = 'hidden';
  dashboard.appendChild(mascotEl);
}

// ─── Page Transition with anime bounce ────────────────────────

export function animatePageTransition(pageEl) {
  if (!pageEl) return;
  pageEl.style.animation = 'none';
  pageEl.style.opacity = '0';
  pageEl.style.transform = 'translateY(20px) scale(0.97)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pageEl.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.4,0.64,1)';
      pageEl.style.opacity = '1';
      pageEl.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// ─── Grocery item card stagger pop ────────────────────────────

export function staggerGroceryCards(selector = '.grocery-item-card') {
  const cards = document.querySelectorAll(selector);
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.85) translateY(20px)';
    card.style.transition = `
      opacity 0.35s ${i * 50}ms cubic-bezier(0.34,1.56,0.64,1),
      transform 0.35s ${i * 50}ms cubic-bezier(0.34,1.56,0.64,1)
    `;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1) translateY(0)';
      });
    });
  });
}

// ─── Wiggle a specific element ────────────────────────────────

export function wiggleElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'wiggle 0.6s ease-in-out';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  });
}

// ─── Init all anime effects globally ─────────────────────────

export function initAnimeEffects() {
  // Touch sparkle trail (on mobile/touch, not mouse — prevent on desktop for UX)
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouchDevice) {
    initSparkleTrail();
  }

  // Add ripple to all nav items
  document.querySelectorAll('.nav-item').forEach(addRippleEffect);
  // Add ripple to all feature cards
  document.querySelectorAll('.feature-card').forEach(addRippleEffect);
}
