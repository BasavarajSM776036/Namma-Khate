/**
 * Premium Motion System â€” Mahalingeshwar Kirani Store
 * 2026 Â· Glass + 3D + Micro-interactions + Parallax
 */

// â”€â”€â”€ Respect reduced motion preference â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// â”€â”€â”€ Number Counter Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function animateNumber(element, fromVal, toVal, duration = 700, prefix = 'â‚¹', suffix = '') {
  if (!element) return;
  if (REDUCED) {
    element.textContent = `${toVal < 0 ? '-' : ''}${prefix}${Math.abs(toVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
    return;
  }
  const start = performance.now();
  const diff = toVal - fromVal;
  function step(now) {
    const elapsed = Math.min(now - start, duration);
    const progress = easeOutExpo(elapsed / duration);
    const current = fromVal + diff * progress;
    const formatted = Math.abs(current).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    element.textContent = `${current < 0 ? '-' : ''}${prefix}${formatted}${suffix}`;
    if (elapsed < duration) requestAnimationFrame(step);
    else element.textContent = `${toVal < 0 ? '-' : ''}${prefix}${Math.abs(toVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  }
  requestAnimationFrame(step);
}

export function animateInt(element, fromVal, toVal, duration = 600) {
  if (!element) return;
  if (REDUCED) { element.textContent = toVal; return; }
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

// â”€â”€â”€ Ripple Effect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function addRippleEffect(element) {
  element.addEventListener('pointerdown', function(e) {
    if (REDUCED) return;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;width:0;height:0;border-radius:50%;
      background:rgba(255,255,255,0.18);
      transform:translate(-50%,-50%);
      left:${x}px;top:${y}px;pointer-events:none;
      animation:premiumRipple 0.55s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
    `;
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 570);
  });
}

// Inject ripple keyframe once
(function injectRippleCSS() {
  const s = document.createElement('style');
  s.textContent = '@keyframes premiumRipple{to{width:400px;height:400px;opacity:0}}';
  document.head.appendChild(s);
})();

// â”€â”€â”€ Animated Bar Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function drawAnimatedBars(canvasId, collection, purchase, lang = 'en') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const max = Math.max(collection, purchase, 1);
  const barW = Math.min(60, W * 0.2);
  const totalW = barW * 2 + 40;
  const startX = (W - totalW) / 2;
  const maxBarH = H - 55;
  const bottomY = H - 30;
  const labels = lang === 'kn' ? ['à²¸à²‚à²—à³à²°à²¹', 'à²–à²°à³€à²¦à²¿'] : ['Collection', 'Purchase'];
  const colors = [
    { fill: '#1E8A3C', glow: 'rgba(30,138,60,0.4)' },
    { fill: '#FF6B2C', glow: 'rgba(255,107,44,0.4)' }
  ];
  const values = [collection, purchase];
  const xPositions = [startX, startX + barW + 40];
  const duration = REDUCED ? 0 : 900;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = Math.min(now - startTime, duration);
    const progress = easeOutExpo(duration > 0 ? elapsed / duration : 1);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = bottomY - (maxBarH / 4) * i;
      ctx.beginPath(); ctx.moveTo(startX - 10, y); ctx.lineTo(startX + totalW + 10, y); ctx.stroke();
    }
    values.forEach((val, i) => {
      const targetH = (val / max) * maxBarH * progress;
      const x = xPositions[i], y = bottomY - targetH;
      ctx.shadowColor = colors[i].glow; ctx.shadowBlur = 15;
      const grad = ctx.createLinearGradient(x, y, x, bottomY);
      grad.addColorStop(0, colors[i].fill);
      grad.addColorStop(1, colors[i].fill + '66');
      ctx.fillStyle = grad;
      const r = Math.min(8, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, bottomY); ctx.lineTo(x, bottomY); ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      if (progress > 0.5) {
        const dv = val >= 100000 ? 'â‚¹'+(val/100000).toFixed(1)+'L' : val >= 1000 ? 'â‚¹'+(val/1000).toFixed(1)+'K' : 'â‚¹'+val.toFixed(0);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (progress - 0.5) * 2) + ')';
        ctx.font = `bold ${Math.min(10, barW * 0.18)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(dv, x + barW / 2, y - 8);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 10px Outfit, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(labels[i], x + barW / 2, bottomY + 16);
    });
    if (elapsed < duration) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// â”€â”€â”€ Flash Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function flashSuccess(element) {
  if (!element) return;
  element.style.transition = 'box-shadow 0.15s ease, transform 0.15s ease';
  element.style.boxShadow = '0 0 30px rgba(34,197,94,0.6)';
  element.style.transform = 'scale(1.02)';
  setTimeout(() => { element.style.boxShadow = ''; element.style.transform = ''; }, 350);
}

// â”€â”€â”€ Stagger Reveal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function staggerReveal(selector, delay = 60) {
  if (REDUCED) return;
  const items = document.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = `opacity 0.3s ${i * delay}ms ease, transform 0.3s ${i * delay}ms ease`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }));
  });
}

