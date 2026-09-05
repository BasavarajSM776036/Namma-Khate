/**
 * Grocery Inventory Page — Mahalingeshwar Kirani Store
 * Features:
 *  - Items in Kannada + English with shop price
 *  - Editable prices (rate changes frequently)
 *  - Today's market rate column (from reliable sources, Sep 2026)
 *  - In-stock ✓ toggle (tick = available, else shows "suggest to purchase")
 *  - Multi-brand support (e.g., multiple rice brands)
 *  - Add new item from top
 */

import { openDB, getAll, add, put, remove } from './db.local.js';
import { showToast } from './app.js';

// ─── Default Grocery Items ─────────────────────────────────────────────────
// marketRate: verified from Dept of Consumer Affairs / Karnataka retail reports Sep 2026
// marketRate = null means daily-variable commodity (e.g., fresh vegetables, eggs, milk vary daily)
// unit: per kg / per litre / per dozen / per piece

const DEFAULT_ITEMS = [
  // ── Rice ──
  {
    category: 'rice', categoryKn: 'ಅಕ್ಕಿ',
    nameEn: 'Sona Masoori Rice', nameKn: 'ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ',
    unit: 'kg', marketRate: 52, shopPrice: 56, brands: 'Sona Masoori, Gold Sona', inStock: true
  },
  {
    category: 'rice', categoryKn: 'ಅಕ್ಕಿ',
    nameEn: 'BPT / Sharbati Rice', nameKn: 'ಬಿಪಿಟಿ / ಶರಬತಿ ಅಕ್ಕಿ',
    unit: 'kg', marketRate: 48, shopPrice: 52, brands: 'BPT, Sharbati', inStock: true
  },
  {
    category: 'rice', categoryKn: 'ಅಕ್ಕಿ',
    nameEn: 'Idli Rice (Raw)', nameKn: 'ಇಡ್ಲಿ ಅಕ್ಕಿ',
    unit: 'kg', marketRate: 42, shopPrice: 46, brands: 'Local, Ponni', inStock: true
  },
  {
    category: 'rice', categoryKn: 'ಅಕ್ಕಿ',
    nameEn: 'Basmati Rice', nameKn: 'ಬಾಸ್ಮತಿ ಅಕ್ಕಿ',
    unit: 'kg', marketRate: 95, shopPrice: 105, brands: 'India Gate, Kohinoor, Daawat', inStock: false
  },

  // ── Dal / Pulses ──
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Tur Dal (Arhar)', nameKn: 'ತೊಗರಿ ಬೇಳೆ',
    unit: 'kg', marketRate: 124, shopPrice: 135, brands: '', inStock: true
  },
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Moong Dal', nameKn: 'ಹೆಸರು ಬೇಳೆ',
    unit: 'kg', marketRate: 112, shopPrice: 120, brands: '', inStock: true
  },
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Masoor Dal', nameKn: 'ಮಸೂರ ಬೇಳೆ',
    unit: 'kg', marketRate: 91, shopPrice: 100, brands: '', inStock: true
  },
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Urad Dal', nameKn: 'ಉದ್ದಿನ ಬೇಳೆ',
    unit: 'kg', marketRate: 123, shopPrice: 135, brands: '', inStock: true
  },
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Chana Dal', nameKn: 'ಕಡಲೆ ಬೇಳೆ',
    unit: 'kg', marketRate: 85, shopPrice: 95, brands: '', inStock: true
  },
  {
    category: 'dal', categoryKn: 'ಬೇಳೆ',
    nameEn: 'Green Gram (Whole)', nameKn: 'ಹೆಸರುಕಾಳು',
    unit: 'kg', marketRate: 110, shopPrice: 120, brands: '', inStock: false
  },

  // ── Atta / Flour ──
  {
    category: 'flour', categoryKn: 'ಹಿಟ್ಟು',
    nameEn: 'Wheat Flour (Atta)', nameKn: 'ಗೋಧಿ ಹಿಟ್ಟು',
    unit: 'kg', marketRate: 38, shopPrice: 44, brands: 'Aashirvaad, Shakti Bhog, Fortune', inStock: true
  },
  {
    category: 'flour', categoryKn: 'ಹಿಟ್ಟು',
    nameEn: 'Maida', nameKn: 'ಮೈದಾ ಹಿಟ್ಟು',
    unit: 'kg', marketRate: 36, shopPrice: 42, brands: '', inStock: true
  },
  {
    category: 'flour', categoryKn: 'ಹಿಟ್ಟು',
    nameEn: 'Ragi Flour', nameKn: 'ರಾಗಿ ಹಿಟ್ಟು',
    unit: 'kg', marketRate: 55, shopPrice: 62, brands: 'Aashirvaad, Local', inStock: true
  },
  {
    category: 'flour', categoryKn: 'ಹಿಟ್ಟು',
    nameEn: 'Besan (Chickpea Flour)', nameKn: 'ಕಡಲೆ ಹಿಟ್ಟು (ಬೇಸನ್)',
    unit: 'kg', marketRate: 75, shopPrice: 84, brands: '', inStock: true
  },

  // ── Oil ──
  {
    category: 'oil', categoryKn: 'ಎಣ್ಣೆ',
    nameEn: 'Sunflower Oil', nameKn: 'ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ',
    unit: 'litre', marketRate: 193, shopPrice: 210, brands: 'Fortune, Saffola, Sundrop', inStock: true
  },
  {
    category: 'oil', categoryKn: 'ಎಣ್ಣೆ',
    nameEn: 'Groundnut Oil', nameKn: 'ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ',
    unit: 'litre', marketRate: 210, shopPrice: 228, brands: 'Idhayam, Engine, Gold Winner', inStock: true
  },
  {
    category: 'oil', categoryKn: 'ಎಣ್ಣೆ',
    nameEn: 'Coconut Oil', nameKn: 'ತೆಂಗಿನ ಎಣ್ಣೆ',
    unit: 'litre', marketRate: 195, shopPrice: 215, brands: 'Parachute, KLF Nirmal', inStock: false
  },
  {
    category: 'oil', categoryKn: 'ಎಣ್ಣೆ',
    nameEn: 'Mustard Oil', nameKn: 'ಸಾಸಿವೆ ಎಣ್ಣೆ',
    unit: 'litre', marketRate: 175, shopPrice: 192, brands: 'Kachi Ghani', inStock: false
  },

  // ── Sugar / Jaggery ──
  {
    category: 'sweetener', categoryKn: 'ಸಿಹಿ',
    nameEn: 'Sugar', nameKn: 'ಸಕ್ಕರೆ',
    unit: 'kg', marketRate: 65, shopPrice: 72, brands: '', inStock: true
  },
  {
    category: 'sweetener', categoryKn: 'ಸಿಹಿ',
    nameEn: 'Jaggery (Bella)', nameKn: 'ಬೆಲ್ಲ',
    unit: 'kg', marketRate: null, shopPrice: 65, brands: 'Local Block, Organic', inStock: true
  },

  // ── Salt & Spices ──
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Iodized Salt', nameKn: 'ಉಪ್ಪು (ಅಯೋಡೀಕೃತ)',
    unit: 'kg', marketRate: 20, shopPrice: 24, brands: 'Tata Salt, Captain Cook', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Red Chilli Powder', nameKn: 'ಕೆಂಪು ಮೆಣಸಿನ ಪುಡಿ',
    unit: 'kg', marketRate: 280, shopPrice: 310, brands: 'Everest, MDH, Local', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Turmeric Powder', nameKn: 'ಅರಿಶಿನ ಪುಡಿ',
    unit: 'kg', marketRate: 180, shopPrice: 200, brands: 'Everest, MDH', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Coriander Powder', nameKn: 'ಕೊತ್ತಂಬರಿ ಪುಡಿ',
    unit: 'kg', marketRate: 130, shopPrice: 145, brands: 'Everest, MDH', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Cumin (Jeera)', nameKn: 'ಜೀರಿಗೆ',
    unit: 'kg', marketRate: 350, shopPrice: 385, brands: '', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Mustard Seeds', nameKn: 'ಸಾಸಿವೆ',
    unit: 'kg', marketRate: 90, shopPrice: 100, brands: '', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Asafoetida (Hing)', nameKn: 'ಇಂಗು',
    unit: 'kg', marketRate: 1200, shopPrice: 1350, brands: 'Catch, MDH', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Sambar Powder', nameKn: 'ಸಾಂಬಾರ್ ಪುಡಿ',
    unit: 'kg', marketRate: 200, shopPrice: 225, brands: 'Everest, MTR, Local', inStock: true
  },
  {
    category: 'spices', categoryKn: 'ಮಸಾಲೆ',
    nameEn: 'Rasam Powder', nameKn: 'ರಸಂ ಪುಡಿ',
    unit: 'kg', marketRate: 190, shopPrice: 210, brands: 'Everest, MTR', inStock: true
  },

  // ── Tea / Coffee ──
  {
    category: 'beverages', categoryKn: 'ಪಾನೀಯ',
    nameEn: 'Tea Powder', nameKn: 'ಚಹಾ ಪುಡಿ',
    unit: 'kg', marketRate: 380, shopPrice: 420, brands: 'Red Label, Taj Mahal, 3 Roses', inStock: true
  },
  {
    category: 'beverages', categoryKn: 'ಪಾನೀಯ',
    nameEn: 'Coffee Powder', nameKn: 'ಕಾಫಿ ಪುಡಿ',
    unit: 'kg', marketRate: 450, shopPrice: 500, brands: 'Bru, Nescafe, Coorg', inStock: true
  },
  {
    category: 'beverages', categoryKn: 'ಪಾನೀಯ',
    nameEn: 'Horlicks / Boost', nameKn: 'ಹಾರ್ಲಿಕ್ಸ್ / ಬೂಸ್ಟ್',
    unit: 'kg', marketRate: 800, shopPrice: 880, brands: 'Horlicks, Boost, Milo', inStock: false
  },

  // ── Soaps & Detergents ──
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Washing Soap', nameKn: 'ಬಟ್ಟೆ ಸೋಪು',
    unit: 'piece', marketRate: 45, shopPrice: 52, brands: 'Rin, Wheel, Ghadi', inStock: true
  },
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Bathing Soap', nameKn: 'ಸ್ನಾನದ ಸೋಪು',
    unit: 'piece', marketRate: 42, shopPrice: 48, brands: 'Hamam, Lifebuoy, Pears, Dove', inStock: true
  },
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Washing Powder', nameKn: 'ಬಟ್ಟೆ ಪೌಡರ್',
    unit: 'kg', marketRate: 110, shopPrice: 125, brands: 'Surf Excel, Ariel, Nirma, Tide', inStock: true
  },
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Dish Wash Bar', nameKn: 'ಪಾತ್ರೆ ತೊಳೆಯುವ ಸೋಪು',
    unit: 'piece', marketRate: 25, shopPrice: 30, brands: 'Vim, Pril, Exo', inStock: true
  },
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Toothpaste', nameKn: 'ಹಲ್ಲು ಪೇಸ್ಟ್',
    unit: 'piece', marketRate: 85, shopPrice: 95, brands: 'Colgate, Pepsodent, Sensodyne', inStock: true
  },
  {
    category: 'household', categoryKn: 'ಗೃಹಬಳಕೆ',
    nameEn: 'Shampoo (Sachet)', nameKn: 'ಶ್ಯಾಂಪೂ (ಪ್ಯಾಕೆಟ್)',
    unit: 'piece', marketRate: 5, shopPrice: 6, brands: 'Clinic Plus, Sunsilk, Head & Shoulders', inStock: true
  },

  // ── Grains & Cereals ──
  {
    category: 'grains', categoryKn: 'ಧಾನ್ಯ',
    nameEn: 'Poha (Flattened Rice)', nameKn: 'ಅವಲಕ್ಕಿ',
    unit: 'kg', marketRate: 55, shopPrice: 62, brands: 'Local, MTR', inStock: true
  },
  {
    category: 'grains', categoryKn: 'ಧಾನ್ಯ',
    nameEn: 'Semolina (Rava/Sooji)', nameKn: 'ರವೆ / ಸೂಜಿ',
    unit: 'kg', marketRate: 42, shopPrice: 48, brands: 'MTR, Aashirvaad', inStock: true
  },
  {
    category: 'grains', categoryKn: 'ಧಾನ್ಯ',
    nameEn: 'Vermicelli (Shavige)', nameKn: 'ಶಾವಿಗೆ',
    unit: 'kg', marketRate: 80, shopPrice: 90, brands: 'MTR, Bambino', inStock: true
  },

  // ── Packed / Ready Foods ──
  {
    category: 'packed', categoryKn: 'ಪ್ಯಾಕ್ ಉತ್ಪನ್ನ',
    nameEn: 'Biscuits', nameKn: 'ಬಿಸ್ಕೆಟ್',
    unit: 'piece', marketRate: 10, shopPrice: 12, brands: 'Parle-G, Bourbon, Good Day, Hide & Seek', inStock: true
  },
  {
    category: 'packed', categoryKn: 'ಪ್ಯಾಕ್ ಉತ್ಪನ್ನ',
    nameEn: 'Noodles', nameKn: 'ನೂಡಲ್ಸ್',
    unit: 'piece', marketRate: 14, shopPrice: 16, brands: 'Maggi, Yippee, Top Ramen', inStock: true
  },
  {
    category: 'packed', categoryKn: 'ಪ್ಯಾಕ್ ಉತ್ಪನ್ನ',
    nameEn: 'Tomato Sauce / Ketchup', nameKn: 'ಟೊಮ್ಯಾಟೊ ಸಾಸ್',
    unit: 'piece', marketRate: 85, shopPrice: 95, brands: 'Kissan, Maggi, Heinz', inStock: false
  },

  // ── Dry Fruits ──
  {
    category: 'dryfruits', categoryKn: 'ಒಣ ಹಣ್ಣು',
    nameEn: 'Cashew Nuts', nameKn: 'ಗೋಡಂಬಿ',
    unit: 'kg', marketRate: 950, shopPrice: 1050, brands: '', inStock: false
  },
  {
    category: 'dryfruits', categoryKn: 'ಒಣ ಹಣ್ಣು',
    nameEn: 'Raisins', nameKn: 'ದ್ರಾಕ್ಷಿ (ಒಣ)',
    unit: 'kg', marketRate: 250, shopPrice: 280, brands: '', inStock: false
  },

  // ── Daily Use ──
  {
    category: 'daily', categoryKn: 'ದೈನಂದಿನ',
    nameEn: 'Matchbox', nameKn: 'ಬೆಂಕಿ ಪೊಟ್ಟಣ',
    unit: 'piece', marketRate: 3, shopPrice: 3, brands: 'Wimco', inStock: true
  },
  {
    category: 'daily', categoryKn: 'ದೈನಂದಿನ',
    nameEn: 'Incense Sticks (Agarbathi)', nameKn: 'ಅಗರಬತ್ತಿ',
    unit: 'piece', marketRate: 20, shopPrice: 25, brands: 'Cycle, Puja', inStock: true
  },
  {
    category: 'daily', categoryKn: 'ದೈನಂದಿನ',
    nameEn: 'Coconut (Dry)', nameKn: 'ಒಣ ತೆಂಗಿನಕಾಯಿ',
    unit: 'piece', marketRate: null, shopPrice: 35, brands: '', inStock: true
  },
];

