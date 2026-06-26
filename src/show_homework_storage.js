// show_homework_storage.js
// Show homeworks from browser

import { Grid, h } from 'gridjs';
import { jaJP } from 'gridjs/l10n';

var LECTURE_TXT = '講義名';
var ASSIGNMENT_TXT = '課題名';
var DEADLINE_TXT = '提出期限';
var ACTION_TXT = '選択';
var NO_DEADLINE_TXT = '期限なし';
var EMPTY_ASSIGNMENTS_TXT = '31日以内の未完了課題はありません。';
var RESTORE_HINT_TXT =
  '完了した課題は、この画面の「完了した課題」から戻せます。';
var AUTO_DELETE_COMPLETED_NOTICE_TXT =
  '完了した課題は提出期限を過ぎると自動で削除されます。';
var COMPLETE_SELECTED_ASSIGNMENTS_TXT = '選択した課題を完了';
var NO_SELECTED_ASSIGNMENTS_TXT = '0件選択中';
var HIDDEN_ASSIGNMENTS_TXT = '完了した課題';
var SHOW_HIDDEN_ASSIGNMENTS_TXT = '完了した課題を表示';
var HIDE_HIDDEN_ASSIGNMENTS_TXT = '完了した課題を閉じる';
var RESTORE_SELECTED_ASSIGNMENTS_TXT = '選択した課題を一覧に戻す';
var DELETE_COMPLETED_ASSIGNMENTS_TXT = '完了リストを空にする';
var STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録';
var SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録を表示';
var HIDE_STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録を閉じる';
var ALLOW_REFETCH_DELETED_ASSIGNMENTS_TXT =
  '選択した課題を再取得できるようにする';
var PERMANENTLY_DELETE_STOPPED_FETCH_TXT = '選択した記録を完全に削除';
var ASSIGNMENT_NAME_PLACEHOLDER = '__ASSIGNMENT_NAME__';
var GRIDJS_LANGUAGE = jaJP;
GRIDJS_LANGUAGE['search'] = '検索 (講義名, 課題名, 期限)';
GRIDJS_LANGUAGE['pagination']['results'] +=
  ' ' + 'Shift押しながら項目選択で複数条件ソート';

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

function getDisplaySubject(assignment, subjectNamesById = new Map()) {
  return (
    subjectNamesById.get(assignment['subject_id']) ||
    assignment['subject_ja'] ||
    assignment['subject_en'] ||
    ''
  );
}

function getDisplayAssignmentName(assignment, subjectNamesById = new Map()) {
  return (
    assignment['name'] ||
    getDisplaySubject(assignment, subjectNamesById) ||
    assignment['id'] ||
    ''
  );
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

function getDueSortTime(assignment) {
  if (!assignment || !assignment['due']) {
    return Number.POSITIVE_INFINITY;
  }

  const dueTime = new Date(assignment['due']).getTime();
  return Number.isFinite(dueTime) ? dueTime : Number.POSITIVE_INFINITY;
}

function compareAssignmentsByDue(a, b) {
  return getDueSortTime(a) - getDueSortTime(b);
}

function hasValidDue(assignment) {
  return Number.isFinite(getDueSortTime(assignment));
}

function isOverdue(assignment) {
  return hasValidDue(assignment) && getDueSortTime(assignment) <= Date.now();
}

function isVisibleAssignment(assignment) {
  return assignment && assignment['isVisible'] !== false;
}

function isDeletedAssignment(assignment) {
  return assignment && assignment['isDeleted'] === true;
}

function createDeletedAssignmentTombstone(assignment) {
  return {
    id: assignment['id'],
    subject_id: assignment['subject_id'],
    subject_ja: assignment['subject_ja'],
    subject_en: assignment['subject_en'],
    name: assignment['name'],
    due: assignment['due'],
    isVisible: false,
    isDeleted: true,
    deletedAt: new Date().toJSON(),
    deletedReason: 'completedCleanup',
  };
}

function createLmsSubjectMap(lectureURIElems) {
  const subjectNamesById = new Map();
  for (const lectureElem of lectureURIElems) {
    const text = (lectureElem.parentElement?.textContent || '').trim();
    const match = text.match(/(.+?)\s*\[([^\]]+)\]/);
    if (!match) {
      continue;
    }
    const linkText = (lectureElem.textContent || '').trim();
    let subjectName = match[1].trim();
    if (linkText && subjectName.startsWith(linkText)) {
      const subjectNameWithoutLinkText = subjectName
        .slice(linkText.length)
        .trim();
      if (subjectNameWithoutLinkText) {
        subjectName = subjectNameWithoutLinkText;
      }
    }
    subjectNamesById.set(match[2].trim(), subjectName);
  }
  return subjectNamesById;
}