// â”€â”€â”€ Page Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function revealCards(parentSelector) {
  setTimeout(() => staggerReveal(`${parentSelector} .feature-card`, 60), 50);
  setTimeout(() => staggerReveal(`${parentSelector} .period-card`, 80), 100);
}

// â”€â”€â”€ PREMIUM: Scroll Reveal via IntersectionObserver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _scrollObserver = null;

export function initScrollReveal() {
  if (REDUCED) return;
  if (_scrollObserver) _scrollObserver.disconnect();

  _scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
        _scrollObserver.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll(
    '.feature-card, .period-card, .today-banner, .period-section, ' +
    '.settings-section, .grocery-item-card, .collection-day-row, .purchase-row'
  ).forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px) scale(0.97)';
    el.style.transition = `opacity 0.45s ${Math.min(i * 25, 200)}ms cubic-bezier(0.4,0,0.2,1), transform 0.45s ${Math.min(i * 25, 200)}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
    _scrollObserver.observe(el);
  });
}

// â”€â”€â”€ PREMIUM: Floating Grocery Items + Mouse Parallax â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initPremiumFloating() {
  if (REDUCED) return;
  const container = document.getElementById('dash-floats');
  if (!container) return;

  const items = container.querySelectorAll('.pf-item');
  items.forEach((item, i) => {
    item.style.animationDuration = `${5.5 + i * 1.1}s`;
    item.style.animationDelay = `${-i * 0.75}s`;
  });

  const header = document.querySelector('.dash-header');
  if (!header) return;
  let ticking = false;

  header.addEventListener('pointermove', (e) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = header.getBoundingClientRect();
      const mx = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
      const my = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
      items.forEach(item => {
        const d = parseFloat(item.dataset.depth) || 0.5;
        item.style.transform = `translate(calc(-50% + ${mx*d*14}px), calc(-50% + ${my*d*9}px))`;
        item.style.transition = 'transform 0.06s linear';
      });
      ticking = false;
    });
  });

  header.addEventListener('pointerleave', () => {
    items.forEach(item => {
      item.style.transform = 'translate(-50%, -50%)';
      item.style.transition = 'transform 1s cubic-bezier(0.4,0,0.2,1)';
    });
  });
}

// â”€â”€â”€ PREMIUM: 3D Card Perspective Hover (Desktop only) â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function init3DCardHover() {
  if (REDUCED) return;
  document.querySelectorAll('.feature-card, .period-card').forEach(card => {
    card.addEventListener('pointermove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      this.style.transform = `perspective(600px) rotateY(${x*8}deg) rotateX(${-y*6}deg) scale(1.04) translateY(-4px)`;
      this.style.transition = 'transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)';
      this.style.boxShadow = `${-x*12}px ${-y*8}px 40px rgba(255,107,44,0.18), 0 16px 48px rgba(0,0,0,0.35)`;
    });
    card.addEventListener('pointerleave', function() {
      this.style.transform = 'perspective(600px) rotateY(0) rotateX(0) scale(1) translateY(0)';
      this.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.45s cubic-bezier(0.4,0,0.2,1)';
      this.style.boxShadow = '';
    });
  });
}

// â”€â”€â”€ PREMIUM: Button Micro-Interactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initButtonInteractions() {
  document.querySelectorAll(
    '.btn-primary, .btn-danger, .btn-ghost, .cta-explore-btn, .settings-btn, .splash-goto-btn, .gm-save-btn'
  ).forEach(btn => {
    addRippleEffect(btn);
    btn.addEventListener('pointerdown', function() {
      if (REDUCED) return;
      this.style.transform = 'scale(0.95)';
      this.style.transition = 'transform 0.12s cubic-bezier(0.65,0,0.35,1)';
    });
    btn.addEventListener('pointerup', function() {
      if (REDUCED) return;
      this.style.transform = 'scale(1.04)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
        this.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
      }, 100);
    });
    btn.addEventListener('pointerleave', function() {
      if (REDUCED) return;
      this.style.transform = 'scale(1)';
      this.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
    });
  });
}

// â”€â”€â”€ PREMIUM: Ambient Background Blobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initAmbientBackground() {
  if (REDUCED) return;
  if (document.getElementById('ambient-bg')) return;
  const bg = document.createElement('div');
  bg.id = 'ambient-bg';
  bg.innerHTML = `
    <div class="amb-blob amb-1"></div>
    <div class="amb-blob amb-2"></div>
    <div class="amb-blob amb-3"></div>
  `;
  document.getElementById('app').prepend(bg);
}

// â”€â”€â”€ PREMIUM: Page Enter Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function animatePageIn(pageEl) {
  if (!pageEl || REDUCED) return;
  pageEl.style.opacity = '0';
  pageEl.style.transform = 'translateY(16px)';
  pageEl.style.transition = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    pageEl.style.transition = 'opacity 0.32s cubic-bezier(0.4,0,0.2,1), transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)';
    pageEl.style.opacity = '1';
    pageEl.style.transform = 'translateY(0)';
  }));
}

// â”€â”€â”€ PREMIUM: Success Button Feedback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function successFeedback(triggerEl) {
  if (!triggerEl || REDUCED) return;
  triggerEl.style.transform = 'scale(0.93)';
  triggerEl.style.transition = 'transform 0.12s cubic-bezier(0.65,0,0.35,1)';
  setTimeout(() => {
    triggerEl.style.transform = 'scale(1.06)';
    triggerEl.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(() => {
      triggerEl.style.transform = 'scale(1)';
      triggerEl.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
    }, 220);
  }, 120);
}

// â”€â”€â”€ PREMIUM: Nav Item Tap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initNavInteractions() {
  document.querySelectorAll('.nav-item').forEach(item => {
    addRippleEffect(item);
    item.addEventListener('pointerdown', function() {
      const icon = this.querySelector('.nav-icon');
      if (!icon || REDUCED) return;
      icon.style.transform = 'scale(0.8) translateY(2px)';
      icon.style.transition = 'transform 0.12s cubic-bezier(0.65,0,0.35,1)';
    });
    item.addEventListener('pointerup', function() {
      const icon = this.querySelector('.nav-icon');
      if (!icon || REDUCED) return;
      icon.style.transform = 'scale(1.2) translateY(-4px)';
      icon.style.transition = 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)';
      setTimeout(() => {
        icon.style.transform = 'scale(1) translateY(0)';
        icon.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
      }, 220);
    });
  });
}

// â”€â”€â”€ PREMIUM: Feature Card Icon Tap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initCardIconTap() {
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('pointerdown', function() {
      const icon = this.querySelector('.feature-icon');
      if (!icon || REDUCED) return;
      icon.style.transform = 'scale(0.85) rotate(-5deg)';
      icon.style.transition = 'transform 0.12s cubic-bezier(0.65,0,0.35,1)';
    });
    card.addEventListener('pointerup', function() {
      const icon = this.querySelector('.feature-icon');
      if (!icon || REDUCED) return;
      icon.style.transform = 'scale(1.22) rotate(4deg)';
      icon.style.transition = 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';
      setTimeout(() => {
        icon.style.transform = 'scale(1) rotate(0deg)';
        icon.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
      }, 200);
    });
  });
}

// â”€â”€â”€ Grocery Card Stagger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function staggerGroceryCards(selector = '.grocery-item-card') {
  if (REDUCED) return;
  document.querySelectorAll(selector).forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.92) translateY(16px)';
    card.style.transition = `opacity 0.38s ${Math.min(i*40,300)}ms cubic-bezier(0.4,0,0.2,1), transform 0.38s ${Math.min(i*40,300)}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';
    }));
  });
}

