/**
 * Supplier Notes Page Controller
 * Note: Supplier notes do NOT affect purchase totals. Completely separate.
 */

import { t } from './i18n.js';
import {
  getAllSuppliers, addSupplier, updateSupplier, deleteSupplier,
  getItemsBySupplier, addSupplierItem, updateSupplierItem, deleteSupplierItem
} from './db.js';
import { showToast, showConfirm, showBottomSheet, closeBottomSheet } from './app.js';

let selectedSupplierId = null;

export async function initNotes() {
  await renderSupplierList();
  document.getElementById('notes-add-supplier-btn')?.addEventListener('click', openAddSupplierForm);
  document.getElementById('notes-search')?.addEventListener('input', doNotesSearch);
}

async function renderSupplierList(filterQ = '') {
  let suppliers = await getAllSuppliers();
  if (filterQ) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(filterQ.toLowerCase()));

  const list = document.getElementById('supplier-list');
  if (!list) return;

  if (suppliers.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏪</div>
      <div class="empty-text">${t('noSuppliers')}</div>
    </div>`;
    selectedSupplierId = null;
    document.getElementById('items-panel').classList.remove('active');
    return;
  }

  list.innerHTML = suppliers.map(s => `
    <div class="supplier-card ${selectedSupplierId === s.id ? 'selected' : ''}"
         onclick="window._notesSelectSupplier(${s.id})">
      <div class="supplier-name">🏪 ${s.name}</div>
      <div class="supplier-actions">
        <button class="btn-icon" onclick="event.stopPropagation(); window._notesEditSupplier(${s.id})">✏️</button>
        <button class="btn-icon danger" onclick="event.stopPropagation(); window._notesDeleteSupplier(${s.id}, '${s.name}')">🗑️</button>
      </div>
    </div>
  `).join('');

  if (selectedSupplierId) await renderItemList(selectedSupplierId);
}

async function renderItemList(supplierId) {
  const items = await getItemsBySupplier(supplierId);
  const suppliers = await getAllSuppliers();
  const supplier = suppliers.find(s => s.id === supplierId);

  const panel = document.getElementById('items-panel');
  const title = document.getElementById('items-panel-title');
  const list = document.getElementById('items-list');

  if (!panel || !supplier) return;

  panel.classList.add('active');
  title.textContent = supplier.name;

  document.getElementById('notes-add-item-btn').onclick = () => openAddItemForm(supplierId);

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-text">${t('noItems')}</div></div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-name">📦 ${item.itemName}</div>
      ${item.note ? `<div class="item-note">📝 ${item.note}</div>` : ''}
      <div class="item-actions">
        <button class="btn-icon" onclick="window._notesEditItem(${item.id})">✏️</button>
        <button class="btn-icon danger" onclick="window._notesDeleteItem(${item.id}, '${item.itemName}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function openAddSupplierForm(existing = null) {
  const formHTML = `
    <div class="sheet-form">
      <div class="form-group">
        <label class="form-label">${t('supplierName')}</label>
        <input type="text" id="sup-name" class="form-input" value="${existing?.name || ''}" placeholder="${t('supplierName')}">
      </div>
      <button class="btn-primary full-width" id="sup-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(t('addSupplier'), formHTML);
  setTimeout(() => {
    document.getElementById('sup-name')?.focus();
    document.getElementById('sup-save-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('sup-name')?.value?.trim();
      if (!name) { showToast(t('enterName'), 'error'); return; }
      try {
        if (existing) {
          await updateSupplier({ ...existing, name });
        } else {
          await addSupplier(name);
        }
        showToast(t('savedSuccess'));
        closeSheet();
        await renderSupplierList();
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
}

function openAddItemForm(supplierId, existing = null) {
  const formHTML = `
    <div class="sheet-form">
      <div class="form-group">
        <label class="form-label">${t('itemName')}</label>
        <input type="text" id="item-name" class="form-input" value="${existing?.itemName || ''}" placeholder="${t('itemName')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('note')} (${t('optional')})</label>
        <input type="text" id="item-note" class="form-input" value="${existing?.note || ''}" placeholder="${t('note')}">
      </div>
      <button class="btn-primary full-width" id="item-save-btn">${t('save')}</button>
    </div>`;

  const closeSheet = showBottomSheet(t('addItem'), formHTML);
  setTimeout(() => {
    document.getElementById('item-name')?.focus();
    document.getElementById('item-save-btn')?.addEventListener('click', async () => {
      const itemName = document.getElementById('item-name')?.value?.trim();
      const note = document.getElementById('item-note')?.value?.trim() || '';
      if (!itemName) { showToast(t('enterName'), 'error'); return; }
      try {
        if (existing) {
          await updateSupplierItem({ ...existing, itemName, note });
        } else {
          await addSupplierItem(supplierId, itemName, note);
        }
        showToast(t('savedSuccess'));
        closeSheet();
        await renderItemList(supplierId);
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    });
  }, 100);
}

window._notesSelectSupplier = async function(id) {
  selectedSupplierId = id;
  await renderSupplierList();
};

window._notesEditSupplier = async function(id) {
  const suppliers = await getAllSuppliers();
  const sup = suppliers.find(s => s.id === id);
  if (sup) openAddSupplierForm(sup);
};

window._notesDeleteSupplier = function(id, name) {
  showConfirm(`${t('delete')} "${name}" ${t('supplier')}?`, async () => {
    await deleteSupplier(id);
    showToast(t('deletedSuccess'));
    if (selectedSupplierId === id) selectedSupplierId = null;
    await renderSupplierList();
  });
};

window._notesEditItem = async function(id) {
  const items = await getItemsBySupplier(selectedSupplierId);
  const item = items.find(i => i.id === id);
  if (item) openAddItemForm(selectedSupplierId, item);
};

window._notesDeleteItem = function(id, name) {
  showConfirm(`${t('delete')} "${name}"?`, async () => {
    await deleteSupplierItem(id);
    showToast(t('deletedSuccess'));
    await renderItemList(selectedSupplierId);
  });
};

async function doNotesSearch() {
  const q = document.getElementById('notes-search')?.value?.trim() || '';
  await renderSupplierList(q);
}