function backfillDeletedAssignmentMetadataFromLms(data, subjectNamesById) {
  const updates = {};
  for (const assignment of Object.values(data)) {
    if (!isDeletedAssignment(assignment) || !assignment['subject_id']) {
      continue;
    }
    const lmsSubjectName = subjectNamesById.get(assignment['subject_id']);
    if (!lmsSubjectName) {
      continue;
    }
    if (assignment['name'] && assignment['subject_ja']) {
      continue;
    }
    updates[assignment['id']] = {
      ...assignment,
      name: assignment['name'] || lmsSubjectName,
      subject_ja: assignment['subject_ja'] || lmsSubjectName,
    };
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  chrome.storage.sync.set(updates, () => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        document.body,
        '取得を止めている記録の科目名を保存できませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
    }
  });
}

function showStatusMessage(container, message, color = '#2285b1') {
  let statusElem = container.querySelector('.assignment-manager-status');
  if (!statusElem) {
    statusElem = document.createElement('p');
    statusElem.className = 'assignment-manager-status';
    statusElem.style.fontWeight = '700';
    statusElem.style.margin = '8px 0';
    container.prepend(statusElem);
  }
  statusElem.style.color = color;
  statusElem.innerText = message;
}

function createNoDeadlineElem() {
  const noDeadlineElem = document.createElement('span');
  noDeadlineElem.innerText = NO_DEADLINE_TXT;
  noDeadlineElem.style.color = '#666';
  noDeadlineElem.style.fontWeight = '700';
  return noDeadlineElem;
}

function formatDueText(assignment) {
  if (!hasValidDue(assignment)) {
    return NO_DEADLINE_TXT;
  }
  return new Date(assignment['due']).toLocaleString('ja-JP');
}

function showEmptyState(container) {
  const gridContainer = container.querySelector('.gridjs-container');
  if (gridContainer) {
    gridContainer.style.display = 'none';
  }

  let emptyElem = container.querySelector('.assignment-manager-empty');
  if (!emptyElem) {
    emptyElem = document.createElement('p');
    emptyElem.className = 'assignment-manager-empty';
    emptyElem.style.margin = '12px 0';
    emptyElem.style.color = '#444';
    emptyElem.style.fontWeight = '700';
    container.appendChild(emptyElem);
  }
  emptyElem.innerText = EMPTY_ASSIGNMENTS_TXT;
}

function refreshAssignmentTable(container, delay = 0) {
  setTimeout(() => {
    if (container && container.parentElement) {
      container.remove();
      injectAssignmentTable();
      return;
    }
    window.location.reload();
  }, delay);
}

function createSecondaryButton(text, variant = 'default') {
  const buttonElem = document.createElement('button');
  buttonElem.type = 'button';
  buttonElem.innerText = text;
  buttonElem.style.minHeight = '30px';
  buttonElem.style.padding = '4px 10px';
  buttonElem.style.border = '1px solid #b8c7d0';
  buttonElem.style.borderRadius = '4px';
  buttonElem.style.backgroundColor = '#fff';
  buttonElem.style.color = '#226c86';
  buttonElem.style.cursor = 'pointer';
  buttonElem.style.fontWeight = '700';
  buttonElem.style.lineHeight = '1.3';
  if (variant === 'danger') {
    buttonElem.style.backgroundColor = '#fff7f7';
    buttonElem.style.borderColor = '#d8a5a5';
    buttonElem.style.color = '#9f2b2b';
  } else if (variant === 'primary') {
    buttonElem.style.backgroundColor = '#176f86';
    buttonElem.style.borderColor = '#176f86';
    buttonElem.style.color = '#fff';
  }
  return buttonElem;
}

function formatSelectedAssignmentCount(count) {
  if (count === 0) {
    return NO_SELECTED_ASSIGNMENTS_TXT;
  }
  return `${count}件選択済み`;
}

function updateSelectedCompletionControls(selectedAssignments, controls) {
  if (!controls.countElem || !controls.completeBtn) {
    return;
  }

  const selectedCount = selectedAssignments.size;
  controls.countElem.innerText = formatSelectedAssignmentCount(selectedCount);
  controls.completeBtn.disabled = selectedCount === 0;
  controls.completeBtn.style.cursor =
    selectedCount === 0 ? 'not-allowed' : 'pointer';
  controls.completeBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
}

function updateSelectedRestoreControls(selectedAssignments, controls) {
  if (!controls.countElem || !controls.restoreBtn) {
    return;
  }

  const selectedCount = selectedAssignments.size;
  controls.countElem.innerText = formatSelectedAssignmentCount(selectedCount);
  controls.restoreBtn.disabled = selectedCount === 0;
  controls.restoreBtn.style.cursor =
    selectedCount === 0 ? 'not-allowed' : 'pointer';
  controls.restoreBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
  if (!controls.permanentDeleteBtn) {
    return;
  }

  controls.permanentDeleteBtn.disabled = selectedCount === 0;
  controls.permanentDeleteBtn.style.cursor =
    selectedCount === 0 ? 'not-allowed' : 'pointer';
  controls.permanentDeleteBtn.style.opacity =
    selectedCount === 0 ? '0.55' : '1';
}

function updateSelectedRefetchControls(selectedAssignments, controls) {
  updateSelectedRestoreControls(selectedAssignments, controls);
}

