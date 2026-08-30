/**
 * Firebase Firestore DB Wrapper — Mahalingeshwar Kirani Store
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, setDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYfM9sGZfW96VJn8_OAbODsYFV-Doz5Jw",
  authDomain: "namma-khate-db.firebaseapp.com",
  projectId: "namma-khate-db",
  storageBucket: "namma-khate-db.firebasestorage.app",
  messagingSenderId: "882768299196",
  appId: "1:882768299196:web:50521142f549c47b7e3cb9",
  measurementId: "G-0NK2GV76CX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export function openDB() {
  return Promise.resolve(db);
}

// ─── Generic CRUD helpers ──────────────────────────────────────────────────

async function getAll(colName) {
  const q = query(collection(db, colName));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

async function getById(colName, id) {
  const d = await getDoc(doc(db, colName, String(id)));
  return d.exists() ? { ...d.data(), id: d.id } : null;
}

async function addRecord(colName, record) {
  const now = new Date().toISOString();
  const rec = { ...record, createdAt: now, updatedAt: now };
  const dRef = await addDoc(collection(db, colName), rec);
  return { ...rec, id: dRef.id };
}

async function putRecord(colName, record) {
  const id = String(record.id);
  const rec = { ...record, updatedAt: new Date().toISOString() };
  delete rec.id;
  await updateDoc(doc(db, colName, id), rec);
  return { ...rec, id };
}

async function removeRecord(colName, id) {
  await deleteDoc(doc(db, colName, String(id)));
}

async function getByIndex(colName, field, value) {
  const q = query(collection(db, colName), where(field, '==', value));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

async function getByIndexRange(colName, field, lower, upper) {
  const q = query(collection(db, colName), where(field, '>=', lower), where(field, '<=', upper));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// ─── Settings helpers ──────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const d = await getDoc(doc(db, 'settings', String(key)));
  return d.exists() ? d.data().value : defaultValue;
}

export async function setSetting(key, value) {
  await setDoc(doc(db, 'settings', String(key)), { value });
}

// ─── Collection helpers ────────────────────────────────────────────────────

export async function getCollectionByDate(date) {
  const res = await getByIndex('collections', 'date', date);
  return res.length > 0 ? res[0] : null;
}

export async function saveCollection(date, amount, note = '') {
  const existing = await getCollectionByDate(date);
  if (existing) {
    return putRecord('collections', { ...existing, date, amount: parseFloat(amount) || 0, note });
  } else {
    return addRecord('collections', { date, amount: parseFloat(amount) || 0, note });
  }
}

export async function getCollectionsInRange(startDate, endDate) {
  return getByIndexRange('collections', 'date', startDate, endDate);
}

// ─── Purchase helpers ──────────────────────────────────────────────────────

export async function getPurchasesInRange(startDate, endDate) {
  return getByIndexRange('purchases', 'date', startDate, endDate);
}

export async function getPurchasesByDate(date) {
  return getByIndex('purchases', 'date', date);
}

export async function addPurchase(record) {
  return addRecord('purchases', {
    date: record.date,
    supplierId: record.supplierId || '',
    supplierName: record.supplierName || '',
    itemName: record.itemName || '',
    amount: parseFloat(record.amount) || 0,
    note: record.note || ''
  });
}

export async function updatePurchase(record) {
  return putRecord('purchases', {
    ...record,
    amount: parseFloat(record.amount) || 0
  });
}

export async function deletePurchase(id) {
  return removeRecord('purchases', id);
}

// ─── Customer helpers ──────────────────────────────────────────────────────

export async function getAllCustomers() {
  return getAll('customers');
}

export async function addCustomer(name, phone = '', notes = '') {
  return addRecord('customers', { name, phone, notes });
}

export async function updateCustomer(record) {
  return putRecord('customers', record);
}

export async function deleteCustomer(id) {
  return removeRecord('customers', id);
}

// ─── Credit transaction helpers ────────────────────────────────────────────

export async function getCreditsByCustomer(customerId) {
  return getByIndex('credit_transactions', 'customerId', customerId);
}

export async function addCredit(record) {
  return addRecord('credit_transactions', {
    customerId: record.customerId,
    date: record.date,
    amount: parseFloat(record.amount) || 0,
    items: record.items || '',
    notes: record.notes || '',
    status: 'unpaid'
  });
}

export async function updateCredit(record) {
  return putRecord('credit_transactions', record);
}

export async function deleteCredit(id) {
  return removeRecord('credit_transactions', id);
}

// ─── Payment helpers ───────────────────────────────────────────────────────

export async function getPaymentsByCustomer(customerId) {
  return getByIndex('payments', 'customerId', customerId);
}

export async function addPayment(customerId, date, amount, notes = '') {
  return addRecord('payments', {
    customerId,
    date,
    amount: parseFloat(amount) || 0,
    notes
  });
}

// ─── Supplier helpers ──────────────────────────────────────────────────────

export async function getAllSuppliers() {
  return getAll('suppliers');
}

export async function addSupplier(name) {
  return addRecord('suppliers', { name });
}

export async function updateSupplier(record) {
  return putRecord('suppliers', record);
}

export async function deleteSupplier(id) {
  await removeRecord('suppliers', id);
  const items = await getByIndex('supplier_items', 'supplierId', id);
  for (const item of items) await removeRecord('supplier_items', item.id);
}

export async function getItemsBySupplier(supplierId) {
  return getByIndex('supplier_items', 'supplierId', supplierId);
}

export async function addSupplierItem(supplierId, itemName, note = '') {
  return addRecord('supplier_items', { supplierId, itemName, note });
}

export async function updateSupplierItem(record) {
  return putRecord('supplier_items', record);
}

export async function deleteSupplierItem(id) {
  return removeRecord('supplier_items', id);
}

// ─── Full data export/import for backup ──────────────────────────────────
export async function exportAllData() { return {}; }
export async function importAllData(data) {}
export async function clearAllData() {}
