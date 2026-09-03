/**
 * Purchase Page Controller
 * Multiple purchases per day. Date picker. Weekly/Monthly/Yearly totals.
 */

import { t, formatCurrency } from './i18n.js';
import {
  getDailyPurchase, getWeeklyPurchase, getMonthlyPurchase, getYearlyPurchase,
  getWeekBounds, getMonthBounds, todayStr, fromDateStr, toDateStr
} from './calc.js';
import {
  getPurchasesByDate, addPurchase, updatePurchase, deletePurchase,
  getPurchasesInRange
} from './db.local.js';
import { showToast, showConfirm, showBottomSheet, closeBottomSheet } from './app.js';

let selectedDate = todayStr();

export async function initPurchase() {
  selectedDate = todayStr();
  setupDatePicker();
  setupAddBtn();
  await renderPurchasePage();
}

function setupDatePicker() {
  const picker = document.getElementById('pur-date-picker');
  if (picker && !picker._hasListener) {
    picker._hasListener = true;
    picker.value = selectedDate;
    picker.addEventListener('change', async () => {
      selectedDate = picker.value;
      await renderPurchasePage();
    });
  } else if (picker) {
    picker.value = selectedDate;
  }
}

function setupAddBtn() {
  const btn = document.getElementById('pur-add-btn');
  if (btn && !btn._hasListener) {
    btn._hasListener = true;
    btn.addEventListener('click', () => openPurchaseForm(null));
  }
}

async function renderPurchasePage() {
  const [y, m] = selectedDate.split('-').map(Number);
  const daily = await getDailyPurchase(selectedDate);
  const weekly = await getWeeklyPurchase(selectedDate);
  const monthly = await getMonthlyPurchase(y, m);
  const yearly = await getYearlyPurchase(y);

  document.getElementById('pur-daily-total').textContent = formatCurrency(daily);
  document.getElementById('pur-weekly-total').textContent = formatCurrency(weekly);
  document.getElementById('pur-monthly-total').textContent = formatCurrency(monthly);
  document.getElementById('pur-yearly-total').textContent = formatCurrency(yearly);

  // Update date display
  const [yr, mo, dy] = selectedDate.split('-');
  document.getElementById('pur-date-display').textContent = `${dy}/${mo}/${yr}`;

  await renderPurchaseList();
}

async function renderPurchaseList() {
  const list = document.getElementById('purchase-list');
  if (!list) return;

  const purchases = await getPurchasesByDate(selectedDate);

  if (purchases.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🛒</div>
      <div class="empty-text">${t('noData')}</div>
    </div>`;
    return;
  }

  // Sort by createdAt
  purchases.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  list.innerHTML = purchases.map(p => `
    <div class="purchase-card" id="pur-card-${p.id}">
      <div class="purchase-card-header">
        <div class="purchase-supplier">🏪 ${p.supplierName || '—'}</div>
        <div class="purchase-amount">${formatCurrency(p.amount)}</div>
      </div>
      <div class="purchase-item">📦 ${p.itemName || '—'}</div>
      ${p.note ? `<div class="purchase-note">📝 ${p.note}</div>` : ''}
      <div class="purchase-actions">
        <button class="btn-edit-sm" onclick="window._purEdit(${p.id})">✏️ ${t('edit')}</button>
        <button class="btn-delete-sm" onclick="window._purDelete(${p.id}, ${p.amount})">🗑️ ${t('delete')}</button>
      </div>
    </div>
  `).join('');
}

function openPurchaseForm(existing) {
  const formHTML = `
    <div class="sheet-form">
      <div class="form-group">
        <label class="form-label">${t('supplierName')}</label>
        <input type="text" id="pur-supplier" class="form-input"
               value="${existing?.supplierName || ''}" placeholder="${t('supplierName')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('itemName')}</label>
        <input type="text" id="pur-item" class="form-input"
               value="${existing?.itemName || ''}" placeholder="${t('itemName')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('amount')} (₹)</label>
        <input type="number" id="pur-amount" class="form-input large-input"
               value="${existing?.amount || ''}" placeholder="0" inputmode="decimal" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">${t('note')} (${t('optional')})</label>
        <input type="text" id="pur-note" class="form-input"
               value="${existing?.note || ''}" placeholder="${t('note')}">
      </div>
      <button class="btn-primary full-width" id="pur-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(
    existing ? t('edit') + ' ' + t('purchase') : t('addPurchase'),
    formHTML
  );

  setTimeout(() => {
    document.getElementById('pur-amount')?.focus();
    document.getElementById('pur-save-btn')?.addEventListener('click', async () => {
      const supplier = document.getElementById('pur-supplier')?.value?.trim() || '';
      const item = document.getElementById('pur-item')?.value?.trim() || '';
      const amtStr = document.getElementById('pur-amount')?.value;
      const note = document.getElementById('pur-note')?.value?.trim() || '';

      if (!amtStr || parseFloat(amtStr) <= 0) {
        showToast(t('enterAmount'), 'error'); return;
      }

      try {
        if (existing) {
          await updatePurchase({ ...existing, supplierName: supplier, itemName: item, amount: parseFloat(amtStr), note });
        } else {
          await addPurchase({ date: selectedDate, supplierName: supplier, itemName: item, amount: parseFloat(amtStr), note });
        }
        showToast(t('savedSuccess'));
        closeSheet();
        await renderPurchasePage();
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
}

window._purEdit = async function(id) {
  const purchases = await getPurchasesByDate(selectedDate);
  const p = purchases.find(x => x.id === id);
  if (p) openPurchaseForm(p);
};

window._purDelete = function(id, amount) {
  showConfirm(`${t('delete')} ₹${amount} ${t('purchase')}?`, async () => {
    await deletePurchase(id);
    showToast(t('deletedSuccess'));
    await renderPurchasePage();
  });
};