function createTableControls(
  container,
  hiddenAssignments,
  deletedAssignments,
  activeAssignmentCount,
  selectedAssignments,
  selectionControls,
  subjectNamesById = new Map()
) {
  const wrapperElem = document.createElement('div');
  wrapperElem.style.margin = '8px 0 10px';

  const controlsElem = document.createElement('div');
  controlsElem.style.display = 'flex';
  controlsElem.style.alignItems = 'center';
  controlsElem.style.flexWrap = 'wrap';
  controlsElem.style.gap = '8px';
  controlsElem.style.margin = '0 0 4px';

  if (activeAssignmentCount > 0) {
    const selectionToolsElem = document.createElement('div');
    selectionToolsElem.style.display = 'flex';
    selectionToolsElem.style.alignItems = 'center';
    selectionToolsElem.style.flexWrap = 'wrap';
    selectionToolsElem.style.gap = '8px';

    const selectedCountElem = document.createElement('strong');
    selectedCountElem.style.color = '#1f4f5e';
    selectedCountElem.style.backgroundColor = '#eaf3f6';
    selectedCountElem.style.border = '1px solid #cfe0e6';
    selectedCountElem.style.borderRadius = '4px';
    selectedCountElem.style.padding = '5px 8px';
    selectedCountElem.style.lineHeight = '1.3';
    selectionToolsElem.appendChild(selectedCountElem);

    const completeSelectedBtn = createSecondaryButton(
      COMPLETE_SELECTED_ASSIGNMENTS_TXT,
      'primary'
    );
    completeSelectedBtn.addEventListener('click', () => {
      completeSelectedAssignments(
        container,
        Array.from(selectedAssignments.values()),
        selectedAssignments,
        selectionControls
      );
    });
    selectionToolsElem.appendChild(completeSelectedBtn);

    selectionControls.countElem = selectedCountElem;
    selectionControls.completeBtn = completeSelectedBtn;
    updateSelectedCompletionControls(selectedAssignments, selectionControls);
    controlsElem.appendChild(selectionToolsElem);
  }

  let hiddenSectionElem;
  if (hiddenAssignments.length > 0 || deletedAssignments.length > 0) {
    const hiddenToolsElem = document.createElement('div');
    hiddenToolsElem.style.display = 'flex';
    hiddenToolsElem.style.alignItems = 'center';
    hiddenToolsElem.style.flexWrap = 'wrap';
    hiddenToolsElem.style.gap = '8px';

    const hiddenCountElem = document.createElement('strong');
    hiddenCountElem.innerText = `${HIDDEN_ASSIGNMENTS_TXT} ${hiddenAssignments.length}件`;
    hiddenCountElem.style.color = '#444';
    hiddenCountElem.style.backgroundColor = '#eef5f8';
    hiddenCountElem.style.border = '1px solid #d6e5eb';
    hiddenCountElem.style.borderRadius = '4px';
    hiddenCountElem.style.padding = '5px 8px';
    hiddenCountElem.style.lineHeight = '1.3';
    hiddenToolsElem.appendChild(hiddenCountElem);

    const autoDeleteNoticeElem = document.createElement('span');
    autoDeleteNoticeElem.innerText = AUTO_DELETE_COMPLETED_NOTICE_TXT;
    autoDeleteNoticeElem.style.color = '#555';
    autoDeleteNoticeElem.style.fontWeight = '700';
    hiddenToolsElem.appendChild(autoDeleteNoticeElem);

    const showHiddenBtn = createSecondaryButton(SHOW_HIDDEN_ASSIGNMENTS_TXT);
    hiddenSectionElem = createHiddenAssignmentsSection(
      container,
      hiddenAssignments,
      deletedAssignments,
      subjectNamesById
    );
    showHiddenBtn.addEventListener('click', () => {
      const isHidden = hiddenSectionElem.style.display === 'none';
      hiddenSectionElem.style.display = isHidden ? 'block' : 'none';
      showHiddenBtn.innerText = isHidden
        ? HIDE_HIDDEN_ASSIGNMENTS_TXT
        : SHOW_HIDDEN_ASSIGNMENTS_TXT;
    });
    hiddenToolsElem.appendChild(showHiddenBtn);

    controlsElem.appendChild(hiddenToolsElem);
  }

  wrapperElem.appendChild(controlsElem);
  if (hiddenAssignments.length > 0) {
    const hintElem = document.createElement('p');
    hintElem.innerText = RESTORE_HINT_TXT;
    hintElem.style.margin = '2px 0 0';
    hintElem.style.color = '#555';
    hintElem.style.fontSize = '12px';
    hintElem.style.fontWeight = '700';
    wrapperElem.appendChild(hintElem);
  }
  if (hiddenSectionElem) {
    wrapperElem.appendChild(hiddenSectionElem);
  }

  return wrapperElem;
}

