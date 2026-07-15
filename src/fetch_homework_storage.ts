// fetch_homework_storage.ts
// 講義ページ用のコンテンツスクリプト。未提出（未完了）の課題を抽出して保存し、
// 講義ごとの課題テーブルをページに注入する。

import { getIconURLFromID, checkAssignmentType } from './assignment-type';
import { dueTime } from './date';
import { getLanguageFromPage } from './language';
import { getMessages, Messages } from './i18n';
import { loadAssignments, loadAssignmentIDs, saveAssignments } from './storage';
import { Assignment, Language } from './types';

const FALLBACK_LECTURE_ID = 'AAA1234';
const BANNER_ICON_URL = '/lms/img/cs/yazi3.gif';

const COURSE_NAME_SELECTOR =
  'body > div.base > div.headerContents > div.courseMenu > div.courseName';
const CURRENT_LECTURE_SELECTOR =
  'body > div.base > div.headerContents > div.breadCrumbBar > ul > li.current > a > p';

void (async () => {
  const language = getLanguageFromPage();
  const messages = getMessages(language);

  const newAssignments = await getAssignments(language, messages);
  await saveAssignments(newAssignments);

  const assignments = await loadAssignments();
  const currentLectureId = getLectureID();
  injectAssignmentTable(
    assignments.filter((a) => a.subject_id === currentLectureId),
    messages
  );
})();

async function getAssignments(
  language: Language,
  messages: Messages
): Promise<Assignment[]> {
  const subjectId = getLectureID();
  const subjectTexts = getSubjectTexts(language);

  let subjectJa: string;
  let subjectEn: string;
  if (Array.isArray(subjectTexts)) {
    subjectJa = subjectTexts[1];
    subjectEn = subjectTexts[3];
  } else {
    subjectJa = subjectTexts;
    subjectEn = subjectTexts;
  }

  const openStatuses = [
    messages.notSubmitted,
    messages.notViewed,
    messages.notExecuted,
    messages.notResponded,
    messages.resubmission,
  ];

  const idsInStorage = await loadAssignmentIDs();
  const assignments: Assignment[] = [];

  const assignmentRows = Array.from(
    document.querySelectorAll('[id^=REP],[id^=ANK],[id^=TES]')
  )
    .map((el) => el.parentElement)
    .filter((el): el is HTMLElement => el !== null);

  for (const row of assignmentRows) {
    const statusText =
      row.querySelector('td.jyugyeditCell > span')?.textContent ?? '';
    const isNotSubmitted = openStatuses.includes(statusText);
    const isDue = !row.textContent?.includes(messages.unavailable);

    if (!isDue || !isNotSubmitted) {
      continue;
    }

    const titleCell = row.querySelector('td.kyozaititleCell');
    if (!titleCell || !titleCell.id) {
      continue;
    }
    const id = titleCell.id;
    if (idsInStorage.includes(id)) {
      continue;
    }

    const nameMatch = (titleCell.textContent ?? '')
      .trim()
      .match(/(.*)\n(\s*)(.*)/);
    const name = nameMatch
      ? nameMatch[3]
      : (titleCell.textContent ?? '').trim();

    const dueText =
      row.querySelectorAll('td.jyugyeditCell')[0]?.textContent?.trim() ?? '';
    const dueDate = new Date(dueText);
    dueDate.setSeconds(dueDate.getSeconds() - 1);

    assignments.push({
      id,
      subject_id: subjectId,
      subject_ja: subjectJa,
      subject_en: subjectEn,
      name,
      due: dueDate.toJSON(),
      isVisible: true,
    });
  }

  return assignments;
}

function getSubjectTexts(language: Language): string | RegExpMatchArray {
  const courseName =
    document.querySelector(COURSE_NAME_SELECTOR)?.textContent?.trim() ?? '';
  if (language === 'English') {
    return courseName;
  }
  const match = courseName.match(/(.*)(\[)(.*)(\])/);
  if (match != null && match.length > 4) {
    return match;
  }
  return courseName;
}

function injectAssignmentTable(
  assignments: Assignment[],
  messages: Messages
): void {
  const bannerElem = document.createElement('div');
  bannerElem.id = 'title';
  bannerElem.innerHTML = `
        <h2>${messages.assignmentsHeading}
            <img src="${BANNER_ICON_URL}">
        </h2>
    `;

  const listBlockElem = document.createElement('div');
  listBlockElem.id = 'list_block';

  const tableElem = document.createElement('table');
  tableElem.className = 'cs_table2';

  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="37%">${messages.assignmentColumn}</th>
        <th width="10%">${messages.deadlineColumn}</th>
    `;
  tbody.appendChild(columns);

  const sorted = [...assignments].sort(
    (a, b) => dueTime(a.due) - dueTime(b.due)
  );
  for (const assignment of sorted) {
    const record = document.createElement('tr');

    const nameColumn = document.createElement('td');
    const img = document.createElement('img');
    img.src = getIconURLFromID(assignment.id);
    const link = document.createElement('a');
    link.href = 'javascript:void(0)';
    link.setAttribute(
      'onclick',
      `kyozaiTitleLink('${assignment.id}','0${checkAssignmentType(assignment.id)}')`
    );
    link.innerText = assignment.name;
    nameColumn.appendChild(img);
    nameColumn.appendChild(link);

    const dueColumn = document.createElement('td');
    dueColumn.align = 'center';
    dueColumn.innerText = assignment.due
      ? new Date(assignment.due).toLocaleString('ja-JP')
      : '-';

    record.appendChild(nameColumn);
    record.appendChild(dueColumn);
    tbody.append(record);
  }

  tableElem.appendChild(tbody);
  listBlockElem.appendChild(tableElem);
  listBlockElem.setAttribute(
    'style',
    'box-sizing: border-box; height: 100%; max-height: 15rem; margin-bottom: 2rem; overflow-y: auto'
  );

  const mainElem = document.querySelector('div.contentsColumn');
  if (mainElem) {
    mainElem.prepend(listBlockElem);
    mainElem.prepend(bannerElem);
  }
}

function getLectureID(): string {
  const text =
    document.querySelector(CURRENT_LECTURE_SELECTOR)?.textContent ?? '';
  const match = text.match(/(.*)\[(.*)\]/);
  if (match != null && match.length > 2) {
    return match[2];
  }
  return FALLBACK_LECTURE_ID;
}
