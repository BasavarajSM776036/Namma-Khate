/**
 * Dashboard Page Controller
 */

import { t, formatCurrency, getMonthName } from './i18n.js';
import { getDashboardSummary, todayStr, fromDateStr } from './calc.js';
import { showPage } from './app.js';

export async function initDashboard() {
  updateHeader();
  await loadSummary();
  wireCTAButton();
}

function wireCTAButton() {
  const btn = document.getElementById('cta-explore-btn');
  if (btn && !btn._wired) {
    btn._wired = true;
    btn.addEventListener('click', () => {
      // Trigger click animation
      btn.classList.add('cta-click-anim');
      
      // Delay scroll to let animation play
      setTimeout(() => {
        btn.classList.remove('cta-click-anim');
        const target = document.getElementById('feature-grid-section');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    });
  }
}


function updateHeader() {
  const today = new Date();
  const days = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];
  const months = [t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
    t('july'), t('august'), t('september'), t('october'), t('november'), t('december')];

  const dateStr = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  const el = document.getElementById('dash-date');
  if (el) el.textContent = dateStr;

  // Language switch button label
  const langBtn = document.querySelector('.lang-switch');
  if (langBtn) langBtn.textContent = localStorage.getItem('mk_lang') === 'kn' ? 'English' : 'ಕನ್ನಡ';
}

async function loadSummary() {
  try {
    const today = todayStr();
    const d = fromDateStr(today);
    const summary = await getDashboardSummary(today);

    // Today
    setText('dash-today-col', formatCurrency(summary.today.collection));
    setText('dash-today-pur', formatCurrency(summary.today.purchase));
    setText('dash-today-net', formatCurrency(summary.today.netDifference));

    // This week
    setText('dash-week-col', formatCurrency(summary.week.collection));
    setText('dash-week-pur', formatCurrency(summary.week.purchase));
    setText('dash-week-profit', formatCurrency(summary.week.profit));

    // This month
    setText('dash-month-col', formatCurrency(summary.month.collection));
    setText('dash-month-pur', formatCurrency(summary.month.purchase));
    setText('dash-month-profit', formatCurrency(summary.month.profit));

    // Color net difference
    const netEl = document.getElementById('dash-today-net');
    if (netEl) {
      netEl.style.color = summary.today.netDifference >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // Color profits
    colorProfit('dash-week-profit', summary.week.profit);
    colorProfit('dash-month-profit', summary.month.profit);

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function colorProfit(id, val) {
  const el = document.getElementById(id);
  if (el) el.style.color = val >= 0 ? 'var(--success)' : 'var(--danger)';
}

// Re-export for event listener
export { loadSummary as refreshDashboard };
