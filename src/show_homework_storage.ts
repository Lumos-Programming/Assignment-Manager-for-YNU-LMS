// show_homework_storage.ts
// LMS のトップ／コースページ用のコンテンツスクリプト。全課題の一覧（Grid.js で
// 描画）と、一覧に戻せる「完了した課題」セクションを表示する。

import { Grid, h, UserConfig } from 'gridjs';
import { jaJP } from 'gridjs/l10n';

import { getLanguageFromPage } from './language';
import { getMessages, Messages } from './i18n';
import { loadAssignments, loadPreferences, saveAssignments } from './storage';
import { Assignment, Language } from './types';

// gridjs はパッケージのルートから TCell 型を再エクスポートしていない。描画後の
// セルはプリミティブ・HTMLElement・値が props.content に入る Preact vnode の
// いずれか。ソート／検索のヘルパー用に必要な部分だけ型として定義する。
type GridCell = string | number | boolean | HTMLElement | { props?: unknown };
type GridLanguageTable = Record<string, unknown>;

const DISPLAY_LIMIT_DAYS = 31;
const MS_PER_DAY = 86400000;
const GAS_TASKAPI_URL =
  'https://script.google.com/macros/s/AKfycbxOkCMKIeXHZPxkVHZbQDlU6ezRRljwJdypjI9B4qA2l3oZqfgtxOzDr6jY1PoN9rTa6Q/exec';

const language: Language = getLanguageFromPage();
const messages: Messages = getMessages(language);

interface SelectionControls {
  controlsElem: HTMLElement;
  selectedCountElem: HTMLElement;
  actionBtn: HTMLButtonElement;
}

/* エントリポイント */
void injectAssignmentTable();

function getGridLanguage(): GridLanguageTable {
  if (language !== 'English') {
    // 元コードは gridjs の構造化された `search` エントリを文字列で上書きし、
    // ページネーションの表示文言に追記している。unknown を経由して橋渡しする。
    const ja = jaJP as unknown as {
      search: string;
      pagination: { results: string };
    };
    ja.search = '検索 (講義名, 課題名, 期限)';
    ja.pagination.results += ' ' + 'Shift押しながら項目選択で複数条件ソート';
    return ja as unknown as GridLanguageTable;
  }
  return {};
}

function isVisibleAssignment(assignment: Assignment): boolean {
  return assignment.isVisible !== false;
}

function getAssignmentSubject(assignment: Assignment): string {
  return language === 'English' ? assignment.subject_en : assignment.subject_ja;
}

function formatSelectedCount(count: number): string {
  return language === 'English' ? `${count} selected` : `${count}件選択中`;
}

function formatCompletedCount(count: number): string {
  return language === 'English'
    ? `${messages.completedAssignments} ${count}`
    : `${messages.completedAssignments} ${count}件`;
}

function createSecondaryButton(text: string): HTMLButtonElement {
  const buttonElem = document.createElement('button');
  buttonElem.innerText = text;
  buttonElem.style.marginRight = '8px';
  buttonElem.style.backgroundColor = 'white';
  buttonElem.style.color = '#2285b1';
  buttonElem.style.fontWeight = '700';
  buttonElem.style.border = '1px solid';
  return buttonElem;
}

function updateSelectedControls(
  selectedAssignments: Map<string, Assignment>,
  countElem: HTMLElement,
  actionBtn: HTMLButtonElement
): void {
  const selectedCount = selectedAssignments.size;
  countElem.innerText = formatSelectedCount(selectedCount);
  actionBtn.disabled = selectedCount === 0;
  actionBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
}

function showStatusMessage(container: HTMLElement, message: string): void {
  let statusElem = container.querySelector<HTMLElement>(
    '.assignment-manager-status'
  );
  if (!statusElem) {
    statusElem = document.createElement('p');
    statusElem.className = 'assignment-manager-status';
    statusElem.style.color = '#2285b1';
    statusElem.style.fontWeight = '700';
    statusElem.style.margin = '8px 0';
    container.prepend(statusElem);
  }
  statusElem.innerText = message;
}

async function setAssignmentsVisibility(
  assignments: Assignment[],
  isVisible: boolean
): Promise<void> {
  const updated = assignments.map((assignment) => {
    const next: Assignment = { ...assignment, isVisible };
    if (isVisible) {
      delete next.hiddenAt;
      delete next.hiddenReason;
    } else {
      next.hiddenAt = new Date().toJSON();
      next.hiddenReason = 'done';
    }
    return next;
  });
  await saveAssignments(updated);
}