const CATEGORY_ORDER = ['rice','dal','flour','oil','sweetener','spices','beverages','grains','household','packed','dryfruits','daily'];

const CATEGORY_LABELS = {
  rice:      { en: 'Rice', kn: 'ಅಕ್ಕಿ' },
  dal:       { en: 'Dal / Pulses', kn: 'ಬೇಳೆ / ದ್ವಿದಳ' },
  flour:     { en: 'Flour & Atta', kn: 'ಹಿಟ್ಟು' },
  oil:       { en: 'Oils', kn: 'ಎಣ್ಣೆ' },
  sweetener: { en: 'Sugar & Jaggery', kn: 'ಸಕ್ಕರೆ & ಬೆಲ್ಲ' },
  spices:    { en: 'Spices', kn: 'ಮಸಾಲೆ' },
  beverages: { en: 'Tea & Coffee', kn: 'ಚಹಾ & ಕಾಫಿ' },
  grains:    { en: 'Grains & Cereals', kn: 'ಧಾನ್ಯ' },
  household: { en: 'Household', kn: 'ಗೃಹಬಳಕೆ' },
  packed:    { en: 'Packed Foods', kn: 'ಪ್ಯಾಕ್ ಉತ್ಪನ್ನ' },
  dryfruits: { en: 'Dry Fruits', kn: 'ಒಣ ಹಣ್ಣು' },
  daily:     { en: 'Daily Use', kn: 'ದೈನಂದಿನ' },
};

