/**
 * Udri / Customer Credit Page Controller
 * Customers, credit transactions, partial payments, outstanding balance.
 */

import { t, formatCurrency } from './i18n.js';
import { getCustomerOutstanding, getTotalOutstanding, todayStr } from './calc.js';
import {
  getAllCustomers, addCustomer, updateCustomer, deleteCustomer,
  getCreditsByCustomer, addCredit, deleteCredit,
  getPaymentsByCustomer, addPayment
} from './db.local.js';
import { showToast, showConfirm, showBottomSheet, closeBottomSheet, showPage } from './app.js';

let currentCustomerId = null;

export async function initUdri() {
  await renderUdriDashboard();
  setupUdriSearch();
  const addBtn = document.getElementById('udri-add-customer-btn');
  if (addBtn && !addBtn._hasListener) {
    addBtn._hasListener = true;
    addBtn.addEventListener('click', openAddCustomerForm);
  }
}

async function renderUdriDashboard() {
  const customers = await getAllCustomers();
  const total = await getTotalOutstanding();

  document.getElementById('udri-total-outstanding').textContent = formatCurrency(total);

  const list = document.getElementById('udri-customer-list');
  if (!list) return;

  if (customers.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">👤</div>
      <div class="empty-text">${t('noData')}</div>
    </div>`;
    return;
  }

  // Load outstanding for all customers
  const custData = await Promise.all(customers.map(async c => {
    const bal = await getCustomerOutstanding(c.id);
    return { ...c, ...bal };
  }));

  // Sort: unpaid first, then partial, then paid
  custData.sort((a, b) => {
    const order = { unpaid: 0, partial: 1, paid: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  list.innerHTML = custData.map(c => `
    <div class="customer-card status-${c.status}" onclick="window._udriOpenCustomer(${c.id})">
      <div class="customer-card-left">
        <div class="customer-avatar">${c.name.charAt(0).toUpperCase()}</div>
        <div class="customer-info">
          <div class="customer-name">${c.name}</div>
          ${c.phone ? `<div class="customer-phone">📞 ${c.phone}</div>` : ''}
          <div class="customer-outstanding">${t('outstanding')}: <strong>${formatCurrency(c.outstanding)}</strong></div>
        </div>
      </div>
      <div class="customer-status-badge status-${c.status}">
        ${getStatusLabel(c.status)}
      </div>
    </div>
  `).join('');
}

function getStatusLabel(status) {
  if (status === 'paid') return t('paid');
  if (status === 'partial') return t('partiallyPaid');
  return t('unpaid');
}

function setupUdriSearch() {
  const searchInput = document.getElementById('udri-search');
  searchInput?.addEventListener('input', async () => {
    const q = searchInput.value.trim().toLowerCase();
    const list = document.getElementById('udri-customer-list');
    if (!q) { await renderUdriDashboard(); return; }

    const customers = await getAllCustomers();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(q));
    const custData = await Promise.all(filtered.map(async c => {
      const bal = await getCustomerOutstanding(c.id);
      return { ...c, ...bal };
    }));
    list.innerHTML = custData.map(c => `
      <div class="customer-card status-${c.status}" onclick="window._udriOpenCustomer(${c.id})">
        <div class="customer-card-left">
          <div class="customer-avatar">${c.name.charAt(0).toUpperCase()}</div>
          <div class="customer-info">
            <div class="customer-name">${c.name}</div>
            ${c.phone ? `<div class="customer-phone">📞 ${c.phone}</div>` : ''}
            <div class="customer-outstanding">${t('outstanding')}: <strong>${formatCurrency(c.outstanding)}</strong></div>
          </div>
        </div>
        <div class="customer-status-badge status-${c.status}">${getStatusLabel(c.status)}</div>
      </div>
    `).join('');
  });
}

function openAddCustomerForm(existing = null) {
  const formHTML = `
    <div class="sheet-form">
      <div class="form-group">
        <label class="form-label">${t('customerName')}</label>
        <input type="text" id="cust-name" class="form-input" value="${existing?.name || ''}" placeholder="${t('customerName')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('phone')}</label>
        <input type="tel" id="cust-phone" class="form-input" value="${existing?.phone || ''}" placeholder="9876543210">
      </div>
      <button class="btn-primary full-width" id="cust-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(t('addCustomer'), formHTML);
  setTimeout(() => {
    document.getElementById('cust-name')?.focus();
    document.getElementById('cust-save-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('cust-name')?.value?.trim();
      const phone = document.getElementById('cust-phone')?.value?.trim() || '';
      if (!name) { showToast(t('enterName'), 'error'); return; }
      try {
        if (existing) {
          await updateCustomer({ ...existing, name, phone });
        } else {
          await addCustomer(name, phone);
        }
        showToast(t('savedSuccess'));
        closeSheet();
        await renderUdriDashboard();
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
}

// ─── Customer Detail Page ──────────────────────────────────────────────────

window._udriOpenCustomer = async function(customerId) {
  currentCustomerId = customerId;
  await renderCustomerDetail(customerId);
  showPage('customer-detail');
};

export async function initCustomerDetail() {
  if (currentCustomerId) await renderCustomerDetail(currentCustomerId);
}

async function renderCustomerDetail(customerId) {
  const customers = await getAllCustomers();
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  document.getElementById('cd-customer-name').textContent = customer.name;
  document.getElementById('cd-customer-phone').textContent = customer.phone || '';

  const { totalCredit, totalPaid, outstanding, status } = await getCustomerOutstanding(customerId);

  document.getElementById('cd-total-credit').textContent = formatCurrency(totalCredit);
  document.getElementById('cd-total-paid').textContent = formatCurrency(totalPaid);
  document.getElementById('cd-outstanding').textContent = formatCurrency(outstanding);
  document.getElementById('cd-status').textContent = getStatusLabel(status);
  document.getElementById('cd-status').className = `cd-status-badge status-${status}`;

  // Render transaction history
  await renderTransactionHistory(customerId);

  // Buttons
  document.getElementById('cd-add-credit-btn').onclick = () => openCreditForm(customerId, outstanding);
  document.getElementById('cd-add-payment-btn').onclick = () => openPaymentForm(customerId, outstanding);
  document.getElementById('cd-edit-customer-btn').onclick = () => openAddCustomerForm(customer);
  document.getElementById('cd-delete-customer-btn').onclick = () => {
    showConfirm(`Delete customer "${customer.name}" and all records?`, async () => {
      await deleteCustomer(customerId);
      showToast(t('deletedSuccess'));
      showPage('udri');
      await renderUdriDashboard();
    });
  };
}

async function renderTransactionHistory(customerId) {
  const [credits, payments] = await Promise.all([
    getCreditsByCustomer(customerId),
    getPaymentsByCustomer(customerId)
  ]);

  // Merge and sort by date
  const all = [
    ...credits.map(c => ({ ...c, type: 'credit' })),
    ...payments.map(p => ({ ...p, type: 'payment' }))
  ].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

  const container = document.getElementById('cd-transaction-list');
  if (!container) return;

  if (all.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-text">${t('noData')}</div></div>`;
    return;
  }

  container.innerHTML = all.map(tx => {
    const [y, m, d] = tx.date.split('-');
    const dateLabel = `${d}/${m}/${y}`;
    if (tx.type === 'credit') {
      return `
        <div class="tx-card tx-credit">
          <div class="tx-header">
            <span class="tx-date">📅 ${dateLabel}</span>
            <span class="tx-amount credit-amount">+ ${formatCurrency(tx.amount)}</span>
          </div>
          ${tx.items ? `<div class="tx-items">🛒 ${tx.items}</div>` : ''}
          ${tx.notes ? `<div class="tx-note">📝 ${tx.notes}</div>` : ''}
          <div class="tx-tag tag-credit">${t('credit')}</div>
          <button class="btn-delete-sm" onclick="window._udriDeleteCredit(${tx.id}, ${customerId})">🗑️</button>
        </div>`;
    } else {
      return `
        <div class="tx-card tx-payment">
          <div class="tx-header">
            <span class="tx-date">📅 ${dateLabel}</span>
            <span class="tx-amount payment-amount">− ${formatCurrency(tx.amount)}</span>
          </div>
          ${tx.notes ? `<div class="tx-note">📝 ${tx.notes}</div>` : ''}
          <div class="tx-tag tag-payment">${t('payment')}</div>
        </div>`;
    }
  }).join('');
}

function openCreditForm(customerId, currentOutstanding) {
  const formHTML = `
    <div class="sheet-form">
      <div class="form-group">
        <label class="form-label">${t('date')}</label>
        <input type="date" id="credit-date" class="form-input" value="${todayStr()}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('creditAmount')} (₹)</label>
        <input type="number" id="credit-amount" class="form-input large-input" placeholder="0" inputmode="decimal" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">${t('items')} (${t('optional')})</label>
        <input type="text" id="credit-items" class="form-input" placeholder="Rice, Oil, ...">
      </div>
      <div class="form-group">
        <label class="form-label">${t('note')} (${t('optional')})</label>
        <input type="text" id="credit-note" class="form-input" placeholder="${t('note')}">
      </div>
      <button class="btn-primary full-width" id="credit-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(t('addCredit'), formHTML);
  setTimeout(() => {
    document.getElementById('credit-amount')?.focus();
    document.getElementById('credit-save-btn')?.addEventListener('click', async () => {
      const date = document.getElementById('credit-date')?.value;
      const amount = document.getElementById('credit-amount')?.value;
      const items = document.getElementById('credit-items')?.value?.trim() || '';
      const notes = document.getElementById('credit-note')?.value?.trim() || '';

      if (!amount || parseFloat(amount) <= 0) { showToast(t('enterAmount'), 'error'); return; }
      try {
        await addCredit({ customerId, date, amount: parseFloat(amount), items, notes });
        showToast(t('savedSuccess'));
        closeSheet();
        await renderCustomerDetail(customerId);
        await renderUdriDashboard(); // refresh total outstanding
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
}

function openPaymentForm(customerId, currentOutstanding) {
  const formHTML = `
    <div class="sheet-form">
      <div class="outstanding-display">
        <span>${t('outstanding')}:</span>
        <strong>${formatCurrency(currentOutstanding)}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">${t('date')}</label>
        <input type="date" id="pay-date" class="form-input" value="${todayStr()}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('paymentAmount')} (₹)</label>
        <input type="number" id="pay-amount" class="form-input large-input" placeholder="0" inputmode="decimal" min="0.01" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">${t('note')} (${t('optional')})</label>
        <input type="text" id="pay-note" class="form-input" placeholder="${t('note')}">
      </div>
      <button class="btn-success full-width" id="pay-save-btn">${t('addPayment')}</button>
    </div>`;

  const closeSheet = showBottomSheet(t('addPayment'), formHTML);
  setTimeout(() => {
    document.getElementById('pay-amount')?.focus();
    document.getElementById('pay-save-btn')?.addEventListener('click', async () => {
      const date = document.getElementById('pay-date')?.value;
      const amount = parseFloat(document.getElementById('pay-amount')?.value) || 0;
      const notes = document.getElementById('pay-note')?.value?.trim() || '';

      if (amount <= 0) { showToast(t('enterAmount'), 'error'); return; }

      const proceed = async () => {
        try {
          await addPayment(customerId, date, amount, notes);
          showToast(t('paymentSuccess'));
          closeSheet();
          await renderCustomerDetail(customerId);
          await renderUdriDashboard();
        } catch (err) {
          showToast(t('errorMsg'), 'error');
        }
      };

      if (amount > currentOutstanding && currentOutstanding > 0) {
        showConfirm(t('paymentExceedsBalance'), proceed);
      } else {
        await proceed();
      }
    });
  }, 100);
}

window._udriDeleteCredit = function(creditId, customerId) {
  showConfirm(t('deleteMsg'), async () => {
    await deleteCredit(creditId);
    showToast(t('deletedSuccess'));
    await renderCustomerDetail(customerId);
    await renderUdriDashboard();
  });
};
