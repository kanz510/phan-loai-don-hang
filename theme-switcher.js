/* Kem & May optional UI theme. Runs in <head> before deferred application scripts. */
(() => {
  'use strict';
  const key = 'kem-may-ui-theme-v1';
  const sheet = document.getElementById('liquidThemeStylesheet');
  const meta = document.querySelector('meta[name="theme-color"]');
  const originalThemeColor = meta?.getAttribute('content') || '';
  const normalize = value => value === 'liquid' ? 'liquid' : 'default';

  function apply(theme, persist = false) {
    const selected = normalize(theme);
    // The original styles.css is never edited or disabled.
    if (sheet) sheet.media = selected === 'liquid' ? 'all' : 'not all';
    document.documentElement.dataset.kemMayTheme = selected;
    if (meta) meta.setAttribute('content', selected === 'liquid' ? '#fbf3f7' : originalThemeColor);
    if (persist) {
      try { localStorage.setItem(key, selected); } catch { /* Storage may be unavailable. */ }
    }
    document.querySelectorAll('[data-ui-theme-choice]').forEach(button => {
      const active = button.dataset.uiThemeChoice === selected;
      button.setAttribute('aria-pressed', String(active));
    });
  }

  let initial = 'default';
  try { initial = localStorage.getItem(key); } catch { /* Keep default. */ }
  apply(initial);

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ui-theme-choice]').forEach(button => {
      button.addEventListener('click', () => apply(button.dataset.uiThemeChoice, true));
    });
    apply(document.documentElement.dataset.kemMayTheme);
  });

  window.addEventListener('storage', event => {
    if (event.key === key) apply(event.newValue);
  });
})();
