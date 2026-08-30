/**
 * Collection Page Controller
 * Calendar-based daily entry. Weekly totals Mon–Sun. Monthly totals.
 */

import { t, getMonthName, getDayName } from './i18n.js';
import {
  getWeekBounds, getMonthBounds, getYearBounds,
  getRangeCollection, getWeeklyCollection, getMonthlyCollection, getYearlyCollection,
  todayStr, fromDateStr, toDateStr
} from './calc.js';
import { getCollectionsInRange, saveCollection, getCollectionByDate } from './db.js';
import { showToast, showBottomSheet, closeBottomSheet } from './app.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-indexed

export async function initCollection() {
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;

  setupMonthNavigation();
  await renderCollectionCalendar();
}

function setupMonthNavigation() {
  document.getElementById('col-prev-month')?.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    await renderCollectionCalendar();
  });
  document.getElementById('col-next-month')?.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    await renderCollectionCalendar();
  });
}

async function renderCollectionCalendar() {
  const container = document.getElementById('collection-calendar');
  if (!container) return;

  // Update month/year header
  document.getElementById('col-month-label').textContent =
    `${getMonthName(currentMonth - 1)} ${currentYear}`;

  const { start, end } = getMonthBounds(currentYear, currentMonth);
  const records = await getCollectionsInRange(start, end);
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r; });

  // Build all days of the month
  const days = getAllDaysInMonth(currentYear, currentMonth);

  // Group into weeks (Mon-Sun)
  const weeks = groupIntoWeeks(days);

  let html = '';

  // Day headers
  const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dayHeadersKn = ['ಸೋ','ಮಂ','ಬು','ಗು','ಶು','ಶ','ಭಾ'];
  const lang = localStorage.getItem('mk_lang') || 'en';
  const hdrs = lang === 'kn' ? dayHeadersKn : dayHeaders;

  html += `<div class="cal-header-row">${hdrs.map(h => `<div class="cal-header-cell">${h}</div>`).join('')}</div>`;

  for (const week of weeks) {
    html += `<div class="cal-week-row">`;

    let weekTotal = 0;
    for (const dayInfo of week) {
      if (dayInfo === null) {
        html += `<div class="cal-day empty"></div>`;
      } else {
        const rec = recordMap[dayInfo.dateStr];
        const amount = rec ? parseFloat(rec.amount) : 0;
        weekTotal += amount;
        const hasEntry = rec && amount > 0;
        const isSunday = dayInfo.dayOfWeek === 0; // 0=Sun
        const isToday = dayInfo.dateStr === todayStr();

        html += `
          <div class="cal-day ${hasEntry ? 'has-entry' : ''} ${isSunday ? 'is-sunday' : ''} ${isToday ? 'is-today' : ''}"
               data-date="${dayInfo.dateStr}" onclick="window._colClickDay('${dayInfo.dateStr}')">
            <span class="cal-day-num">${dayInfo.day}</span>
            ${hasEntry ? `<span class="cal-day-amount">${formatAmountShort(amount)}</span>` : ''}
          </div>`;
      }
    }
    html += `</div>`;

    // Week total (after Sunday or end of month)
    const lastDay = week.find(d => d !== null && d.dayOfWeek === 0) ||
                    week.filter(d => d !== null).slice(-1)[0];
    if (lastDay) {
      html += `<div class="cal-week-total-row">
        <span class="week-total-label">${t('weeklyTotal')}</span>
        <span class="week-total-amount">${formatCurrency(weekTotal)}</span>
      </div>`;
    }
  }

  // Monthly total
  const monthlyTotal = await getMonthlyCollection(currentYear, currentMonth);
  html += `
    <div class="monthly-total-card">
      <div class="monthly-total-label">${getMonthName(currentMonth - 1)} ${currentYear} — ${t('monthlyTotal')}</div>
      <div class="monthly-total-amount">${formatCurrency(monthlyTotal)}</div>
    </div>`;

  // Yearly total
  const yearlyTotal = await getYearlyCollection(currentYear);
  html += `
    <div class="yearly-total-card">
      <div class="yearly-total-label">${currentYear} — ${t('yearlyTotal')}</div>
      <div class="yearly-total-amount">${formatCurrency(yearlyTotal)}</div>
    </div>`;

  container.innerHTML = html;
}

// Global click handler for calendar days
window._colClickDay = async function(dateStr) {
  const existing = await getCollectionByDate(dateStr);
  const amount = existing ? existing.amount : '';
  const note = existing ? existing.note : '';
  const [y, m, d] = dateStr.split('-');
  const label = `${d}/${m}/${y}`;

  const formHTML = `
    <div class="sheet-form">
      <div class="form-label">${t('date')}: <strong>${label}</strong></div>
      <div class="form-group">
        <label class="form-label">${t('collectionAmount')} (₹)</label>
        <input type="number" id="col-amount-input" class="form-input large-input"
               value="${amount}" placeholder="0" inputmode="decimal" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">${t('note')} (${t('optional')})</label>
        <input type="text" id="col-note-input" class="form-input"
               value="${note}" placeholder="${t('note')}">
      </div>
      <button class="btn-primary full-width" id="col-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(
    existing ? t('editCollection') : t('addCollection'),
    formHTML
  );

  setTimeout(() => {
    document.getElementById('col-amount-input')?.focus();
    document.getElementById('col-save-btn')?.addEventListener('click', async () => {
      const amtVal = document.getElementById('col-amount-input')?.value;
      const noteVal = document.getElementById('col-note-input')?.value || '';
      if (amtVal === '' || amtVal === null) {
        showToast(t('enterAmount'), 'error'); return;
      }
      try {
        await saveCollection(dateStr, parseFloat(amtVal), noteVal);
        showToast(t('savedSuccess'));
        closeSheet();
        await renderCollectionCalendar();
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
};

function getAllDaysInMonth(year, month) {
  const days = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    days.push({
      day: d,
      dayOfWeek: date.getDay(), // 0=Sun,1=Mon,...6=Sat
      dateStr: toDateStr(date),
      date
    });
  }
  return days;
}

function groupIntoWeeks(days) {
  // Monday=1..Sunday=0 → adjust to Mon=0..Sun=6
  const weeks = [];
  let week = new Array(7).fill(null);

  for (const day of days) {
    // Convert JS day (0=Sun) to Mon-based index (0=Mon..6=Sun)
    const idx = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1;
    week[idx] = day;

    if (idx === 6) { // Sunday — end of week
      weeks.push(week);
      week = new Array(7).fill(null);
    }
  }
  // Push last partial week
  if (week.some(d => d !== null)) weeks.push(week);

  return weeks;
}

function formatAmountShort(amount) {
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
  return '₹' + amount.toFixed(0);
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
