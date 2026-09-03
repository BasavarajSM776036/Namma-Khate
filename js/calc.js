/**
 * Central Calculation Engine — Mahalingeshwar Kirani Store
 * ALL financial totals are calculated here from original transaction records.
 * NEVER duplicate this logic in UI code.
 */

import {
  getCollectionsInRange,
  getPurchasesInRange,
  getCreditsByCustomer,
  getPaymentsByCustomer,
  getAllCustomers
} from './db.local.js';

// ─── Date Utilities ────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD string for a given Date object, in local time (no UTC shift) */
export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD string to local Date object */
export function fromDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Returns today's date string in YYYY-MM-DD format */
export function todayStr() {
  return toDateStr(new Date());
}

/**
 * Get the Monday–Sunday week boundaries for a given date string.
 * Returns { monday: 'YYYY-MM-DD', sunday: 'YYYY-MM-DD', dates: [...7 dateStrs] }
 */
export function getWeekBounds(dateStr) {
  const d = fromDateStr(dateStr);
  const day = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  // Adjust to Monday=0 index
  const diffToMonday = (day === 0) ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    dates.push(toDateStr(dt));
  }

  return {
    monday: dates[0],
    sunday: dates[6],
    dates // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  };
}

/**
 * Get the full calendar month boundaries for a year+month (1-indexed month).
 */
export function getMonthBounds(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // day 0 of next month = last day of this month
  return {
    start: toDateStr(firstDay),
    end: toDateStr(lastDay)
  };
}

/**
 * Get the full calendar year boundaries.
 */
export function getYearBounds(year) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
}

// ─── Collection Calculations ───────────────────────────────────────────────

/** Sum collections for a specific date */
export async function getDailyCollection(dateStr) {
  const records = await getCollectionsInRange(dateStr, dateStr);
  return records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
}

/** Sum collections from startDate to endDate (inclusive) */
export async function getRangeCollection(startDate, endDate) {
  const records = await getCollectionsInRange(startDate, endDate);
  return records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
}

/** Get weekly collection total (Mon–Sun week containing the given date) */
export async function getWeeklyCollection(dateStr) {
  const { monday, sunday } = getWeekBounds(dateStr);
  return getRangeCollection(monday, sunday);
}

/** Get monthly collection total for a calendar month */
export async function getMonthlyCollection(year, month) {
  const { start, end } = getMonthBounds(year, month);
  return getRangeCollection(start, end);
}

/** Get yearly collection total */
export async function getYearlyCollection(year) {
  const { start, end } = getYearBounds(year);
  return getRangeCollection(start, end);
}

// ─── Purchase Calculations ─────────────────────────────────────────────────

/** Sum purchases for a specific date */
export async function getDailyPurchase(dateStr) {
  const records = await getPurchasesInRange(dateStr, dateStr);
  return records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
}

/** Sum purchases from startDate to endDate (inclusive) */
export async function getRangePurchase(startDate, endDate) {
  const records = await getPurchasesInRange(startDate, endDate);
  return records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
}

/** Get weekly purchase total (Mon–Sun week) */
export async function getWeeklyPurchase(dateStr) {
  const { monday, sunday } = getWeekBounds(dateStr);
  return getRangePurchase(monday, sunday);
}

/** Get monthly purchase total for a calendar month */
export async function getMonthlyPurchase(year, month) {
  const { start, end } = getMonthBounds(year, month);
  return getRangePurchase(start, end);
}

/** Get yearly purchase total */
export async function getYearlyPurchase(year) {
  const { start, end } = getYearBounds(year);
  return getRangePurchase(start, end);
}

// ─── Profit Calculations ───────────────────────────────────────────────────

/** Profit = Collection − Purchase for any date range */
export async function getProfit(startDate, endDate) {
  const [col, pur] = await Promise.all([
    getRangeCollection(startDate, endDate),
    getRangePurchase(startDate, endDate)
  ]);
  return { collection: col, purchase: pur, profit: col - pur };
}

