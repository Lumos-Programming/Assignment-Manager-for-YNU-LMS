// popup.ts
// The browser-action popup: lets the user tune records-per-page, clear
// assignments, and see the tracked list.

import { getLanguageFromLocale } from './language';
import { getMessages } from './i18n';
import {
  clearAssignments,
  loadAssignments,
  loadPreferences,
  removeAssignment,
  saveAssignment,
  savePreferences,
} from './storage';
import { Assignment, PREFERENCES_ID } from './types';

const MIN_RECORDS_PER_PAGE = 1;
const MAX_RECORDS_PER_PAGE = 100;

const language = getLanguageFromLocale();
const messages = getMessages(language);

void (async () => {
  await ensurePreferences();
  await injectAssignmentTable();
})();

/** Seed default preferences on first run. */
async function ensurePreferences(): Promise<void> {
  const prefs = await loadPreferences();
  await savePreferences(prefs);
}

async function injectAssignmentTable(): Promise<void> {
  const bannerElem = document.createElement('div');

  const clearBtn = document.createElement('button');
  clearBtn.innerText = messages.clearAll;
  clearBtn.addEventListener('click', () => {
    void clearAssignments().then(() => location.reload());
  });
  clearBtn.style.marginRight = '10px';
  bannerElem.appendChild(clearBtn);

  const clearOverdueBtn = document.createElement('button');
  clearOverdueBtn.innerText = messages.clearOverdue;
  clearOverdueBtn.addEventListener('click', () => {
    void clearOverdueAssignments();
  });
  clearOverdueBtn.style.marginRight = '10px';
  bannerElem.appendChild(clearOverdueBtn);

  const recordPerPageLabel = document.createElement('label');
  recordPerPageLabel.innerText = messages.recordsPerPageLabel;

  const recordPerPageInput = document.createElement('input');
  recordPerPageInput.type = 'number';
  recordPerPageInput.min = String(MIN_RECORDS_PER_PAGE);
  recordPerPageInput.max = String(MAX_RECORDS_PER_PAGE);
  const prefs = await loadPreferences();
  recordPerPageInput.value = String(prefs.recordPerPage);

  recordPerPageInput.addEventListener('input', () => {
    void onRecordPerPageInput(recordPerPageInput);
  });

  if (language === 'English') {
    bannerElem.appendChild(recordPerPageInput);
    bannerElem.appendChild(recordPerPageLabel);
  } else {
    bannerElem.appendChild(recordPerPageLabel);
    bannerElem.appendChild(recordPerPageInput);
  }

  const listBlockElem = document.createElement('div');
  listBlockElem.id = 'list_block';

  const tableElem = document.createElement('table');
  tableElem.border = '0';
  tableElem.cellPadding = '0';
  tableElem.cellSpacing = '0';
  tableElem.className = 'cs_table2';

  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="20%">${language === 'English' ? 'Lecture' : '講義'}</th>
        <th width="37%">${messages.assignmentColumn}</th>
        <th width="10%">${messages.deadlineColumn}</th>
        <th width="12%">${messages.showColumn}</th>
    `;
  tbody.appendChild(columns);

  const assignments = await loadAssignments();
  assignments.sort((a, b) => dueTime(a.due) - dueTime(b.due));

  for (const assignment of assignments) {
    tbody.append(createAssignmentRow(assignment));
  }

  tableElem.appendChild(tbody);
  listBlockElem.appendChild(tableElem);
  listBlockElem.setAttribute(
    'style',
    'margin-bottom: 10px; box-sizing: border-box; width: 600px; height: 300px; overflow-y: auto'
  );

  document.body.appendChild(bannerElem);
  document.body.appendChild(listBlockElem);
}

function createAssignmentRow(assignment: Assignment): HTMLTableRowElement {
  const record = document.createElement('tr');

  const subjectColumn = document.createElement('td');
  const subjectElem = document.createElement('p');
  subjectElem.innerText =
    language === 'English' ? assignment.subject_en : assignment.subject_ja;
  subjectColumn.appendChild(subjectElem);

  const nameColumn = document.createElement('td');
  const nameElem = document.createElement('p');
  nameElem.innerText = assignment.name;
  nameColumn.appendChild(nameElem);

  const dueColumn = document.createElement('td');
  dueColumn.align = 'center';
  dueColumn.innerText = assignment.due
    ? new Date(assignment.due).toLocaleString('ja-JP')
    : ' - ';

  const showColumn = document.createElement('td');
  showColumn.align = 'center';

  const showCheckbox = document.createElement('input');
  showCheckbox.checked = assignment.isVisible;
  showCheckbox.type = 'checkbox';
  showCheckbox.addEventListener('change', () => {
    void saveAssignment({ ...assignment, isVisible: showCheckbox.checked });
  });
  showColumn.appendChild(showCheckbox);

  const removeButton = document.createElement('button');
  removeButton.innerText = '🗑';
  removeButton.addEventListener('click', () => {
    void removeAssignment(assignment.id).then(() => {
      if (removeButton.parentElement) {
        removeButton.parentElement.innerHTML = `<p>'Removed'</p>`;
      }
    });
  });
  showColumn.appendChild(removeButton);

  record.appendChild(subjectColumn);
  record.appendChild(nameColumn);
  record.appendChild(dueColumn);
  record.appendChild(showColumn);
  return record;
}

async function onRecordPerPageInput(input: HTMLInputElement): Promise<void> {
  const value = parseInt(input.value, 10);
  if (value >= MIN_RECORDS_PER_PAGE && value <= MAX_RECORDS_PER_PAGE) {
    await savePreferences({ id: PREFERENCES_ID, recordPerPage: value });
  } else if (value) {
    alert(messages.recordsPerPageError);
  }
}

async function clearOverdueAssignments(): Promise<void> {
  const assignments = await loadAssignments();
  const now = Date.now();
  const overdue = assignments.filter(
    (a) => a.due != null && new Date(a.due).getTime() < now
  );
  if (overdue.length === 0) {
    return;
  }
  await Promise.all(overdue.map((a) => removeAssignment(a.id)));
  location.reload();
}

function dueTime(due: string | null): number {
  return due ? new Date(due).getTime() : 0;
}