// ─── DB helpers ────────────────────────────────────────────────────────────

async function getGroceryItems() {
  await openDB();
  return getAll('grocery_items');
}

async function saveGroceryItem(item) {
  await openDB();
  if (item.id) {
    return put('grocery_items', item);
  } else {
    return add('grocery_items', item);
  }
}

async function deleteGroceryItem(id) {
  await openDB();
  return remove('grocery_items', id);
}

// ─── Seed defaults if DB is empty ─────────────────────────────────────────

async function seedDefaultsIfEmpty() {
  const existing = await getGroceryItems();
  if (existing.length === 0) {
    for (const item of DEFAULT_ITEMS) {
      await add('grocery_items', {
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
}

// ─── State ─────────────────────────────────────────────────────────────────

let allItems = [];
let filterInStock = 'all';   // 'all' | 'instock' | 'outofstock'
let filterCategory = 'all';
let searchQuery = '';

// ─── Render ────────────────────────────────────────────────────────────────

export async function initGrocery() {
  await openDB();
  await seedDefaultsIfEmpty();
  allItems = await getGroceryItems();
  renderGroceryPage();
  attachGroceryEvents();
}

function renderGroceryPage() {
  const container = document.getElementById('grocery-list-container');
  if (!container) return;

  // Filter
  let items = [...allItems];
  if (filterInStock === 'instock') items = items.filter(i => i.inStock);
  if (filterInStock === 'outofstock') items = items.filter(i => !i.inStock);
  if (filterCategory !== 'all') items = items.filter(i => i.category === filterCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i =>
      i.nameEn.toLowerCase().includes(q) ||
      i.nameKn.includes(q) ||
      (i.brands || '').toLowerCase().includes(q)
    );
  }

  // Group by category
  const grouped = {};
  for (const cat of CATEGORY_ORDER) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) grouped[cat] = catItems;
  }
  // Any custom categories not in CATEGORY_ORDER
  for (const item of items) {
    if (!CATEGORY_ORDER.includes(item.category)) {
      if (!grouped[item.category]) grouped[item.category] = [];
      if (!grouped[item.category].find(i => i.id === item.id)) {
        grouped[item.category].push(item);
      }
    }
  }

  // Stats
  const total = allItems.length;
  const inStock = allItems.filter(i => i.inStock).length;
  const outOfStock = allItems.filter(i => !i.inStock).length;
  document.getElementById('grocery-stat-total').textContent = total;
  document.getElementById('grocery-stat-instock').textContent = inStock;
  document.getElementById('grocery-stat-outofstock').textContent = outOfStock;

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = `
      <div class="grocery-empty">
        <div class="grocery-empty-icon">🛒</div>
        <div class="grocery-empty-text">No items found</div>
        <div class="grocery-empty-sub">Add items using the + button above</div>
      </div>`;
    return;
  }

  let html = '';
  for (const [cat, catItems] of Object.entries(grouped)) {
    const label = CATEGORY_LABELS[cat] || { en: cat, kn: cat };
    html += `
      <div class="grocery-category-block">
        <div class="grocery-cat-header">
          <span class="grocery-cat-icon">${getCatIcon(cat)}</span>
          <span class="grocery-cat-name-en">${label.en}</span>
          <span class="grocery-cat-name-kn">${label.kn}</span>
          <span class="grocery-cat-count">${catItems.length}</span>
        </div>
        <div class="grocery-table-wrap">
          <table class="grocery-table">
            <thead>
              <tr>
                <th class="col-check"></th>
                <th class="col-name">Item / ವಸ್ತು</th>
                <th class="col-shop">Shop Price<br><small>ಅಂಗಡಿ ದರ</small></th>
                <th class="col-market">Market Rate<br><small>ಮಾರುಕಟ್ಟೆ ದರ</small></th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              ${catItems.map(item => renderItemRow(item)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Purchase suggestions (out of stock items)
  const needPurchase = allItems.filter(i => !i.inStock);
  if (needPurchase.length > 0) {
    html += `
      <div class="grocery-suggest-block">
        <div class="grocery-suggest-header">
          <span>🛍️</span>
          <span>Purchase Suggestions / ಖರೀದಿ ಸಲಹೆ</span>
          <span class="grocery-suggest-badge">${needPurchase.length}</span>
        </div>
        <div class="grocery-suggest-grid">
          ${needPurchase.map(item => `
            <div class="grocery-suggest-card">
              <div class="grocery-suggest-name-kn">${item.nameKn}</div>
              <div class="grocery-suggest-name-en">${item.nameEn}</div>
              ${item.brands ? `<div class="grocery-suggest-brands">Brands: ${item.brands}</div>` : ''}
              <div class="grocery-suggest-price">₹${item.shopPrice}/${item.unit}</div>
              <button class="grocery-suggest-btn-instock" data-id="${item.id}" title="Mark as In Stock">✓ Got It</button>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  container.innerHTML = html;

  // Attach row-level events
  container.querySelectorAll('.grocery-toggle-stock').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(btn.dataset.id);
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      item.inStock = !item.inStock;
      await saveGroceryItem(item);
      allItems = await getGroceryItems();
      renderGroceryPage();
    });
  });

  container.querySelectorAll('.grocery-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      openEditModal(id);
    });
  });

  container.querySelectorAll('.grocery-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      if (confirm(`Delete "${item.nameEn}"?`)) {
        await deleteGroceryItem(id);
        allItems = await getGroceryItems();
        renderGroceryPage();
        showToast('Item deleted', 'success');
      }
    });
  });

  container.querySelectorAll('.grocery-suggest-btn-instock').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      item.inStock = true;
      await saveGroceryItem(item);
      allItems = await getGroceryItems();
      renderGroceryPage();
      showToast(`${item.nameEn} marked as In Stock ✓`, 'success');
    });
  });
}

function renderItemRow(item) {
  const inStock = item.inStock;
  const marketRateDisplay = item.marketRate !== null && item.marketRate !== undefined
    ? `₹${item.marketRate}/${item.unit}`
    : `<span class="market-rate-varies">Daily varies</span>`;

  const priceDiff = (item.marketRate !== null && item.marketRate !== undefined)
    ? item.shopPrice - item.marketRate
    : null;
  const diffClass = priceDiff !== null ? (priceDiff > 0 ? 'price-above' : 'price-below') : '';
  const diffLabel = priceDiff !== null ? `<span class="price-diff ${diffClass}">${priceDiff > 0 ? '+' : ''}${priceDiff}</span>` : '';

  return `
    <tr class="grocery-row ${inStock ? 'row-instock' : 'row-outstock'}">
      <td class="col-check">
        <button class="grocery-toggle-stock ${inStock ? 'btn-instock' : 'btn-outstock'}" data-id="${item.id}" title="${inStock ? 'In Stock — click to mark out' : 'Out of Stock — click to mark in'}">
          ${inStock ? '✓' : '✗'}
        </button>
      </td>
      <td class="col-name">
        <div class="item-name-kn">${item.nameKn}</div>
        <div class="item-name-en">${item.nameEn}</div>
        ${item.brands ? `<div class="item-brands">🏷 ${item.brands}</div>` : ''}
        ${!inStock ? '<span class="out-badge">Out of Stock</span>' : ''}
      </td>
      <td class="col-shop">
        <div class="shop-price">₹${item.shopPrice}</div>
        <div class="price-unit">/${item.unit}</div>
        ${diffLabel}
      </td>
      <td class="col-market market-rate-cell">
        ${marketRateDisplay}
      </td>
      <td class="col-actions">
        <button class="grocery-edit-btn icon-btn" data-id="${item.id}" title="Edit">✏️</button>
        <button class="grocery-delete-btn icon-btn danger-icon-btn" data-id="${item.id}" title="Delete">🗑️</button>
      </td>
    </tr>`;
}

function getCatIcon(cat) {
  const icons = {
    rice: '🍚', dal: '🫘', flour: '🌾', oil: '🫙', sweetener: '🍬',
    spices: '🌶️', beverages: '☕', grains: '🌽', household: '🧹',
    packed: '📦', dryfruits: '🥜', daily: '🕯️'
  };
  return icons[cat] || '📦';
}

// ─── Events ────────────────────────────────────────────────────────────────

function attachGroceryEvents() {
  // Search
  const searchInput = document.getElementById('grocery-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderGroceryPage();
    });
  }

  // Filter tabs
  document.querySelectorAll('.grocery-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.grocery-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterInStock = tab.dataset.filter;
      renderGroceryPage();
    });
  });

  // Category filter
  const catSelect = document.getElementById('grocery-cat-filter');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      filterCategory = e.target.value;
      renderGroceryPage();
    });
  }

  // Add item button
  const addBtn = document.getElementById('grocery-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAddModal());
  }
}

// ─── Add / Edit Modal ──────────────────────────────────────────────────────

function openAddModal() {
  openItemModal(null);
}

function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  openItemModal(item);
}

function openItemModal(item) {
  const isEdit = !!item;
  const modal = document.getElementById('grocery-item-modal');
  const overlay = document.getElementById('grocery-modal-overlay');
  if (!modal || !overlay) return;

  document.getElementById('grocery-modal-title').textContent = isEdit ? '✏️ Edit Item' : '➕ Add New Item';

  // Populate form
  document.getElementById('gm-name-en').value = item ? item.nameEn : '';
  document.getElementById('gm-name-kn').value = item ? item.nameKn : '';
  document.getElementById('gm-category').value = item ? item.category : 'rice';
  document.getElementById('gm-unit').value = item ? item.unit : 'kg';
  document.getElementById('gm-shop-price').value = item ? item.shopPrice : '';
  document.getElementById('gm-market-rate').value = (item && item.marketRate !== null && item.marketRate !== undefined) ? item.marketRate : '';
  document.getElementById('gm-brands').value = item ? (item.brands || '') : '';
  document.getElementById('gm-instock').checked = item ? item.inStock : true;
  document.getElementById('gm-item-id').value = item ? item.id : '';

  modal.classList.add('active');
  overlay.classList.add('active');

  // Save
  const saveBtn = document.getElementById('gm-save-btn');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.addEventListener('click', async () => {
    const nameEn = document.getElementById('gm-name-en').value.trim();
    const nameKn = document.getElementById('gm-name-kn').value.trim();
    const category = document.getElementById('gm-category').value;
    const unit = document.getElementById('gm-unit').value;
    const shopPrice = parseFloat(document.getElementById('gm-shop-price').value) || 0;
    const marketRateRaw = document.getElementById('gm-market-rate').value.trim();
    const marketRate = marketRateRaw === '' ? null : parseFloat(marketRateRaw) || null;
    const brands = document.getElementById('gm-brands').value.trim();
    const inStock = document.getElementById('gm-instock').checked;
    const idVal = document.getElementById('gm-item-id').value;

    if (!nameEn) { showToast('Enter item name (English)', 'error'); return; }
    if (shopPrice <= 0) { showToast('Enter valid shop price', 'error'); return; }

    const record = {
      nameEn, nameKn, category,
      categoryKn: (CATEGORY_LABELS[category] || {}).kn || category,
      unit, shopPrice, marketRate, brands, inStock
    };
    if (idVal) record.id = parseInt(idVal);

    await saveGroceryItem(record);
    allItems = await getGroceryItems();
    closeGroceryModal();
    renderGroceryPage();
    showToast(isEdit ? 'Item updated ✓' : 'Item added ✓', 'success');
  });

  // Close
  const closeBtn = document.getElementById('gm-close-btn');
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener('click', closeGroceryModal);
  overlay.onclick = closeGroceryModal;
}

function closeGroceryModal() {
  document.getElementById('grocery-item-modal')?.classList.remove('active');
  document.getElementById('grocery-modal-overlay')?.classList.remove('active');
}
