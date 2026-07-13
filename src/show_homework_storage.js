// show_homework_storage.js
// Show homeworks from browser

import { Grid, h } from 'gridjs';
import { jaJP } from 'gridjs/l10n';

var LANGUAGE = getLanguage();
if (LANGUAGE == '日本語') {
  var ASSIGNMENTS_TXT = '課題';
  var LECTURE_TXT = '講義名';
  var ASSIGNMENT_TXT = '課題名';
  var DEADLINE_TXT = '提出期限';
  var ACTION_TXT = '選択';
  var COMPLETE_SELECTED_TXT = '選択した課題を完了';
  var COMPLETED_ASSIGNMENTS_TXT = '完了した課題';
  var RESTORE_SELECTED_TXT = '選択した課題を一覧に戻す';
  var NO_SELECTED_TXT = '0件選択中';
  var GRIDJS_LANGUAGE = jaJP;
  GRIDJS_LANGUAGE['search'] = '検索 (講義名, 課題名, 期限)';
  GRIDJS_LANGUAGE['pagination']['results'] +=
    ' ' + 'Shift押しながら項目選択で複数条件ソート';
} else {
  var ASSIGNMENTS_TXT = 'Assignments';
  var LECTURE_TXT = 'Lecture';
  var ASSIGNMENT_TXT = 'Assignment';
  var DEADLINE_TXT = 'DEADLINE';
  var ACTION_TXT = 'Select';
  var COMPLETE_SELECTED_TXT = 'Complete selected';
  var COMPLETED_ASSIGNMENTS_TXT = 'Completed assignments';
  var RESTORE_SELECTED_TXT = 'Restore selected';
  var NO_SELECTED_TXT = '0 selected';
  var GRIDJS_LANGUAGE = {};
}

/* main */
(() => {
  injectAssignmentTable();
})();

function getLanguage() {
  const LOGOUT_TEXT = document.querySelector(
    '#form-id > div > ul > li.logoutButtonFrame > a'
  ).textContent;
  return LOGOUT_TEXT.includes('Logout') ? 'English' : '日本語';
}

function getAssignmentsFromStorage() {
  let assignments = [];

  return assignments;
}

function getIconURLFromID(hw_name) {
  if (hw_name.includes('REP')) {
    //return "/lms/img/cs/icon2b.gif"
    return '/lms/img/pc/material_report_S.png';
  } else if (hw_name.includes('ANK')) {
    //return "/lms/img/cs/icon7b.gif"
    return '/lms/img/pc/material_questionnaire_S.png';
  } else if (hw_name.includes('TES')) {
    //return "/lms/img/cs/icon3b.gif"
    return '/lms/img/pc/material_exam_S.png';
  } else {
    //return "/lms/img/cs/icon5b.gif"
    return '/lms/img/pc/material_study-materials_S.png';
  }
}

function isVisibleAssignment(assignment) {
  return assignment && assignment['isVisible'] !== false;
}

function getAssignmentSubject(assignment) {
  return getLanguage() == 'English'
    ? assignment['subject_en']
    : assignment['subject_ja'];
}

function formatSelectedCount(count) {
  if (getLanguage() == 'English') {
    return `${count} selected`;
  }
  return `${count}件選択中`;
}

function formatCompletedCount(count) {
  if (getLanguage() == 'English') {
    return `${COMPLETED_ASSIGNMENTS_TXT} ${count}`;
  }
  return `${COMPLETED_ASSIGNMENTS_TXT} ${count}件`;
}

function createSecondaryButton(text) {
  const buttonElem = document.createElement('button');
  buttonElem.innerText = text;
  buttonElem.style.marginRight = '8px';
  buttonElem.style.backgroundColor = 'white';
  buttonElem.style.color = '#2285b1';
  buttonElem.style.fontWeight = '700';
  buttonElem.style.border = '1px solid';
  return buttonElem;
}

function updateSelectedControls(selectedAssignments, countElem, actionBtn) {
  const selectedCount = selectedAssignments.size;
  countElem.innerText = formatSelectedCount(selectedCount);
  actionBtn.disabled = selectedCount === 0;
  actionBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
}

