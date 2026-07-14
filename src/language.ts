// 言語判定。判定方法は実行コンテキストで異なる。コンテンツスクリプトは LMS
// ページのログアウトボタンのラベルを読み取り、ポップアップは LMS の DOM を
// 持たないためブラウザのロケールを用いる。

import { Language } from './types';

/**
 * LMS ページの UI（ログアウトボタンのラベル）から言語を判定する。
 * LMS ページに注入されるコンテンツスクリプトで使用する。
 */
export function getLanguageFromPage(): Language {
  const logoutLink = document.querySelector<HTMLElement>(
    '#form-id > div > ul > li.logoutButtonFrame > a'
  );
  const logoutText = logoutLink?.textContent ?? '';
  return logoutText.includes('Logout') ? 'English' : '日本語';
}

/** ブラウザのロケールから言語を判定する。ポップアップで使用する。 */
export function getLanguageFromLocale(): Language {
  return navigator.language === 'ja-JP' ? '日本語' : 'English';
}