function completeSelectedAssignments(
  container,
  assignments,
  selectedAssignments,
  selectionControls
) {
  const visibleAssignments = assignments.filter(
    (assignment) => assignment && isVisibleAssignment(assignment)
  );

  if (visibleAssignments.length === 0) {
    showStatusMessage(container, '完了にする課題が選択されていません。');
    return;
  }

  if (selectionControls.completeBtn) {
    selectionControls.completeBtn.disabled = true;
  }

  const assignmentIds = visibleAssignments.map(
    (assignment) => assignment['id']
  );

  chrome.storage.sync.get(assignmentIds, (currentData) => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        container,
        '選択した課題を完了にできませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      updateSelectedCompletionControls(selectedAssignments, selectionControls);
      return;
    }

    const updates = {};
    let skippedCount = 0;
    for (const assignment of visibleAssignments) {
      const currentAssignment = currentData[assignment['id']];
      if (
        !currentAssignment ||
        isDeletedAssignment(currentAssignment) ||
        !isVisibleAssignment(currentAssignment)
      ) {
        skippedCount++;
        continue;
      }
      updates[assignment['id']] = {
        ...currentAssignment,
        isVisible: false,
        hiddenAt: new Date().toJSON(),
        hiddenReason: 'done',
      };
    }

    const completedCount = Object.keys(updates).length;
    if (completedCount === 0) {
      showStatusMessage(
        container,
        '選択した課題はすでに移動または削除されています。画面を更新してください。'
      );
      selectedAssignments.clear();
      updateSelectedCompletionControls(selectedAssignments, selectionControls);
      return;
    }

    chrome.storage.sync.set(updates, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          container,
          '選択した課題を完了にできませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        updateSelectedCompletionControls(
          selectedAssignments,
          selectionControls
        );
        return;
      }

      selectedAssignments.clear();
      updateSelectedCompletionControls(selectedAssignments, selectionControls);
      const skippedMessage =
        skippedCount > 0
          ? ` ${skippedCount}件はすでに移動または削除されていたため変更しませんでした。`
          : '';
      showStatusMessage(
        container,
        `${completedCount}件を完了にしました。「完了した課題を表示」から一覧に戻せます。提出期限を過ぎると自動で削除されます。${skippedMessage}`
      );
      refreshAssignmentTable(container, 1200);
    });
  });
}

function removeExpiredAssignmentsFromStorage(callback = () => {}) {
  chrome.storage.sync.get(null, (data) => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        document.body,
        '期限切れ課題を確認できませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      callback();
      return;
    }

    const expiredAssignmentIds = [];
    for (const assignment of Object.values(data)) {
      if (
        assignment &&
        assignment['id'] &&
        assignment['id'] !== 'PREFERENCES' &&
        isOverdue(assignment)
      ) {
        expiredAssignmentIds.push(assignment['id']);
      }
    }

    if (expiredAssignmentIds.length === 0) {
      callback();
      return;
    }

    chrome.storage.sync.remove(expiredAssignmentIds, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          document.body,
          '期限切れ課題を自動削除できませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
      }
      callback();
    });
  });
}

function restoreAssignments(container, assignments) {
  const assignmentIds = assignments
    .filter((assignment) => assignment && assignment['id'])
    .map((assignment) => assignment['id']);
  if (assignmentIds.length === 0) {
    showStatusMessage(container, '一覧に戻す課題が選択されていません。');
    return;
  }

  chrome.storage.sync.get(assignmentIds, (currentData) => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        container,
        '課題を一覧に戻せませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      return;
    }

    const updates = {};
    let skippedDeletedCount = 0;
    let skippedMissingCount = 0;
    for (const assignment of assignments) {
      if (!assignment || !assignment['id']) {
        continue;
      }
      const currentAssignment = currentData[assignment['id']];
      if (!currentAssignment) {
        skippedMissingCount++;
        continue;
      }
      if (isDeletedAssignment(currentAssignment)) {
        skippedDeletedCount++;
        continue;
      }
      const restoredAssignment = {
        ...currentAssignment,
        isVisible: true,
      };
      delete restoredAssignment['hiddenAt'];
      delete restoredAssignment['hiddenReason'];
      delete restoredAssignment['isDeleted'];
      delete restoredAssignment['deletedAt'];
      delete restoredAssignment['deletedReason'];
      updates[assignment['id']] = restoredAssignment;
    }

    const restoreCount = Object.keys(updates).length;
    if (restoreCount === 0) {
      const message =
        skippedDeletedCount > 0
          ? '完了リストから消した課題は、この操作では一覧に戻せません。再取得できるようにしてから講義ページを開いてください。'
          : skippedMissingCount > 0
          ? '選択した課題はすでに削除されています。画面を更新してください。'
          : '一覧に戻す課題が選択されていません。';
      showStatusMessage(container, message);
      return;
    }

    chrome.storage.sync.set(updates, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          container,
          '課題を一覧に戻せませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      const skippedMessage =
        skippedDeletedCount > 0
          ? ` ${skippedDeletedCount}件は完了リストから消されていたため戻しませんでした。`
          : skippedMissingCount > 0
          ? ` ${skippedMissingCount}件はすでに削除されていたため戻しませんでした。`
          : '';
      showStatusMessage(
        container,
        `${restoreCount}件を一覧に戻しました。${skippedMessage}`
      );
      refreshAssignmentTable(container, 1200);
    });
  });
}

