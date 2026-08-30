/**
 * Profit Page Controller
 * Week / Month / Year / Custom tabs. Profit = Collection − Purchase.
 */

import { t, formatCurrency, getMonthName } from './i18n.js';
import {
  getWeeklyProfit, getMonthlyProfit, getYearlyProfit, getProfit,
  getWeekBounds, getMonthBounds, getYearBounds,
  todayStr, fromDateStr, toDateStr,
  getCollectionDaysCount, getPurchaseRecordCount
} from './calc.js';

let activeTab = 'week';

export async function initProfit() {
  setupTabs();
  await loadProfitTab('week');
}

function setupTabs() {
  document.querySelectorAll('.profit-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.profit-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');
      await loadProfitTab(activeTab);
    });
  });

  // Custom date range
  document.getElementById('profit-calc-btn')?.addEventListener('click', async () => {
    const start = document.getElementById('profit-start-date')?.value;
    const end = document.getElementById('profit-end-date')?.value;
    if (!start || !end) return;
    await loadCustomProfit(start, end);
  });
}

async function loadProfitTab(tab) {
  const today = todayStr();
  const d = fromDateStr(today);

  let result, startDate, endDate, label;

  if (tab === 'week') {
    const { monday, sunday } = getWeekBounds(today);
    result = await getWeeklyProfit(today);
    startDate = monday; endDate = sunday;
    label = `${monday.split('-').reverse().join('/')} — ${sunday.split('-').reverse().join('/')}`;
  } else if (tab === 'month') {
    const y = d.getFullYear(), m = d.getMonth() + 1;
    result = await getMonthlyProfit(y, m);
    const { start, end } = getMonthBounds(y, m);
    startDate = start; endDate = end;
    label = `${getMonthName(m - 1)} ${y}`;
  } else if (tab === 'year') {
    const y = d.getFullYear();
    result = await getYearlyProfit(y);
    const { start, end } = getYearBounds(y);
    startDate = start; endDate = end;
    label = `${y}`;
  } else {
    return; // custom handled separately
  }

  const [colDays, purCount] = await Promise.all([
    getCollectionDaysCount(startDate, endDate),
    getPurchaseRecordCount(startDate, endDate)
  ]);

  renderProfitDisplay(result, label, colDays, purCount);
}

async function loadCustomProfit(start, end) {
  if (start > end) {
    [start, end] = [end, start]; // swap
  }
  const result = await getProfit(start, end);
  const [colDays, purCount] = await Promise.all([
    getCollectionDaysCount(start, end),
    getPurchaseRecordCount(start, end)
  ]);
  const label = `${start.split('-').reverse().join('/')} — ${end.split('-').reverse().join('/')}`;
  renderProfitDisplay(result, label, colDays, purCount);
}

function renderProfitDisplay(result, label, colDays, purCount) {
  const { collection, purchase, profit } = result;

  document.getElementById('profit-period-label').textContent = label;
  document.getElementById('profit-col-val').textContent = formatCurrency(collection);
  document.getElementById('profit-pur-val').textContent = formatCurrency(purchase);
  document.getElementById('profit-result').textContent = formatCurrency(profit);
  document.getElementById('profit-col-days').textContent = colDays;
  document.getElementById('profit-pur-count').textContent = purCount;

  // Color profit
  const profitEl = document.getElementById('profit-result');
  if (profitEl) profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';

  // Simple bar chart
  renderProfitChart(collection, purchase);
}

function renderProfitChart(collection, purchase) {
  const canvas = document.getElementById('profit-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const max = Math.max(collection, purchase, 1);
  const barW = 70;
  const gap = 40;
  const startX = (W - (barW * 2 + gap)) / 2;
  const maxH = H - 60;

  // Collection bar
  const colH = (collection / max) * maxH;
  ctx.fillStyle = '#2D7A3A';
  ctx.fillRect(startX, H - 40 - colH, barW, colH);

  // Purchase bar
  const purH = (purchase / max) * maxH;
  ctx.fillStyle = '#E8682A';
  ctx.fillRect(startX + barW + gap, H - 40 - purH, barW, purH);

  // Labels
  ctx.fillStyle = '#666';
  ctx.font = '11px Outfit, sans-serif';
  ctx.textAlign = 'center';
  const lang = localStorage.getItem('mk_lang') || 'en';
  ctx.fillText(lang === 'kn' ? 'ಸಂಗ್ರಹ' : 'Collection', startX + barW / 2, H - 10);
  ctx.fillText(lang === 'kn' ? 'ಖರೀದಿ' : 'Purchase', startX + barW + gap + barW / 2, H - 10);
}
