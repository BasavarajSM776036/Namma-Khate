/**
 * App Shell — Router, Navigation, Toast, Modal, and Shared UI
 */

import { openDB, getSetting, setSetting, clearAllData } from './db.local.js';
import { t, loadLanguage, setLanguage, applyTranslations } from './i18n.js';

// ─── PWA Install Prompt ────────────────────────────────────────────────────
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  hideInstallBanner();
  showToast('App installed! Open from your home screen 🎉', 'success', 4000);
});

function showInstallBanner() {
  let banner = document.getElementById('pwa-install-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-icon">📲</div>
      <div class="pwa-banner-text">
        <div class="pwa-banner-title">Install MK Store</div>
        <div class="pwa-banner-sub">Add to Home Screen & use offline</div>
      </div>
      <button id="pwa-install-btn" class="pwa-install-btn">Install</button>
      <button id="pwa-dismiss-btn" class="pwa-dismiss-btn">✕</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!_deferredInstallPrompt) return;
      _deferredInstallPrompt.prompt();
      const { outcome } = await _deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        _deferredInstallPrompt = null;
        hideInstallBanner();
      }
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      hideInstallBanner();
      sessionStorage.setItem('pwa_banner_dismissed', '1');
    });
  }
  // Don't show if user dismissed in this session
  if (!sessionStorage.getItem('pwa_banner_dismissed')) {
    banner.classList.add('visible');
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('visible');
}

// ─── Router ────────────────────────────────────────────────────────────────

const pages = ['splash','language-chooser','dashboard','collection','purchase','profit','udri','customer-detail','weight-calc','amount-calc','notes','settings','grocery'];

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
  const goToDash = () => {
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
      clearTimeout(splashTimer);
      setTimeout(goToDash, 200);
    });
  }

  // Auto-navigate to dashboard after 5s if button not pressed
  const splashTimer = setTimeout(goToDash, 5000);

  // ─── Show splash immediately ───────────────────────────────────
  showPage('splash', {}, true);
  document.getElementById('bottom-nav').style.display = 'none';

  // ─── Background: Service Worker ───────────────────────────────
  // Register once — do NOT unregister every time (breaks PWA installability)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePopup();
          }
        });
      });
    }).catch(console.error);
    
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  function showUpdatePopup() {
    let popup = document.getElementById('pwa-update-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'pwa-update-popup';
      popup.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 14px;">Update Available 🚀</div>
          <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">A new version of the app is ready.</div>
        </div>
        <button id="pwa-update-btn" style="background: #fff; color: var(--primary); border: none; padding: 6px 12px; border-radius: 8px; font-weight: 800; cursor: pointer;">Update Now</button>
      `;
      popup.style.cssText = 'position: fixed; bottom: 80px; left: 16px; right: 16px; background: linear-gradient(135deg, var(--primary), var(--primary-2)); color: #fff; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; z-index: 10000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transform: translateY(100px); opacity: 0; transition: all 0.3s cubic-bezier(0.34, 1.08, 0.64, 1);';
      document.body.appendChild(popup);
      
      document.getElementById('pwa-update-btn').addEventListener('click', () => {
        popup.style.opacity = '0';
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            window.location.reload();
          }
        });
      });
    }
    // Animate in
    setTimeout(() => {
      popup.style.transform = 'translateY(0)';
      popup.style.opacity = '1';
    }, 100);
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
      // Update ALL lang-switch buttons in the page
      document.querySelectorAll('.lang-switch').forEach(b => {
        b.textContent = next === 'en' ? 'ಕನ್ನಡ' : 'English';
      });
      // Re-render dashboard header (date in correct language)
      window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: 'dashboard', params: {} } }));
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