export async function getWeeklyProfit(dateStr) {
  const { monday, sunday } = getWeekBounds(dateStr);
  return getProfit(monday, sunday);
}

export async function getMonthlyProfit(year, month) {
  const { start, end } = getMonthBounds(year, month);
  return getProfit(start, end);
}

export async function getYearlyProfit(year) {
  const { start, end } = getYearBounds(year);
  return getProfit(start, end);
}

// ─── Dashboard Summary ─────────────────────────────────────────────────────

export async function getDashboardSummary(dateStr) {
  const [colToday, purToday, weekProfit, monthProfit] = await Promise.all([
    getDailyCollection(dateStr),
    getDailyPurchase(dateStr),
    getWeeklyProfit(dateStr),
    getMonthlyProfit(
      fromDateStr(dateStr).getFullYear(),
      fromDateStr(dateStr).getMonth() + 1
    )
  ]);

  return {
    today: {
      collection: colToday,
      purchase: purToday,
      netDifference: colToday - purToday
    },
    week: weekProfit,
    month: monthProfit
  };
}

// ─── Customer / Udri Calculations ──────────────────────────────────────────

/**
 * Get customer's outstanding balance.
 * Outstanding = total credit amounts − total payment amounts
 */
export async function getCustomerOutstanding(customerId) {
  const [credits, payments] = await Promise.all([
    getCreditsByCustomer(customerId),
    getPaymentsByCustomer(customerId)
  ]);

  const totalCredit = credits.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const outstanding = totalCredit - totalPaid;

  let status = 'unpaid';
  if (outstanding <= 0) status = 'paid';
  else if (totalPaid > 0) status = 'partial';

  return { totalCredit, totalPaid, outstanding: Math.max(0, outstanding), status };
}

/**
 * Get total outstanding across ALL customers
 */
export async function getTotalOutstanding() {
  const customers = await getAllCustomers();
  let total = 0;
  for (const c of customers) {
    const { outstanding } = await getCustomerOutstanding(c.id);
    total += outstanding;
  }
  return total;
}

// ─── Weight Calculator ─────────────────────────────────────────────────────

/**
 * Calculate weight for a given customer amount and price per kg.
 * Returns weight in kg and grams.
 */
export function calculateWeight(pricePerKg, customerAmount, roundingGrams = 1) {
  const p = parseFloat(pricePerKg) || 0;
  const a = parseFloat(customerAmount) || 0;
  if (p === 0) return { kg: 0, grams: 0, rawGrams: 0 };

  const rawGrams = (a / p) * 1000;
  const roundedGrams = Math.round(rawGrams / roundingGrams) * roundingGrams;
  const roundedKg = roundedGrams / 1000;

  return {
    rawGrams,
    grams: roundedGrams,
    kg: roundedKg,
    kgDisplay: roundedKg >= 1
      ? `${Math.floor(roundedKg)} kg ${roundedGrams % 1000} g`
      : `${roundedGrams} g`
  };
}

// ─── Amount Calculator ─────────────────────────────────────────────────────

/**
 * Calculate price for a given weight and price per kg.
 * weightKg and weightGrams can be combined.
 */
export function calculateAmount(pricePerKg, weightKg, weightGrams) {
  const p = parseFloat(pricePerKg) || 0;
  const kg = parseFloat(weightKg) || 0;
  const g = parseFloat(weightGrams) || 0;
  const totalKg = kg + (g / 1000);
  const price = p * totalKg;
  return {
    totalKg,
    totalGrams: totalKg * 1000,
    price,
    priceDisplay: price.toFixed(2)
  };
}

// ─── Collection record count (for profit report) ───────────────────────────

export async function getCollectionDaysCount(startDate, endDate) {
  const records = await getCollectionsInRange(startDate, endDate);
  return records.filter(r => r.amount > 0).length;
}

export async function getPurchaseRecordCount(startDate, endDate) {
  const records = await getPurchasesInRange(startDate, endDate);
  return records.length;
}
