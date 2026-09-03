/**
 * Weight Calculator Controller
 * ₹ to Grams/Kg: Weight = CustomerAmount / PricePerKg × 1000
 */

import { t } from './i18n.js';
import { calculateWeight } from './calc.js';
import { getSetting } from './db.local.js';

let rounding = 1; // default: nearest 1 gram

export async function initWeightCalc() {
  rounding = parseInt(await getSetting('weightRounding', '1')) || 1;

  document.getElementById('wc-rounding-select')?.addEventListener('change', e => {
    rounding = parseInt(e.target.value) || 1;
  });

  // Set current rounding in select
  const sel = document.getElementById('wc-rounding-select');
  if (sel) sel.value = String(rounding);

  document.getElementById('wc-calc-btn')?.addEventListener('click', doWeightCalc);
  document.getElementById('wc-clear-btn')?.addEventListener('click', clearWeightCalc);

  // Live calculation on input
  ['wc-price', 'wc-amount'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', doWeightCalc);
  });
}

function doWeightCalc() {
  const pricePerKg = parseFloat(document.getElementById('wc-price')?.value) || 0;
  const custAmount = parseFloat(document.getElementById('wc-amount')?.value) || 0;

  const resultPanel = document.getElementById('wc-result-panel');
  if (!resultPanel) return;

  if (pricePerKg <= 0 || custAmount <= 0) {
    resultPanel.classList.remove('visible');
    return;
  }

  const res = calculateWeight(pricePerKg, custAmount, rounding);

  document.getElementById('wc-result-grams').textContent = `${res.grams.toFixed(0)} g`;
  document.getElementById('wc-result-kg').textContent = `${res.kg.toFixed(4)} kg`;

  // Calculation breakdown
  document.getElementById('wc-formula').textContent =
    `₹${custAmount} ÷ ₹${pricePerKg}/kg × 1000 = ${res.rawGrams.toFixed(4)} g ≈ ${res.grams} g`;

  document.getElementById('wc-result-display').textContent = `₹${custAmount} ≈ ${res.grams} Gram`;

  resultPanel.classList.add('visible');

  // Animate result
  const resultEl = document.getElementById('wc-result-grams');
  if (resultEl) {
    resultEl.style.transform = 'scale(1.15)';
    setTimeout(() => resultEl.style.transform = 'scale(1)', 200);
  }
}

function clearWeightCalc() {
  ['wc-price', 'wc-amount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const panel = document.getElementById('wc-result-panel');
  if (panel) panel.classList.remove('visible');
}
