// Language detection. Detection differs by context: content scripts read the
// LMS page's logout button label, while the popup has no LMS DOM and relies on
// the browser locale.

import { Language } from './types';

/**
 * Detect the language from the LMS page chrome (the logout button label).
 * Used by content scripts injected into LMS pages.
 */
export function getLanguageFromPage(): Language {
  const logoutLink = document.querySelector<HTMLElement>(
    '#form-id > div > ul > li.logoutButtonFrame > a'
  );
  const logoutText = logoutLink?.textContent ?? '';
  return logoutText.includes('Logout') ? 'English' : '日本語';
}

/** Detect the language from the browser locale. Used by the popup. */
export function getLanguageFromLocale(): Language {
  return navigator.language === 'ja-JP' ? '日本語' : 'English';
}