function deleteHiddenAssignments(container) {
  chrome.storage.sync.get(null, (data) => {
    const hiddenAssignments = Object.values(data).filter(
      (assignment) =>
        assignment &&
        assignment['id'] !== 'PREFERENCES' &&
        assignment['isVisible'] === false &&
        !isDeletedAssignment(assignment)
    );
    const hiddenAssignmentIds = hiddenAssignments.map(
      (assignment) => assignment['id']
    );

    if (hiddenAssignmentIds.length === 0) {
      showStatusMessage(container, '完了リストはすでに空です。');
      return;
    }

    const shouldDelete = window.confirm(
      `完了リスト内の${hiddenAssignmentIds.length}件をこの画面から消します。消した課題はこの画面では戻せませんが、同じ課題が自動で再追加されないように記録だけ残します。必要な課題は先に「一覧に戻す」で戻してください。`
    );
    if (!shouldDelete) {
      return;
    }

    const updates = {};
    for (const assignment of hiddenAssignments) {
      updates[assignment['id']] = createDeletedAssignmentTombstone(assignment);
    }

    chrome.storage.sync.set(updates, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          container,
          '完了リストを空にできませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      showStatusMessage(
        container,
        `${hiddenAssignmentIds.length}件を完了リストから消しました。`
      );
      refreshAssignmentTable(container, 1200);
    });
  });
}

function allowDeletedAssignmentsRefetch(container, assignments) {
  const assignmentIds = assignments
    .filter((assignment) => assignment && assignment['id'])
    .map((assignment) => assignment['id']);
  if (assignmentIds.length === 0) {
    showStatusMessage(
      container,
      '再取得できるようにする課題が選択されていません。'
    );
    return;
  }

  chrome.storage.sync.get(assignmentIds, (data) => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        container,
        '課題を再取得できる状態に戻せませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      return;
    }

    const deletedAssignmentIds = Object.values(data)
      .filter(isDeletedAssignment)
      .map((assignment) => assignment['id']);
    if (deletedAssignmentIds.length === 0) {
      showStatusMessage(
        container,
        '再取得できるようにする課題が選択されていません。'
      );
      return;
    }

    const shouldAllowRefetch = window.confirm(
      `選択した${deletedAssignmentIds.length}件を、講義ページを開いたときに再取得できる状態に戻します。LMS上で未提出・未回答として残っている課題だけが取得されます。`
    );
    if (!shouldAllowRefetch) {
      return;
    }

    chrome.storage.sync.remove(deletedAssignmentIds, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          container,
          '課題を再取得できる状態に戻せませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      showStatusMessage(
        container,
        `${deletedAssignmentIds.length}件を再取得できる状態に戻しました。該当する講義ページを開くと取得されます。`
      );
      refreshAssignmentTable(container, 1200);
    });
  });
}