function createSelectionControls(
  container: HTMLElement,
  selectedAssignments: Map<string, Assignment>
): SelectionControls {
  const controlsElem = document.createElement('div');
  controlsElem.style.display = 'flex';
  controlsElem.style.alignItems = 'center';
  controlsElem.style.gap = '8px';
  controlsElem.style.flexWrap = 'wrap';
  controlsElem.style.margin = '0 0 8px';

  const selectedCountElem = document.createElement('strong');
  selectedCountElem.innerText = messages.noneSelected;
  controlsElem.appendChild(selectedCountElem);

  const completeSelectedBtn = createSecondaryButton(messages.completeSelected);
  completeSelectedBtn.addEventListener('click', () => {
    const assignments = Array.from(selectedAssignments.values());
    if (assignments.length === 0) {
      showStatusMessage(container, messages.noneSelected);
      return;
    }
    void setAssignmentsVisibility(assignments, false).then(() =>
      window.location.reload()
    );
  });
  controlsElem.appendChild(completeSelectedBtn);

  updateSelectedControls(
    selectedAssignments,
    selectedCountElem,
    completeSelectedBtn
  );

  return { controlsElem, selectedCountElem, actionBtn: completeSelectedBtn };
}

function createCompletedAssignmentsSection(
  container: HTMLElement,
  hiddenAssignments: Assignment[]
): HTMLElement {
  const sectionElem = document.createElement('div');
  sectionElem.style.marginTop = '12px';

  const selectedAssignments = new Map<string, Assignment>();
  const headerElem = document.createElement('div');
  headerElem.style.display = 'flex';
  headerElem.style.alignItems = 'center';
  headerElem.style.gap = '8px';
  headerElem.style.flexWrap = 'wrap';
  headerElem.style.margin = '0 0 8px';

  const countElem = document.createElement('strong');
  countElem.innerText = formatCompletedCount(hiddenAssignments.length);
  headerElem.appendChild(countElem);

  const selectedCountElem = document.createElement('strong');
  selectedCountElem.innerText = messages.noneSelected;
  headerElem.appendChild(selectedCountElem);

  const restoreSelectedBtn = createSecondaryButton(messages.restoreSelected);
  restoreSelectedBtn.addEventListener('click', () => {
    const assignments = Array.from(selectedAssignments.values());
    if (assignments.length === 0) {
      showStatusMessage(container, messages.noneSelected);
      return;
    }
    void setAssignmentsVisibility(assignments, true).then(() =>
      window.location.reload()
    );
  });
  headerElem.appendChild(restoreSelectedBtn);

  sectionElem.appendChild(headerElem);

  const tableElem = document.createElement('table');
  tableElem.className = 'cs_table2';
  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="25%">${messages.lectureColumn}</th>
        <th width="40%">${messages.assignmentColumn}</th>
        <th width="20%">${messages.deadlineColumn}</th>
        <th width="10%">${messages.actionColumn}</th>
    `;
  tbody.appendChild(columns);

  for (const assignment of hiddenAssignments) {
    const record = document.createElement('tr');

    const subjectColumn = document.createElement('td');
    subjectColumn.innerText = getAssignmentSubject(assignment);
    record.appendChild(subjectColumn);

    const nameColumn = document.createElement('td');
    nameColumn.innerText = assignment.name;
    record.appendChild(nameColumn);

    const dueColumn = document.createElement('td');
    dueColumn.align = 'center';
    dueColumn.innerText = assignment.due
      ? new Date(assignment.due).toLocaleString('ja-JP')
      : '-';
    record.appendChild(dueColumn);

    const selectColumn = document.createElement('td');
    selectColumn.align = 'center';
    const restoreCheckbox = document.createElement('input');
    restoreCheckbox.type = 'checkbox';
    restoreCheckbox.addEventListener('change', () => {
      if (restoreCheckbox.checked) {
        selectedAssignments.set(assignment.id, assignment);
      } else {
        selectedAssignments.delete(assignment.id);
      }
      updateSelectedControls(
        selectedAssignments,
        selectedCountElem,
        restoreSelectedBtn
      );
    });
    selectColumn.appendChild(restoreCheckbox);
    record.appendChild(selectColumn);

    tbody.append(record);
  }

  tableElem.appendChild(tbody);
  sectionElem.appendChild(tableElem);
  updateSelectedControls(
    selectedAssignments,
    selectedCountElem,
    restoreSelectedBtn
  );

  return sectionElem;
}

/** gridjs のセルの描画内容から HTML タグを除去する。 */
function cellText(cell: unknown): string {
  const content = (cell as { props?: { content?: unknown } })?.props?.content;
  if (typeof content === 'string') {
    return content.replace(/(<([^>]+)>)/gi, '');
  }
  return typeof cell === 'string' ? cell : '';
}

function daysUntil(due: string): number {
  return (new Date(due).getTime() - Date.now()) / MS_PER_DAY;
}

function deadlineColor(daysLeft: number): string {
  if (daysLeft < 0) return 'color: gray';
  if (daysLeft < 1) return 'color: red';
  if (daysLeft < 2) return 'color: #F6AA00';
  if (daysLeft < 7) return 'color: green';
  return 'color: turqoise';
}

function buildTaskUrl(assignment: Assignment): string {
  const subject =
    language === '日本語' ? assignment.subject_ja : assignment.subject_en;
  const due = assignment.due
    ? new Date(
        new Date(assignment.due).getTime() -
          new Date(assignment.due).getTimezoneOffset() * 60 * 1000
      ).toJSON()
    : '';
  return `${GAS_TASKAPI_URL}?language=${language}&subject=${subject}&name=${assignment.name}&due=${due}&id=${assignment.id}`;
}

async function injectAssignmentTable(): Promise<void> {
  const lectureURIElems = Array.from(
    document.querySelectorAll<HTMLElement>('[onclick^=formSubmit]')
  );

  const prefs = await loadPreferences();
  const recordPerPage = prefs.recordPerPage;

  const assignments = await loadAssignments();
  assignments.sort((a, b) => dueTime(a.due) - dueTime(b.due));

  const rows: GridCell[][] = [];
  const hiddenAssignments: Assignment[] = [];
  const selectedAssignments = new Map<string, Assignment>();

  // 各行のチェックボックスのハンドラから参照できるよう、先に生成しておく。
  const wrapperElem = document.createElement('div');
  const selectionControls = createSelectionControls(
    wrapperElem,
    selectedAssignments
  );

  for (const assignment of assignments) {
    if (!isVisibleAssignment(assignment)) {
      hiddenAssignments.push(assignment);
      continue;
    }

    // 表示可否と残り日数を分けて評価する。
    let daysLeft = Number.NEGATIVE_INFINITY;
    if (assignment.due) {
      daysLeft = daysUntil(assignment.due);
      if (daysLeft >= DISPLAY_LIMIT_DAYS) continue;
    }

    const matchingLecture = lectureURIElems.find((el) =>
      el.parentElement?.textContent?.includes(assignment.subject_en)
    );

    let subjectElem: HTMLElement;
    if (matchingLecture) {
      const anchor = document.createElement('a');
      anchor.href = 'javascript:void(0)';
      const onclick = matchingLecture.getAttribute('onclick');
      if (onclick) {
        anchor.setAttribute('onclick', onclick);
      }
      subjectElem = anchor;
    } else {
      subjectElem = document.createElement('p');
    }
    subjectElem.innerText = getAssignmentSubject(assignment);

    const linkElem = document.createElement('a');
    linkElem.href = buildTaskUrl(assignment);
    if (assignment.due) {
      linkElem.innerText = new Date(assignment.due).toLocaleString('ja-JP');
      linkElem.setAttribute('style', deadlineColor(daysLeft));
    } else {
      linkElem.innerText = '-';
    }
    linkElem.target = '_blank';
    linkElem.rel = 'noopener nonreferrer';

    const selectionCheckbox = h('input', {
      type: 'checkbox',
      onChange: (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          selectedAssignments.set(assignment.id, assignment);
        } else {
          selectedAssignments.delete(assignment.id);
        }
        updateSelectedControls(
          selectedAssignments,
          selectionControls.selectedCountElem,
          selectionControls.actionBtn
        );
      },
      style: { cursor: 'pointer' },
    });

    rows.push([subjectElem, assignment.name, linkElem, selectionCheckbox]);
  }

  const mainElem = document.querySelector('div.contentsColumn');
  if (!mainElem) {
    return;
  }

  const tableElem = document.createElement('div');
  wrapperElem.appendChild(selectionControls.controlsElem);

  const config: UserConfig = {
    columns: [
      {
        name: messages.lectureColumn,
        width: '25%',
        sort: {
          compare: (a, b) => {
            const aText = cellText(a);
            const bText = cellText(b);
            if (aText > bText) return 1;
            if (bText > aText) return -1;
            return 0;
          },
        },
      },
      { name: messages.assignmentColumn, width: '40%' },
      {
        name: messages.deadlineColumn,
        width: '20%',
        sort: {
          compare: () => 1,
        },
      },
      {
        name: messages.actionColumn,
        width: '10%',
        sort: false,
      },
    ],
    style: { table: { width: '100%' } },
    search: {
      selector: (cell, _rowIndex, cellIndex) => {
        if (cellIndex === 0 || cellIndex === 2) {
          return cellText(cell);
        }
        return typeof cell === 'string' ? cell : cellText(cell);
      },
    },
    data: rows as UserConfig['data'],
    sort: true,
    // gridjs の PaginationConfig 型は `enabled` を過剰に必須としている。実行時は
    // pagination キーを渡すだけで有効になる。
    pagination: {
      limit: recordPerPage,
      summary: true,
    } as UserConfig['pagination'],
    language: getGridLanguage() as unknown as UserConfig['language'],
  };
  new Grid(config).render(tableElem);

  wrapperElem.appendChild(tableElem);
  if (hiddenAssignments.length > 0) {
    wrapperElem.appendChild(
      createCompletedAssignmentsSection(wrapperElem, hiddenAssignments)
    );
  }
  mainElem.prepend(wrapperElem);
}

function dueTime(due: string | null): number {
  return due ? new Date(due).getTime() : 0;
}
