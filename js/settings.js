/**
 * Settings Page Controller
 */

import { t, setLanguage, applyTranslations } from './i18n.js';
import { getSetting, setSetting, exportAllData, importAllData, clearAllData } from './db.js';
import { showToast, showConfirm } from './app.js';

export async function initSettings() {
  await loadSettings();
  setupSettingsHandlers();
}

async function loadSettings() {
  const lang = localStorage.getItem('mk_lang') || 'en';
  const rounding = await getSetting('weightRounding', '1');

  // Language radio
  const langRadios = document.querySelectorAll('input[name="settings-lang"]');
  langRadios.forEach(r => { r.checked = r.value === lang; });

  // Weight rounding radio
  const roundingRadios = document.querySelectorAll('input[name="settings-rounding"]');
  roundingRadios.forEach(r => { r.checked = r.value === String(rounding); });
}

function setupSettingsHandlers() {
  // Language change
  document.querySelectorAll('input[name="settings-lang"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      const lang = radio.value;
      setLanguage(lang);
      await setSetting('language', lang);
      applyTranslations();
      showToast(t('savedSuccess'));
    });
  });

  // Weight rounding change
  document.querySelectorAll('input[name="settings-rounding"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      await setSetting('weightRounding', radio.value);
      showToast(t('savedSuccess'));
    });
  });

  // Backup
  document.getElementById('settings-backup-btn')?.addEventListener('click', async () => {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `mk-store-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('backupSuccess'));
    } catch (err) {
      showToast(t('errorMsg'), 'error');
    }
  });

  // Restore
  document.getElementById('settings-restore-btn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importAllData(data);
        showToast(t('restoreSuccess'));
      } catch (err) {
        showToast(t('errorMsg'), 'error');
      }
    };
    input.click();
  });

  // Clear all data
  document.getElementById('settings-clear-btn')?.addEventListener('click', () => {
    showConfirm(t('clearConfirm'), async () => {
      // Double confirm via second prompt
      showConfirm('⚠️ ' + t('clearConfirm'), async () => {
        await clearAllData();
        showToast(t('deletedSuccess'));
      });
    });
  });
}
