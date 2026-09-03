/**
 * App Shell — Router, Navigation, Toast, Modal, and Shared UI
 */

import { openDB, getSetting, setSetting, clearAllData } from './db.local.js';
import { t, loadLanguage, setLanguage, applyTranslations } from './i18n.js';

// ─── Router ────────────────────────────────────────────────────────────────

const pages = ['splash','language-chooser','dashboard','collection','purchase','profit','udri','customer-detail','weight-calc','amount-calc','notes','settings'];

export function showPage(pageId, params = {}, skipEvent = false) {
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.remove('active');
  });
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
    target.style.animation = 'none';
    setTimeout(() => target.style.animation = '', 10);
  }

  // Update bottom nav highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');

  // Show/hide nav bar
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    const noNav = ['language-chooser', 'splash'];
    nav.style.display = noNav.includes(pageId) ? 'none' : 'flex';
  }

  // Trigger page init (skip for splash to avoid redundant inits)
  if (!skipEvent) {
    window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: pageId, params } }));
  }
}

// ─── Toast Notifications ───────────────────────────────────────────────────

export function showToast(message, type = 'success', duration = 2800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ─── Confirmation Modal ────────────────────────────────────────────────────

export function showConfirm(message, onConfirm, onCancel) {
  const overlay = document.getElementById('confirm-overlay');
  const msg = document.getElementById('confirm-message');
  const btnYes = document.getElementById('confirm-yes');
  const btnNo = document.getElementById('confirm-no');

  if (!overlay) return;
  msg.textContent = message;
  btnYes.textContent = t('yes');
  btnNo.textContent = t('no');
  overlay.classList.add('active');

  const doYes = () => { overlay.classList.remove('active'); cleanup(); onConfirm && onConfirm(); };
  const doNo = () => { overlay.classList.remove('active'); cleanup(); onCancel && onCancel(); };
  const cleanup = () => {
    btnYes.removeEventListener('click', doYes);
    btnNo.removeEventListener('click', doNo);
  };
  btnYes.addEventListener('click', doYes);
  btnNo.addEventListener('click', doNo);
}

// ─── Bottom Sheet Modal ────────────────────────────────────────────────────

export function showBottomSheet(title, contentHTML, onClose) {
  const sheet = document.getElementById('bottom-sheet');
  const sheetTitle = document.getElementById('sheet-title');
  const sheetBody = document.getElementById('sheet-body');
  const sheetClose = document.getElementById('sheet-close');

  sheetTitle.textContent = title;
  sheetBody.innerHTML = contentHTML;
  sheet.classList.add('active');

  const close = () => { sheet.classList.remove('active'); onClose && onClose(); };
  sheetClose.onclick = close;
  sheet.querySelector('.sheet-backdrop').onclick = close;
  return close;
}

export function closeBottomSheet() {
  const sheet = document.getElementById('bottom-sheet');
  if (sheet) sheet.classList.remove('active');
}

// ─── Language handling ─────────────────────────────────────────────────────

export async function initLanguage() {
  await openDB();
  let lang = localStorage.getItem('mk_lang');
  if (!lang) {
    lang = 'en';
    localStorage.setItem('mk_lang', lang);
  }
  setLanguage(lang);
  applyTranslations();
  showPage('dashboard');
  return lang;
}

// ─── Main App Init ─────────────────────────────────────────────────────────

export async function initApp() {
  // ─── WIRE SPLASH "Go to Dashboard" BUTTON IMMEDIATELY ─────────
  // Must be first — before any await — so the user can click it
  // as soon as the page renders, without waiting for DB/SW.
  let splashNavigated = false;
  const goToDash = () => {
    if (splashNavigated) return;
    splashNavigated = true;
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = 'flex';
    showPage('dashboard');
    // Scroll to feature cards so all options are visible immediately
    setTimeout(() => {
      const featureSection = document.getElementById('feature-grid-section');
      if (featureSection) {
        featureSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const gotoBtn = document.getElementById('splash-goto-dashboard');
  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => {
      gotoBtn.style.animation = 'none';
      gotoBtn.style.transform = 'scale(0.92)';
      gotoBtn.style.opacity = '0.75';
      setTimeout(goToDash, 200);
    });
  }

  // Auto-navigate to dashboard after 5s if button not pressed
  const splashTimer = setTimeout(goToDash, 5000);

  // Cancel auto-timer if user clicks manually
  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => clearTimeout(splashTimer), { once: true });
  }

  // ─── Show splash immediately ───────────────────────────────────
  showPage('splash', {}, true);
  document.getElementById('bottom-nav').style.display = 'none';

  // ─── Background: Service Worker, DB, Data wipe ────────────────
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      // Unregister and re-register fresh SW
      await reg.unregister();
    }
    // Re-register the updated service worker
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  }

  // Open DB with a timeout so we never hang on splash
  try {
    await Promise.race([
      openDB(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000))
    ]);
  } catch (err) {
    console.warn('DB init issue (continuing anyway):', err);
  }

  // Force wipe data once
  if (!localStorage.getItem('wiped_final_demo')) {
    try {
      await clearAllData();
      localStorage.setItem('wiped_final_demo', '1');
      console.log('Successfully wiped all old data');
    } catch (e) {
      console.error(e);
    }
  }
  loadLanguage();

  // Language chooser buttons
  document.getElementById('btn-lang-kn')?.addEventListener('click', async () => {
    setLanguage('kn');
    await setSetting('language', 'kn');
    applyTranslations();
    showPage('dashboard');
  });
  document.getElementById('btn-lang-en')?.addEventListener('click', async () => {
    setLanguage('en');
    await setSetting('language', 'en');
    applyTranslations();
    showPage('dashboard');
  });

  // Bottom nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      if (page) showPage(page);
    });
  });

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-back') || 'dashboard';
      showPage(target);
    });
  });

  // Feature card navigation
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.getAttribute('data-nav');
      showPage(page);
    });
  });

  // Language switch button (in settings / header)
  document.querySelectorAll('.lang-switch').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = localStorage.getItem('mk_lang') || 'en';
      const next = current === 'en' ? 'kn' : 'en';
      setLanguage(next);
      setSetting('language', next);
      applyTranslations();
      btn.textContent = next === 'en' ? 'ಕನ್ನಡ' : 'English';
    });
  });

  // Determine start page
  let lang = localStorage.getItem('mk_lang');
  if (!lang) {
    lang = 'en';
    localStorage.setItem('mk_lang', lang);
    setSetting('language', lang);
    applyTranslations();
  }
}