function showStatusMessage(container, message) {
  let statusElem = container.querySelector('.assignment-manager-status');
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

function setAssignmentsVisibility(assignments, isVisible, callback) {
  const updates = {};
  for (const assignment of assignments) {
    const updatedAssignment = {
      ...assignment,
      isVisible,
    };
    if (isVisible) {
      delete updatedAssignment['hiddenAt'];
      delete updatedAssignment['hiddenReason'];
    } else {
      updatedAssignment['hiddenAt'] = new Date().toJSON();
      updatedAssignment['hiddenReason'] = 'done';
    }
    updates[assignment['id']] = updatedAssignment;
  }

  chrome.storage.sync.set(updates, callback);
}

function createSelectionControls(container, selectedAssignments) {
  const controlsElem = document.createElement('div');
  controlsElem.style.display = 'flex';
  controlsElem.style.alignItems = 'center';
  controlsElem.style.gap = '8px';
  controlsElem.style.flexWrap = 'wrap';
  controlsElem.style.margin = '0 0 8px';

  const selectedCountElem = document.createElement('strong');
  selectedCountElem.innerText = NO_SELECTED_TXT;
  controlsElem.appendChild(selectedCountElem);

  const completeSelectedBtn = createSecondaryButton(COMPLETE_SELECTED_TXT);
  completeSelectedBtn.addEventListener('click', () => {
    const assignments = Array.from(selectedAssignments.values());
    if (assignments.length === 0) {
      showStatusMessage(container, NO_SELECTED_TXT);
      return;
    }
    setAssignmentsVisibility(assignments, false, () => {
      window.location.reload();
    });
  });
  controlsElem.appendChild(completeSelectedBtn);

  updateSelectedControls(
    selectedAssignments,
    selectedCountElem,
    completeSelectedBtn
  );

  return {
    controlsElem,
    selectedCountElem,
    actionBtn: completeSelectedBtn,
  };
}

function createCompletedAssignmentsSection(container, hiddenAssignments) {
  const sectionElem = document.createElement('div');
  sectionElem.style.marginTop = '12px';

  const selectedAssignments = new Map();
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
  selectedCountElem.innerText = NO_SELECTED_TXT;
  headerElem.appendChild(selectedCountElem);

  const restoreSelectedBtn = createSecondaryButton(RESTORE_SELECTED_TXT);
  restoreSelectedBtn.addEventListener('click', () => {
    const assignments = Array.from(selectedAssignments.values());
    if (assignments.length === 0) {
      showStatusMessage(container, NO_SELECTED_TXT);
      return;
    }
    setAssignmentsVisibility(assignments, true, () => {
      window.location.reload();
    });
  });
  headerElem.appendChild(restoreSelectedBtn);

  sectionElem.appendChild(headerElem);

  const tableElem = document.createElement('table');
  tableElem.className = 'cs_table2';
  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="25%">${LECTURE_TXT}</th>
        <th width="40%">${ASSIGNMENT_TXT}</th>
        <th width="20%">${DEADLINE_TXT}</th>
        <th width="10%">${ACTION_TXT}</th>
    `;
  tbody.appendChild(columns);

  for (const assignment of hiddenAssignments) {
    const record = document.createElement('tr');

    const subjectColumn = document.createElement('td');
    subjectColumn.innerText = getAssignmentSubject(assignment);
    record.appendChild(subjectColumn);

    const nameColumn = document.createElement('td');
    nameColumn.innerText = assignment['name'];
    record.appendChild(nameColumn);

    const dueColumn = document.createElement('td');
    dueColumn.align = 'center';
    dueColumn.innerText = assignment['due']
      ? new Date(assignment['due']).toLocaleString('ja-JP')
      : '-';
    record.appendChild(dueColumn);

    const selectColumn = document.createElement('td');
    selectColumn.align = 'center';
    const restoreCheckbox = document.createElement('input');
    restoreCheckbox.type = 'checkbox';
    restoreCheckbox.addEventListener('change', () => {
      if (restoreCheckbox.checked) {
        selectedAssignments.set(assignment['id'], assignment);
      } else {
        selectedAssignments.delete(assignment['id']);
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

function injectAssignmentTable() {
  const DISPLAY_LIMIT_DAYS = 31;
  const GAS_TASKAPI_URL =
    'https://script.google.com/macros/s/AKfycbxOkCMKIeXHZPxkVHZbQDlU6ezRRljwJdypjI9B4qA2l3oZqfgtxOzDr6jY1PoN9rTa6Q/exec';
  let inDleftCnt = 0;

  const lectureURIElems = Array.from(
    document.querySelectorAll('[onclick^=formSubmit]')
  );

  let recordPerPage = 6;
  chrome.storage.local.get('PREFERENCES', (data) => {
    console.log(data);
    const prefs = data['PREFERENCES'];
    if (prefs['id'] === 'PREFERENCES') {
      recordPerPage = prefs.recordPerPage;
    }
  });

  chrome.storage.sync.get(null, (data) => {
    const assignments = Object.values(data);
    // Cannot sort items outside chrome.storage.sync.get
    assignments.sort((a, b) => new Date(a['due']) - new Date(b['due']));

    let asm = [];
    let hiddenAssignments = [];
    const selectedAssignments = new Map();
    let selectionControls;
    for (const assignment of assignments) {
      if (assignment['id'] === 'PREFERENCES') {
        continue;
      }
      if (!isVisibleAssignment(assignment)) {
        hiddenAssignments.push(assignment);
        continue;
      }
      //separated evaluation of visibility and date left
      var daysLeft;
      if (assignment['due']) {
        daysLeft = (new Date(assignment['due']) - new Date()) / 86400000;
        if (daysLeft >= DISPLAY_LIMIT_DAYS) continue;
      }
      inDleftCnt++;

      let subjectElem = document.createElement('p');
      if (
        lectureURIElems.filter((x) =>
          x.parentElement.textContent.includes(assignment['subject_en'])
        ).length
      ) {
        subjectElem = document.createElement('a');
        subjectElem.href = 'javascript:void(0)';
        subjectElem.setAttribute(
          'onclick',
          lectureURIElems
            .filter((x) =>
              x.parentElement.textContent.includes(assignment['subject_en'])
            )[0]
            .getAttribute('onclick')
        );
      }
      subjectElem.innerText =
        getLanguage() == 'English'
          ? assignment['subject_en']
          : assignment['subject_ja'];

      let linkElem = document.createElement('a');
      if (assignment['due']) {
        linkElem.href = `${GAS_TASKAPI_URL}?language=${getLanguage()}&subject=${
          getLanguage() === '日本語'
            ? assignment['subject_ja']
            : assignment['subject_en']
        }&name=${assignment['name']}&due=${new Date(
          new Date(assignment['due']).getTime() -
            new Date(assignment['due']).getTimezoneOffset() * 60 * 1000
        ).toJSON()}&id=${assignment['id']}`;
        linkElem.innerText = new Date(assignment['due']).toLocaleString(
          'ja-JP'
        );
        if (daysLeft < 0) {
          linkElem.style = 'color: gray';
        } else if (daysLeft < 1) {
          linkElem.style = 'color: red';
        } else if (daysLeft < 2) {
          linkElem.style = 'color: #F6AA00';
        } else if (daysLeft < 7) {
          linkElem.style = 'color: green';
        } else {
          linkElem.style = 'color: turqoise';
        }
      } else {
        linkElem.href = `${GAS_TASKAPI_URL}?language=${getLanguage()}&subject=${
          getLanguage() === '日本語'
            ? assignment['subject_ja']
            : assignment['subject_en']
        }&name=${assignment['name']}&due=&id=${assignment['id']}`;
        linkElem.innerText = '-';
      }
      linkElem.target = '_blank';
      linkElem.rel = 'noopener nonreferrer';

      let selectionCheckbox = h(
        'input',
        {
          type: 'checkbox',
          onChange: (event) => {
            if (event.target.checked) {
              selectedAssignments.set(assignment['id'], assignment);
            } else {
              selectedAssignments.delete(assignment['id']);
            }
            if (selectionControls) {
              updateSelectedControls(
                selectedAssignments,
                selectionControls.selectedCountElem,
                selectionControls.actionBtn
              );
            }
          },
          style: {
            cursor: 'pointer',
          },
        }
      );
      asm.push([subjectElem, assignment['name'], linkElem, selectionCheckbox]);
    }

    let mainElem = document.querySelector('div.contentsColumn');
    const wrapperElem = document.createElement('div');
    const tableElem = document.createElement('div');
    selectionControls = createSelectionControls(wrapperElem, selectedAssignments);
    wrapperElem.appendChild(selectionControls.controlsElem);
    new Grid({
      columns: [
        {
          name: LECTURE_TXT,
          width: '25%',
          sort: {
            compare: (a, b) => {
              const aText = a.props.content.replace(/(<([^>]+)>)/gi, '');
              const bText = b.props.content.replace(/(<([^>]+)>)/gi, '');
              if (aText > bText) {
                return 1;
              } else if (bText > aText) {
                return -1;
              } else {
                return 0;
              }
            },
          },
        },
        { name: ASSIGNMENT_TXT, width: '40%' },
        {
          name: DEADLINE_TXT,
          width: '20%',
          sort: {
            compare: (a, b) => {
              return 1;
            },
          },
        },
        {
          name: ACTION_TXT,
          width: '10%',
          sort: false,
        },
      ],
      style: {
        table: {
          width: '100%',
        },
      },
      search: {
        selector: (cell, rowIndex, cellIndex) => {
          if (cellIndex === 0 || cellIndex == 2) {
            return cell.props.content.replace(/(<([^>]+)>)/gi, '');
          } else {
            return cell;
          }
        },
      },
      data: asm,
      sort: true,
      pagination: { limit: recordPerPage, summary: true },
      language: GRIDJS_LANGUAGE,
    }).render(tableElem);
    wrapperElem.appendChild(tableElem);
    if (hiddenAssignments.length > 0) {
      wrapperElem.appendChild(
        createCompletedAssignmentsSection(wrapperElem, hiddenAssignments)
      );
    }
    mainElem.prepend(wrapperElem);
  });
}

var target = document.querySelector('div#main');

function getNowYMDStr(date) {
  const Y = date.getFullYear();
  const M = ('00' + (date.getMonth() + 1)).slice(-2);
  const D = ('00' + date.getDate()).slice(-2);

  return Y + M + D;
}
