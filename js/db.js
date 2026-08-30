/**
 * IndexedDB Wrapper — Mahalingeshwar Kirani Store
 * All financial data stored here. Never use localStorage for financial records.
 */

const DB_NAME = 'MKStoreDB';
const DB_VERSION = 1;

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // Collections store
      if (!db.objectStoreNames.contains('collections')) {
        const s = db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: true }); // one entry per date
      }

      // Purchases store (multiple per day allowed)
      if (!db.objectStoreNames.contains('purchases')) {
        const s = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('supplierId', 'supplierId', { unique: false });
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const s = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        s.createIndex('name', 'name', { unique: false });
      }

      // Credit transactions store
      if (!db.objectStoreNames.contains('credit_transactions')) {
        const s = db.createObjectStore('credit_transactions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('customerId', 'customerId', { unique: false });
        s.createIndex('date', 'date', { unique: false });
      }

      // Payments store
      if (!db.objectStoreNames.contains('payments')) {
        const s = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
        s.createIndex('customerId', 'customerId', { unique: false });
        s.createIndex('date', 'date', { unique: false });
      }

      // Suppliers store
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
      }

      // Supplier items store
      if (!db.objectStoreNames.contains('supplier_items')) {
        const s = db.createObjectStore('supplier_items', { keyPath: 'id', autoIncrement: true });
        s.createIndex('supplierId', 'supplierId', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

// ─── Generic CRUD helpers ──────────────────────────────────────────────────

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

export function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getById(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function add(storeName, record) {
  return new Promise((resolve, reject) => {
    const store = tx(storeName, 'readwrite');
    const now = new Date().toISOString();
    const rec = { ...record, createdAt: now, updatedAt: now };
    const req = store.add(rec);
    req.onsuccess = () => resolve({ ...rec, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export function put(storeName, record) {
  return new Promise((resolve, reject) => {
    const store = tx(storeName, 'readwrite');
    const rec = { ...record, updatedAt: new Date().toISOString() };
    const req = store.put(rec);
    req.onsuccess = () => resolve(rec);
    req.onerror = () => reject(req.error);
  });
}

export function remove(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getByIndexRange(storeName, indexName, lower, upper) {
  return new Promise((resolve, reject) => {
    const range = IDBKeyRange.bound(lower, upper);
    const req = tx(storeName).index(indexName).getAll(range);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Settings helpers ──────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
    req.onerror = () => reject(req.error);
  });
}

export async function setSetting(key, value) {
  await openDB();
  return put('settings', { key, value });
}

// ─── Collection helpers ────────────────────────────────────────────────────

export async function getCollectionByDate(date) {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx('collections').index('date').get(date);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCollection(date, amount, note = '') {
  await openDB();
  const existing = await getCollectionByDate(date);
  if (existing) {
    return put('collections', { ...existing, date, amount: parseFloat(amount) || 0, note });
  } else {
    return add('collections', { date, amount: parseFloat(amount) || 0, note });
  }
}

export async function getCollectionsInRange(startDate, endDate) {
  await openDB();
  return getByIndexRange('collections', 'date', startDate, endDate);
}

// ─── Purchase helpers ──────────────────────────────────────────────────────

export async function getPurchasesInRange(startDate, endDate) {
  await openDB();
  return getByIndexRange('purchases', 'date', startDate, endDate);
}

export async function getPurchasesByDate(date) {
  await openDB();
  return getByIndex('purchases', 'date', date);
}

export async function addPurchase(record) {
  await openDB();
  return add('purchases', {
    date: record.date,
    supplierId: record.supplierId || '',
    supplierName: record.supplierName || '',
    itemName: record.itemName || '',
    amount: parseFloat(record.amount) || 0,
    note: record.note || ''
  });
}

export async function updatePurchase(record) {
  await openDB();
  return put('purchases', {
    ...record,
    amount: parseFloat(record.amount) || 0
  });
}

export async function deletePurchase(id) {
  await openDB();
  return remove('purchases', id);
}

// ─── Customer helpers ──────────────────────────────────────────────────────

export async function getAllCustomers() {
  await openDB();
  return getAll('customers');
}

export async function addCustomer(name, phone = '', notes = '') {
  await openDB();
  return add('customers', { name, phone, notes });
}

export async function updateCustomer(record) {
  await openDB();
  return put('customers', record);
}

export async function deleteCustomer(id) {
  await openDB();
  return remove('customers', id);
}

// ─── Credit transaction helpers ────────────────────────────────────────────

export async function getCreditsByCustomer(customerId) {
  await openDB();
  return getByIndex('credit_transactions', 'customerId', customerId);
}

export async function addCredit(record) {
  await openDB();
  return add('credit_transactions', {
    customerId: record.customerId,
    date: record.date,
    amount: parseFloat(record.amount) || 0,
    items: record.items || '',
    notes: record.notes || '',
    status: 'unpaid'
  });
}

export async function updateCredit(record) {
  await openDB();
  return put('credit_transactions', record);
}

export async function deleteCredit(id) {
  await openDB();
  return remove('credit_transactions', id);
}

// ─── Payment helpers ───────────────────────────────────────────────────────

export async function getPaymentsByCustomer(customerId) {
  await openDB();
  return getByIndex('payments', 'customerId', customerId);
}

export async function addPayment(customerId, date, amount, notes = '') {
  await openDB();
  return add('payments', {
    customerId,
    date,
    amount: parseFloat(amount) || 0,
    notes
  });
}

// ─── Supplier helpers ──────────────────────────────────────────────────────

export async function getAllSuppliers() {
  await openDB();
  return getAll('suppliers');
}

export async function addSupplier(name) {
  await openDB();
  return add('suppliers', { name });
}

export async function updateSupplier(record) {
  await openDB();
  return put('suppliers', record);
}

export async function deleteSupplier(id) {
  await openDB();
  await remove('suppliers', id);
  // Also remove all items for this supplier
  const items = await getByIndex('supplier_items', 'supplierId', id);
  for (const item of items) await remove('supplier_items', item.id);
}

export async function getItemsBySupplier(supplierId) {
  await openDB();
  return getByIndex('supplier_items', 'supplierId', supplierId);
}

export async function addSupplierItem(supplierId, itemName, note = '') {
  await openDB();
  return add('supplier_items', { supplierId, itemName, note });
}

export async function updateSupplierItem(record) {
  await openDB();
  return put('supplier_items', record);
}

export async function deleteSupplierItem(id) {
  await openDB();
  return remove('supplier_items', id);
}

// ─── Full data export/import for backup ──────────────────────────────────

export async function exportAllData() {
  await openDB();
  const stores = ['collections', 'purchases', 'customers', 'credit_transactions',
    'payments', 'suppliers', 'supplier_items', 'settings'];
  const data = {};
  for (const s of stores) data[s] = await getAll(s);
  return data;
}

export async function importAllData(data) {
  await openDB();
  const stores = ['collections', 'purchases', 'customers', 'credit_transactions',
    'payments', 'suppliers', 'supplier_items', 'settings'];
  for (const storeName of stores) {
    if (!data[storeName]) continue;
    const store = tx(storeName, 'readwrite');
    store.clear();
    for (const record of data[storeName]) store.put(record);
  }
}

export async function clearAllData() {
  await openDB();
  const stores = ['collections', 'purchases', 'customers', 'credit_transactions',
    'payments', 'suppliers', 'supplier_items'];
  for (const storeName of stores) {
    tx(storeName, 'readwrite').clear();
  }
}