function permanentlyDeleteDeletedAssignments(container, assignments) {
  const assignmentIds = assignments
    .filter((assignment) => assignment && assignment['id'])
    .map((assignment) => assignment['id']);
  if (assignmentIds.length === 0) {
    showStatusMessage(container, '完全に削除する記録が選択されていません。');
    return;
  }

  chrome.storage.sync.get(assignmentIds, (data) => {
    if (chrome.runtime.lastError) {
      showStatusMessage(
        container,
        '取得を止めている記録を完全に削除できませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      return;
    }

    const deletedAssignmentIds = Object.values(data)
      .filter(isDeletedAssignment)
      .map((assignment) => assignment['id']);
    if (deletedAssignmentIds.length === 0) {
      showStatusMessage(container, '完全に削除する記録が選択されていません。');
      return;
    }

    const shouldDeletePermanently = window.confirm(
      `選択した${deletedAssignmentIds.length}件の取得を止めている記録を完全に削除します。LMS上に同じ未提出・未回答課題が残っている場合、講義ページを開くと再取得されることがあります。`
    );
    if (!shouldDeletePermanently) {
      return;
    }

    chrome.storage.sync.remove(deletedAssignmentIds, () => {
      if (chrome.runtime.lastError) {
        showStatusMessage(
          container,
          '取得を止めている記録を完全に削除できませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      showStatusMessage(
        container,
        `${deletedAssignmentIds.length}件の取得を止めている記録を完全に削除しました。`
      );
      refreshAssignmentTable(container, 1200);
    });
  });
}

function createHiddenAssignmentsSection(
  container,
  hiddenAssignments,
  deletedAssignments,
  subjectNamesById = new Map()
) {
  const sectionElem = document.createElement('div');
  sectionElem.style.display = 'none';
  sectionElem.style.margin = '8px 0 14px';
  sectionElem.style.maxHeight = '320px';
  sectionElem.style.overflowY = 'auto';

  const sectionToolsElem = document.createElement('div');
  sectionToolsElem.style.display = 'flex';
  sectionToolsElem.style.alignItems = 'center';
  sectionToolsElem.style.flexWrap = 'wrap';
  sectionToolsElem.style.gap = '8px';
  sectionToolsElem.style.margin = '0 0 8px';

  const selectedHiddenAssignments = new Map();
  const restoreControls = {
    countElem: null,
    restoreBtn: null,
  };

  const selectedCountElem = document.createElement('strong');
  selectedCountElem.style.color = '#1f4f5e';
  selectedCountElem.style.backgroundColor = '#eaf3f6';
  selectedCountElem.style.border = '1px solid #cfe0e6';
  selectedCountElem.style.borderRadius = '4px';
  selectedCountElem.style.padding = '5px 8px';
  selectedCountElem.style.lineHeight = '1.3';
  sectionToolsElem.appendChild(selectedCountElem);

  const restoreSelectedBtn = createSecondaryButton(
    RESTORE_SELECTED_ASSIGNMENTS_TXT,
    'primary'
  );
  restoreSelectedBtn.addEventListener('click', () => {
    restoreAssignments(
      container,
      Array.from(selectedHiddenAssignments.values())
    );
  });
  sectionToolsElem.appendChild(restoreSelectedBtn);
  restoreControls.countElem = selectedCountElem;
  restoreControls.restoreBtn = restoreSelectedBtn;
  updateSelectedRestoreControls(selectedHiddenAssignments, restoreControls);

  const deleteCompletedBtn = createSecondaryButton(
    DELETE_COMPLETED_ASSIGNMENTS_TXT,
    'danger'
  );
  deleteCompletedBtn.addEventListener('click', () => {
    deleteHiddenAssignments(container);
  });
  sectionToolsElem.appendChild(deleteCompletedBtn);

  if (hiddenAssignments.length > 0) {
    const tableElem = createAssignmentSelectionTable(
      hiddenAssignments,
      selectedHiddenAssignments,
      restoreControls,
      `${ASSIGNMENT_NAME_PLACEHOLDER}を一覧に戻す対象として選択`,
      subjectNamesById
    );
    sectionElem.appendChild(sectionToolsElem);
    sectionElem.appendChild(tableElem);
  } else {
    const emptyCompletedElem = document.createElement('p');
    emptyCompletedElem.innerText = '一覧に戻せる完了課題はありません。';
    emptyCompletedElem.style.margin = '6px 0 10px';
    emptyCompletedElem.style.color = '#555';
    emptyCompletedElem.style.fontWeight = '700';
    sectionElem.appendChild(emptyCompletedElem);
  }

  if (deletedAssignments.length > 0) {
    sectionElem.appendChild(
      createStoppedFetchSection(container, deletedAssignments, subjectNamesById)
    );
  }

  return sectionElem;
}

function createAssignmentSelectionTable(
  assignments,
  selectedAssignments,
  controls,
  ariaLabelTemplate,
  subjectNamesById = new Map()
) {
  const tableElem = document.createElement('table');
  tableElem.style.width = '100%';
  tableElem.style.borderCollapse = 'collapse';
  tableElem.style.backgroundColor = '#fff';
  const headerRowElem = document.createElement('tr');
  for (const headerText of [
    LECTURE_TXT,
    ASSIGNMENT_TXT,
    DEADLINE_TXT,
    ACTION_TXT,
  ]) {
    const headerElem = document.createElement('th');
    headerElem.innerText = headerText;
    headerElem.style.textAlign = 'left';
    headerElem.style.borderBottom = '1px solid #ddd';
    headerElem.style.padding = '6px';
    headerRowElem.appendChild(headerElem);
  }
  tableElem.appendChild(headerRowElem);

  for (const assignment of assignments) {
    const rowElem = document.createElement('tr');
    rowElem.style.color = '#555';

    const subjectElem = document.createElement('td');
    subjectElem.innerText = getDisplaySubject(assignment, subjectNamesById);
    subjectElem.style.padding = '6px';
    rowElem.appendChild(subjectElem);

    const nameElem = document.createElement('td');
    nameElem.innerText = getDisplayAssignmentName(assignment, subjectNamesById);
    nameElem.style.padding = '6px';
    rowElem.appendChild(nameElem);

    const dueElem = document.createElement('td');
    dueElem.innerText = formatDueText(assignment);
    dueElem.style.padding = '6px';
    rowElem.appendChild(dueElem);

    const selectElem = document.createElement('td');
    selectElem.style.padding = '6px';
    selectElem.style.textAlign = 'center';
    const restoreCheckbox = document.createElement('input');
    restoreCheckbox.type = 'checkbox';
    restoreCheckbox.setAttribute(
      'aria-label',
      ariaLabelTemplate.replace(
        ASSIGNMENT_NAME_PLACEHOLDER,
        getDisplayAssignmentName(assignment, subjectNamesById)
      )
    );
    restoreCheckbox.addEventListener('change', () => {
      if (restoreCheckbox.checked) {
        selectedAssignments.set(assignment['id'], assignment);
      } else {
        selectedAssignments.delete(assignment['id']);
      }
      updateSelectedRestoreControls(selectedAssignments, controls);
    });
    selectElem.appendChild(restoreCheckbox);
    rowElem.appendChild(selectElem);

    tableElem.appendChild(rowElem);
  }

  return tableElem;
}

function createStoppedFetchSection(
  container,
  deletedAssignments,
  subjectNamesById = new Map()
) {
  const wrapperElem = document.createElement('div');
  wrapperElem.style.margin = '12px 0 0';
  wrapperElem.style.borderTop = '1px solid #e1e7ea';
  wrapperElem.style.paddingTop = '10px';

  const summaryToolsElem = document.createElement('div');
  summaryToolsElem.style.display = 'flex';
  summaryToolsElem.style.alignItems = 'center';
  summaryToolsElem.style.flexWrap = 'wrap';
  summaryToolsElem.style.gap = '8px';

  const countElem = document.createElement('strong');
  countElem.innerText = `${STOPPED_FETCH_ASSIGNMENTS_TXT} ${deletedAssignments.length}件`;
  countElem.style.color = '#555';
  countElem.style.backgroundColor = '#f6f6f6';
  countElem.style.border = '1px solid #ddd';
  countElem.style.borderRadius = '4px';
  countElem.style.padding = '5px 8px';
  countElem.style.lineHeight = '1.3';
  summaryToolsElem.appendChild(countElem);

  const showStoppedFetchBtn = createSecondaryButton(
    SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT
  );
  summaryToolsElem.appendChild(showStoppedFetchBtn);
  wrapperElem.appendChild(summaryToolsElem);

  const detailElem = document.createElement('div');
  detailElem.style.display = 'none';
  detailElem.style.margin = '8px 0 0';

  const selectedDeletedAssignments = new Map();
  const refetchControls = {
    countElem: null,
    restoreBtn: null,
    permanentDeleteBtn: null,
  };

  const detailToolsElem = document.createElement('div');
  detailToolsElem.style.display = 'flex';
  detailToolsElem.style.alignItems = 'center';
  detailToolsElem.style.flexWrap = 'wrap';
  detailToolsElem.style.gap = '8px';
  detailToolsElem.style.margin = '0 0 8px';

  const selectedCountElem = document.createElement('strong');
  selectedCountElem.style.color = '#1f4f5e';
  selectedCountElem.style.backgroundColor = '#eaf3f6';
  selectedCountElem.style.border = '1px solid #cfe0e6';
  selectedCountElem.style.borderRadius = '4px';
  selectedCountElem.style.padding = '5px 8px';
  selectedCountElem.style.lineHeight = '1.3';
  detailToolsElem.appendChild(selectedCountElem);

  const allowRefetchBtn = createSecondaryButton(
    ALLOW_REFETCH_DELETED_ASSIGNMENTS_TXT,
    'primary'
  );
  allowRefetchBtn.addEventListener('click', () => {
    allowDeletedAssignmentsRefetch(
      container,
      Array.from(selectedDeletedAssignments.values())
    );
  });
  detailToolsElem.appendChild(allowRefetchBtn);
  refetchControls.countElem = selectedCountElem;
  refetchControls.restoreBtn = allowRefetchBtn;

  const permanentDeleteBtn = createSecondaryButton(
    PERMANENTLY_DELETE_STOPPED_FETCH_TXT,
    'danger'
  );
  permanentDeleteBtn.addEventListener('click', () => {
    permanentlyDeleteDeletedAssignments(
      container,
      Array.from(selectedDeletedAssignments.values())
    );
  });
  detailToolsElem.appendChild(permanentDeleteBtn);
  refetchControls.permanentDeleteBtn = permanentDeleteBtn;
  updateSelectedRefetchControls(selectedDeletedAssignments, refetchControls);

  const tableElem = createAssignmentSelectionTable(
    deletedAssignments,
    selectedDeletedAssignments,
    refetchControls,
    `${ASSIGNMENT_NAME_PLACEHOLDER}を再取得できるようにする対象として選択`,
    subjectNamesById
  );
  detailElem.appendChild(detailToolsElem);
  detailElem.appendChild(tableElem);

  showStoppedFetchBtn.addEventListener('click', () => {
    const isHidden = detailElem.style.display === 'none';
    detailElem.style.display = isHidden ? 'block' : 'none';
    showStoppedFetchBtn.innerText = isHidden
      ? HIDE_STOPPED_FETCH_ASSIGNMENTS_TXT
      : SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT;
  });

  wrapperElem.appendChild(detailElem);
  return wrapperElem;
}

function getCellText(cell) {
  if (!cell) {
    return '';
  }
  if (typeof cell === 'string') {
    return cell.replace(/(<([^>]+)>)/gi, '');
  }
  if (typeof cell.textContent === 'string') {
    return cell.textContent;
  }
  if (cell.props) {
    return getCellText(cell.props.content);
  }
  return '';
}

function injectAssignmentTable() {
  const DISPLAY_LIMIT_DAYS = 31;
  const GAS_TASKAPI_URL =
    'https://script.google.com/macros/s/AKfycbxOkCMKIeXHZPxkVHZbQDlU6ezRRljwJdypjI9B4qA2l3oZqfgtxOzDr6jY1PoN9rTa6Q/exec';

  const lectureURIElems = Array.from(
    document.querySelectorAll('[onclick^=formSubmit]')
  );
  const subjectNamesById = createLmsSubjectMap(lectureURIElems);

  getRecordPerPage((recordPerPage) => {
    removeExpiredAssignmentsFromStorage(() => {
      chrome.storage.sync.get(null, (data) => {
        backfillDeletedAssignmentMetadataFromLms(data, subjectNamesById);
        const assignments = Object.values(data);
        // Cannot sort items outside chrome.storage.sync.get
        assignments.sort(compareAssignmentsByDue);

        let asm = [];
        let hiddenAssignments = [];
        let deletedAssignments = [];
        const selectedAssignments = new Map();
        const selectionControls = {
          countElem: null,
          completeBtn: null,
        };
        let activeAssignmentCount = 0;
        for (const assignment of assignments) {
          if (!assignment) {
            continue;
          }
          if (assignment['id'] === 'PREFERENCES') {
            continue;
          }
          if (isDeletedAssignment(assignment)) {
            deletedAssignments.push(assignment);
            continue;
          }
          if (assignment['isVisible'] === false) {
            hiddenAssignments.push(assignment);
            continue;
          }
          //separated evaluation of visibility and date left
          if (isVisibleAssignment(assignment)) {
            var daysLeft;
            if (hasValidDue(assignment)) {
              daysLeft = (new Date(assignment['due']) - new Date()) / 86400000;
              if (daysLeft >= DISPLAY_LIMIT_DAYS) continue;
            }
            activeAssignmentCount++;
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
                    x.parentElement.textContent.includes(
                      assignment['subject_en']
                    )
                  )[0]
                  .getAttribute('onclick')
              );
            }
            subjectElem.innerText = getDisplaySubject(
              assignment,
              subjectNamesById
            );

            let linkElem = document.createElement('a');
            const taskParams = new URLSearchParams({
              language: getLanguage(),
              subject:
                getLanguage() === '日本語'
                  ? assignment['subject_ja']
                  : assignment['subject_en'],
              name: assignment['name'],
              due: '',
              id: assignment['id'],
            });
            if (hasValidDue(assignment)) {
              taskParams.set(
                'due',
                new Date(
                  new Date(assignment['due']).getTime() -
                    new Date(assignment['due']).getTimezoneOffset() * 60 * 1000
                ).toJSON()
              );
              linkElem.href = `${GAS_TASKAPI_URL}?${taskParams.toString()}`;
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
                linkElem.style = 'color: turquoise';
              }
            } else {
              linkElem.href = `${GAS_TASKAPI_URL}?${taskParams.toString()}`;
              linkElem.appendChild(createNoDeadlineElem());
            }
            linkElem.target = '_blank';
            linkElem.rel = 'noopener noreferrer';

            let selectionCheckbox = h('input', {
              type: 'checkbox',
              checked: selectedAssignments.has(assignment['id']),
              'aria-label': `${getDisplayAssignmentName(
                assignment,
                subjectNamesById
              )}を選択`,
              onChange: (event) => {
                if (event.currentTarget.checked) {
                  selectedAssignments.set(assignment['id'], assignment);
                } else {
                  selectedAssignments.delete(assignment['id']);
                }
                updateSelectedCompletionControls(
                  selectedAssignments,
                  selectionControls
                );
              },
              style: {
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              },
            });
            asm.push([
              subjectElem,
              getDisplayAssignmentName(assignment, subjectNamesById),
              linkElem,
              selectionCheckbox,
            ]);
          }
        }

        let mainElem = document.querySelector('div.contentsColumn');
        const tableElem = document.createElement('div');
        tableElem.appendChild(
          createTableControls(
            tableElem,
            hiddenAssignments,
            deletedAssignments,
            activeAssignmentCount,
            selectedAssignments,
            selectionControls,
            subjectNamesById
          )
        );
        if (activeAssignmentCount === 0) {
          showEmptyState(tableElem);
          mainElem.prepend(tableElem);
          return;
        }
        const gridMountElem = document.createElement('div');
        tableElem.appendChild(gridMountElem);
        new Grid({
          columns: [
            {
              name: LECTURE_TXT,
              width: '25%',
              sort: {
                compare: (a, b) => {
                  const aText = getCellText(a);
                  const bText = getCellText(b);
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
              sort: false,
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
                return getCellText(cell);
              } else {
                return cell;
              }
            },
          },
          data: asm,
          sort: true,
          pagination: { limit: recordPerPage, summary: true },
          language: GRIDJS_LANGUAGE,
        }).render(gridMountElem);
        mainElem.prepend(tableElem);
      });
    });
  });
}

function getRecordPerPage(callback) {
  chrome.storage.local.get('PREFERENCES', (data) => {
    const prefs = data['PREFERENCES'];
    const recordPerPage = parseInt(prefs && prefs.recordPerPage, 10);

    if (
      Number.isFinite(recordPerPage) &&
      1 <= recordPerPage &&
      recordPerPage <= 100
    ) {
      callback(recordPerPage);
    } else {
      callback(6);
    }
  });
}

var target = document.querySelector('div#main');

function getNowYMDStr(date) {
  const Y = date.getFullYear();
  const M = ('00' + (date.getMonth() + 1)).slice(-2);
  const D = ('00' + date.getDate()).slice(-2);

  return Y + M + D;
}
