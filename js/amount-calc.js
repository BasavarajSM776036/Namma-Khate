/**
 * Amount Calculator Controller
 * Kg/Gram to ₹: Price = PricePerKg × (kg + grams/1000)
 */

import { t } from './i18n.js';
import { calculateAmount } from './calc.js';

export function initAmountCalc() {
  document.getElementById('ac-calc-btn')?.addEventListener('click', doAmountCalc);
  document.getElementById('ac-clear-btn')?.addEventListener('click', clearAmountCalc);

  // Live calculation
  ['ac-price', 'ac-kg', 'ac-grams'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', doAmountCalc);
  });
}

function doAmountCalc() {
  const price = parseFloat(document.getElementById('ac-price')?.value) || 0;
  const kg = parseFloat(document.getElementById('ac-kg')?.value) || 0;
  const grams = parseFloat(document.getElementById('ac-grams')?.value) || 0;

  const resultPanel = document.getElementById('ac-result-panel');
  if (!resultPanel) return;

  if (price <= 0 || (kg <= 0 && grams <= 0)) {
    resultPanel.classList.remove('visible');
    return;
  }

  const res = calculateAmount(price, kg, grams);

  document.getElementById('ac-result-price').textContent = `₹${res.priceDisplay}`;
  document.getElementById('ac-result-weight').textContent =
    kg > 0 && grams > 0
      ? `${kg} kg ${grams} g`
      : kg > 0
      ? `${kg} kg`
      : `${grams} g`;

  document.getElementById('ac-formula').textContent =
    `₹${price}/kg × ${res.totalKg.toFixed(4)} kg = ₹${res.priceDisplay}`;

  document.getElementById('ac-result-display').textContent =
    `${res.totalGrams.toFixed(0)}g → ₹${res.priceDisplay}`;

  resultPanel.classList.add('visible');

  // Animate
  const priceEl = document.getElementById('ac-result-price');
  if (priceEl) {
    priceEl.style.transform = 'scale(1.15)';
    setTimeout(() => priceEl.style.transform = 'scale(1)', 200);
  }
}

function clearAmountCalc() {
  ['ac-price', 'ac-kg', 'ac-grams'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const panel = document.getElementById('ac-result-panel');
  if (panel) panel.classList.remove('visible');
}
