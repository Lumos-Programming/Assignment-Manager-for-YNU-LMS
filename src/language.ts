// 言語判定。コンテンツスクリプトは LMS ページから、ポップアップは LMS の DOM を
// 持たないためブラウザのロケールから判定する。

import { Language } from './types';

// ログアウトボタンのラベルから判定（コンテンツスクリプト用）。
export function getLanguageFromPage(): Language {
  const logoutLink = document.querySelector<HTMLElement>(
    '#form-id > div > ul > li.logoutButtonFrame > a'
  );
  const logoutText = logoutLink?.textContent ?? '';
  return logoutText.includes('Logout') ? 'English' : '日本語';
}

// ブラウザのロケールから判定（ポップアップ用）。
export function getLanguageFromLocale(): Language {
  return navigator.language === 'ja-JP' ? '日本語' : 'English';
}