// â”€â”€â”€ Header Particles (subtle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initHeaderParticles(containerId) {
  if (REDUCED) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.4;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const particles = [];
  const DOTS = ['â€¢', 'Â·', 'â—¦'];
  function resize() { canvas.width = container.offsetWidth; canvas.height = container.offsetHeight; }
  resize();
  for (let i = 0; i < 12; i++) {
    particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      vx: (Math.random()-0.5)*0.28, vy: (Math.random()-0.5)*0.28,
      size: Math.random()*3+2, opacity: Math.random()*0.22+0.04,
      char: DOTS[Math.floor(Math.random()*DOTS.length)] });
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-10)p.x=canvas.width+10; if(p.x>canvas.width+10)p.x=-10;
      if(p.y<-10)p.y=canvas.height+10; if(p.y>canvas.height+10)p.y=-10;
      ctx.save(); ctx.globalAlpha=p.opacity; ctx.fillStyle='rgba(255,248,220,0.9)';
      ctx.font=`${p.size*2}px serif`; ctx.fillText(p.char,p.x,p.y); ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', resize);
}

// â”€â”€â”€ Wiggle helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function wiggleElement(el) {
  if (!el || REDUCED) return;
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'pfWiggle 0.45s ease-in-out';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  });
}

// â”€â”€â”€ MASTER INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function initPremiumMotion() {
  initAmbientBackground();
  initNavInteractions();
  initButtonInteractions();
  initCardIconTap();

  const isDesktop = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
  if (isDesktop) init3DCardHover();

  initPremiumFloating();
  initScrollReveal();
}

// â”€â”€â”€ Legacy export aliases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const initAnimeEffects = initPremiumMotion;
export const animatePageTransition = animatePageIn;

