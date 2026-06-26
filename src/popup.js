var SHOW_ALL_TXT = 'すべて再表示';
var HIDDEN_ASSIGNMENTS_TXT = '完了した課題';
var SHOW_HIDDEN_ASSIGNMENTS_TXT = '完了した課題を表示';
var HIDE_HIDDEN_ASSIGNMENTS_TXT = '完了した課題を閉じる';
var DELETE_COMPLETED_TXT = '完了リストを空にする';
var STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録';
var SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録を表示';
var HIDE_STOPPED_FETCH_ASSIGNMENTS_TXT = '取得を止めている記録を閉じる';
var ALLOW_REFETCH_DELETED_ASSIGNMENTS_TXT =
  '選択した課題を再取得できるようにする';
var PERMANENTLY_DELETE_STOPPED_FETCH_TXT = '選択した記録を完全に削除';
var SUBJECT_TXT = '講義';
var ASSIGNMENT_TXT = '課題名';
var DEADLINE_TXT = '提出期限';
var SHOW_TXT = '一覧に出す';
var RECORD_IN_PAGE_TXT = '表示件数: ';
var NO_DEADLINE_TXT = '期限なし';
var EMPTY_TXT = '表示できる課題はありません。';
var STATUS_TXT =
  'チェックあり: 一覧に表示 / チェックなし: 完了リストへ移動。完了した課題もチェックを入れると一覧に戻せます。提出期限を過ぎると自動で削除されます。';
var ERROR_1_TO_100 = '1 - 100 までの数値を入力してください';

const DEFAULT_PREFERENCES = {
  id: 'PREFERENCES',
  recordPerPage: 6,
};

(async () => {
  loadSetting(renderPopup);
})();

function getDisplaySubject(assignment) {
  return assignment['subject_ja'] || assignment['subject_en'] || '';
}

function getDisplayAssignmentName(assignment) {
  return assignment['name'] || assignment['id'] || '';
}

function getDueSortTime(assignment) {
  if (!assignment || !assignment['due']) {
    return Number.POSITIVE_INFINITY;
  }

  const dueTime = new Date(assignment['due']).getTime();
  return Number.isFinite(dueTime) ? dueTime : Number.POSITIVE_INFINITY;
}

function compareAssignmentsByDue(a, b) {
  const visibilityCompare =
    Number(isVisibleAssignment(b)) - Number(isVisibleAssignment(a));
  if (visibilityCompare !== 0) {
    return visibilityCompare;
  }
  return getDueSortTime(a) - getDueSortTime(b);
}

function hasValidDue(assignment) {
  return Number.isFinite(getDueSortTime(assignment));
}

function isOverdue(assignment) {
  return hasValidDue(assignment) && getDueSortTime(assignment) <= Date.now();
}

function isDeletedAssignment(assignment) {
  return assignment && assignment['isDeleted'] === true;
}

function isVisibleAssignment(assignment) {
  return assignment && assignment['isVisible'] !== false;
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

function loadSetting(callback) {
  chrome.storage.local.get('PREFERENCES', (data) => {
    const prefs = data['PREFERENCES'];
    chrome.storage.local.set(
      {
        PREFERENCES: {
          ...DEFAULT_PREFERENCES,
          ...(prefs || {}),
          id: 'PREFERENCES',
        },
      },
      callback
    );
  });
}

function savePreferences(updates) {
  chrome.storage.local.get('PREFERENCES', (data) => {
    chrome.storage.local.set({
      PREFERENCES: {
        ...DEFAULT_PREFERENCES,
        ...(data['PREFERENCES'] || {}),
        ...updates,
        id: 'PREFERENCES',
      },
    });
  });
}

function refreshPopup() {
  document.body.innerHTML = '';
  renderPopup();
}

function showStatus(message, color = '#2285b1') {
  const statusElem = document.querySelector('#assignment-manager-popup-status');
  if (statusElem) {
    statusElem.style.color = color;
    statusElem.innerText = message;
  }
}

function stylePopupButton(buttonElem, variant = 'default') {
  buttonElem.style.minHeight = '30px';
  buttonElem.style.padding = '4px 10px';
  buttonElem.style.border = '1px solid #b8c7d0';
  buttonElem.style.borderRadius = '4px';
  buttonElem.style.backgroundColor = '#fff';
  buttonElem.style.color = '#226c86';
  buttonElem.style.cursor = 'pointer';
  buttonElem.style.fontWeight = '700';
  if (variant === 'danger') {
    buttonElem.style.backgroundColor = '#fff7f7';
    buttonElem.style.borderColor = '#d8a5a5';
    buttonElem.style.color = '#9f2b2b';
  }
}

function setAssignmentVisibility(assignment, isVisible, callback) {
  chrome.storage.sync.get(assignment['id'], (data) => {
    if (chrome.runtime.lastError) {
      callback({ error: true });
      return;
    }

    const currentAssignment = data[assignment['id']];
    if (!currentAssignment) {
      callback({ skippedMissing: true });
      return;
    }

    if (isDeletedAssignment(currentAssignment)) {
      callback({ skippedDeleted: true });
      return;
    }

    const updatedAssignment = {
      ...currentAssignment,
      isVisible,
    };
    if (isVisible) {
      delete updatedAssignment['hiddenAt'];
      delete updatedAssignment['hiddenReason'];
      delete updatedAssignment['isDeleted'];
      delete updatedAssignment['deletedAt'];
      delete updatedAssignment['deletedReason'];
    } else {
      updatedAssignment['hiddenAt'] = new Date().toJSON();
      updatedAssignment['hiddenReason'] =
        updatedAssignment['hiddenReason'] || 'manual';
    }

    const keypair = {};
    keypair[updatedAssignment['id']] = updatedAssignment;
    chrome.storage.sync.set(keypair, () => {
      callback({ error: Boolean(chrome.runtime.lastError) });
    });
  });
}

function removeExpiredAssignmentsFromStorage(callback = () => {}) {
  chrome.storage.sync.get(null, (data) => {
    if (chrome.runtime.lastError) {
      showStatus(
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
        showStatus(
          '期限切れ課題を自動削除できませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
      }
      callback();
    });
  });
}

function showAllAssignments() {
  chrome.storage.sync.get(null, (data) => {
    const updates = {};
    for (const assignment of Object.values(data)) {
      if (
        assignment &&
        assignment['id'] !== 'PREFERENCES' &&
        !isDeletedAssignment(assignment)
      ) {
        const updatedAssignment = {
          ...assignment,
          isVisible: true,
        };
        delete updatedAssignment['hiddenAt'];
        delete updatedAssignment['hiddenReason'];
        updates[assignment['id']] = updatedAssignment;
      }
    }
    chrome.storage.sync.set(updates, () => {
      if (chrome.runtime.lastError) {
        showStatus(
          '再表示できませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }
      refreshPopup();
    });
  });
}

function deleteCompletedAssignments() {
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
      showStatus('完了リストはすでに空です。');
      return;
    }

    const shouldDelete = window.confirm(
      `完了リスト内の${hiddenAssignmentIds.length}件をこの画面から消します。消した課題はこの画面では戻せませんが、同じ課題が自動で再追加されないように記録だけ残します。必要な課題は先に一覧へ戻してください。`
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
        showStatus(
          '完了リストを空にできませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }
      showStatus(`${hiddenAssignmentIds.length}件を完了リストから消しました。`);
      setTimeout(refreshPopup, 1200);
    });
  });
}

function formatSelectedCount(count) {
  return count === 0 ? '0件選択中' : `${count}件選択済み`;
}

function updateSelectedRefetchControls(selectedAssignments, controls) {
  const selectedCount = selectedAssignments.size;
  controls.countElem.innerText = formatSelectedCount(selectedCount);
  controls.allowRefetchBtn.disabled = selectedCount === 0;
  controls.allowRefetchBtn.style.cursor =
    selectedCount === 0 ? 'not-allowed' : 'pointer';
  controls.allowRefetchBtn.style.opacity = selectedCount === 0 ? '0.55' : '1';
  if (controls.permanentDeleteBtn) {
    controls.permanentDeleteBtn.disabled = selectedCount === 0;
    controls.permanentDeleteBtn.style.cursor =
      selectedCount === 0 ? 'not-allowed' : 'pointer';
    controls.permanentDeleteBtn.style.opacity =
      selectedCount === 0 ? '0.55' : '1';
  }
}

function allowDeletedAssignmentsRefetch(assignments) {
  const assignmentIds = assignments
    .filter((assignment) => assignment && assignment['id'])
    .map((assignment) => assignment['id']);
  if (assignmentIds.length === 0) {
    showStatus('再取得できるようにする課題が選択されていません。');
    return;
  }

  chrome.storage.sync.get(assignmentIds, (data) => {
    if (chrome.runtime.lastError) {
      showStatus(
        '課題を再取得できる状態に戻せませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      return;
    }

    const deletedAssignmentIds = Object.values(data)
      .filter(isDeletedAssignment)
      .map((assignment) => assignment['id']);
    if (deletedAssignmentIds.length === 0) {
      showStatus('再取得できるようにする課題が選択されていません。');
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
        showStatus(
          '課題を再取得できる状態に戻せませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      showStatus(
        `${deletedAssignmentIds.length}件を再取得できる状態に戻しました。該当する講義ページを開くと取得されます。`
      );
      setTimeout(refreshPopup, 1200);
    });
  });
}

function permanentlyDeleteDeletedAssignments(assignments) {
  const assignmentIds = assignments
    .filter((assignment) => assignment && assignment['id'])
    .map((assignment) => assignment['id']);
  if (assignmentIds.length === 0) {
    showStatus('完全に削除する記録が選択されていません。');
    return;
  }

  chrome.storage.sync.get(assignmentIds, (data) => {
    if (chrome.runtime.lastError) {
      showStatus(
        '取得を止めている記録を完全に削除できませんでした。時間をおいてもう一度試してください。',
        '#c0392b'
      );
      return;
    }

    const deletedAssignmentIds = Object.values(data)
      .filter(isDeletedAssignment)
      .map((assignment) => assignment['id']);
    if (deletedAssignmentIds.length === 0) {
      showStatus('完全に削除する記録が選択されていません。');
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
        showStatus(
          '取得を止めている記録を完全に削除できませんでした。時間をおいてもう一度試してください。',
          '#c0392b'
        );
        return;
      }

      showStatus(
        `${deletedAssignmentIds.length}件の取得を止めている記録を完全に削除しました。`
      );
      setTimeout(refreshPopup, 1200);
    });
  });
}

function createStoppedFetchSection(deletedAssignments) {
  const wrapperElem = document.createElement('div');
  wrapperElem.style.display = 'none';
  wrapperElem.style.margin = '8px 0 10px';
  wrapperElem.style.padding = '8px';
  wrapperElem.style.border = '1px solid #ddd';
  wrapperElem.style.borderRadius = '4px';
  wrapperElem.style.backgroundColor = '#fafafa';

  const toolsElem = document.createElement('div');
  toolsElem.style.display = 'flex';
  toolsElem.style.alignItems = 'center';
  toolsElem.style.flexWrap = 'wrap';
  toolsElem.style.gap = '8px';
  toolsElem.style.marginBottom = '8px';

  const selectedDeletedAssignments = new Map();
  const countElem = document.createElement('strong');
  countElem.style.color = '#1f4f5e';
  countElem.style.backgroundColor = '#eaf3f6';
  countElem.style.border = '1px solid #cfe0e6';
  countElem.style.borderRadius = '4px';
  countElem.style.padding = '5px 8px';
  toolsElem.appendChild(countElem);

  const allowRefetchBtn = document.createElement('button');
  allowRefetchBtn.innerText = ALLOW_REFETCH_DELETED_ASSIGNMENTS_TXT;
  stylePopupButton(allowRefetchBtn);
  allowRefetchBtn.addEventListener('click', () => {
    allowDeletedAssignmentsRefetch(
      Array.from(selectedDeletedAssignments.values())
    );
  });
  toolsElem.appendChild(allowRefetchBtn);

  const permanentDeleteBtn = document.createElement('button');
  permanentDeleteBtn.innerText = PERMANENTLY_DELETE_STOPPED_FETCH_TXT;
  stylePopupButton(permanentDeleteBtn, 'danger');
  permanentDeleteBtn.addEventListener('click', () => {
    permanentlyDeleteDeletedAssignments(
      Array.from(selectedDeletedAssignments.values())
    );
  });
  toolsElem.appendChild(permanentDeleteBtn);
  wrapperElem.appendChild(toolsElem);

  const controls = { countElem, allowRefetchBtn, permanentDeleteBtn };
  updateSelectedRefetchControls(selectedDeletedAssignments, controls);

  const tableElem = document.createElement('table');
  tableElem.border = '0';
  tableElem.cellPadding = '0';
  tableElem.cellSpacing = '0';
  tableElem.className = 'cs_table2';
  tableElem.style.width = '100%';
  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="20%">${SUBJECT_TXT}</th>
        <th width="38%">${ASSIGNMENT_TXT}</th>
        <th width="22%">${DEADLINE_TXT}</th>
        <th width="15%">選択</th>
    `;
  tbody.appendChild(columns);

  for (const assignment of deletedAssignments) {
    const record = document.createElement('tr');

    const subjectColumn = document.createElement('td');
    subjectColumn.innerText = getDisplaySubject(assignment);
    record.appendChild(subjectColumn);

    const nameColumn = document.createElement('td');
    nameColumn.innerText = getDisplayAssignmentName(assignment);
    record.appendChild(nameColumn);

    const dueColumn = document.createElement('td');
    dueColumn.align = 'center';
    dueColumn.innerText = hasValidDue(assignment)
      ? new Date(assignment.due).toLocaleString('ja-JP')
      : NO_DEADLINE_TXT;
    record.appendChild(dueColumn);

    const selectColumn = document.createElement('td');
    selectColumn.align = 'center';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedDeletedAssignments.set(assignment['id'], assignment);
      } else {
        selectedDeletedAssignments.delete(assignment['id']);
      }
      updateSelectedRefetchControls(selectedDeletedAssignments, controls);
    });
    selectColumn.appendChild(checkbox);
    record.appendChild(selectColumn);

    tbody.appendChild(record);
  }

  tableElem.appendChild(tbody);
  wrapperElem.appendChild(tableElem);
  return wrapperElem;
}

function createCompletedManagementSection() {
  const wrapperElem = document.createElement('div');
  wrapperElem.style.display = 'none';
  wrapperElem.style.margin = '0 0 10px';
  wrapperElem.style.padding = '8px';
  wrapperElem.style.border = '1px solid #d6e5eb';
  wrapperElem.style.borderRadius = '4px';
  wrapperElem.style.backgroundColor = '#f7fbfc';
  return wrapperElem;
}

function renderPopup() {
  document.body.style.boxSizing = 'border-box';
  document.body.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  document.body.style.margin = '10px';
  document.body.style.minWidth = '620px';

  const controlsElem = document.createElement('div');
  controlsElem.style.display = 'flex';
  controlsElem.style.alignItems = 'center';
  controlsElem.style.flexWrap = 'wrap';
  controlsElem.style.gap = '8px';
  controlsElem.style.marginBottom = '8px';

  const showAllBtn = document.createElement('button');
  showAllBtn.innerText = SHOW_ALL_TXT;
  stylePopupButton(showAllBtn);
  showAllBtn.addEventListener('click', showAllAssignments);
  controlsElem.appendChild(showAllBtn);

  const recordPerPageLabel = document.createElement('label');
  recordPerPageLabel.innerText = RECORD_IN_PAGE_TXT;
  recordPerPageLabel.style.marginLeft = 'auto';
  recordPerPageLabel.style.fontWeight = '700';
  recordPerPageLabel.style.color = '#444';
  const recordPerPageInput = document.createElement('input');
  recordPerPageInput.type = 'number';
  recordPerPageInput.min = 1;
  recordPerPageInput.max = 100;
  recordPerPageInput.style.width = '56px';
  recordPerPageInput.style.minHeight = '28px';
  chrome.storage.local.get('PREFERENCES', (data) => {
    const prefs = data['PREFERENCES'] || DEFAULT_PREFERENCES;
    recordPerPageInput.value = prefs.recordPerPage;
  });
  recordPerPageInput.addEventListener('input', () => {
    const value = parseInt(recordPerPageInput.value, 10);
    if (1 <= value && value <= 100) {
      savePreferences({ recordPerPage: value });
    } else if (recordPerPageInput.value) {
      showStatus(ERROR_1_TO_100, '#c0392b');
    }
  });

  controlsElem.appendChild(recordPerPageLabel);
  controlsElem.appendChild(recordPerPageInput);

  const completedCountElem = document.createElement('strong');
  completedCountElem.style.display = 'none';
  completedCountElem.style.color = '#444';
  completedCountElem.style.backgroundColor = '#eef5f8';
  completedCountElem.style.border = '1px solid #d6e5eb';
  completedCountElem.style.borderRadius = '4px';
  completedCountElem.style.padding = '5px 8px';
  controlsElem.insertBefore(completedCountElem, recordPerPageLabel);

  const completedToggleBtn = document.createElement('button');
  completedToggleBtn.innerText = SHOW_HIDDEN_ASSIGNMENTS_TXT;
  stylePopupButton(completedToggleBtn);
  completedToggleBtn.style.display = 'none';
  controlsElem.insertBefore(completedToggleBtn, recordPerPageLabel);

  const statusElem = document.createElement('p');
  statusElem.id = 'assignment-manager-popup-status';
  statusElem.innerText = STATUS_TXT;
  statusElem.style.color = '#444';
  statusElem.style.fontWeight = '700';
  statusElem.style.margin = '0 0 8px';

  const listBlockElem = document.createElement('div');
  listBlockElem.id = 'list_block';
  listBlockElem.style =
    'margin-bottom: 10px; box-sizing: border-box; width: 620px; max-height: 360px; overflow-y: auto';

  const tableElem = document.createElement('table');
  tableElem.border = '0';
  tableElem.cellPadding = '0';
  tableElem.cellSpacing = '0';
  tableElem.className = 'cs_table2';
  tableElem.style.width = '100%';

  const tbody = document.createElement('tbody');
  const columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="20%">${SUBJECT_TXT}</th>
        <th width="38%">${ASSIGNMENT_TXT}</th>
        <th width="22%">${DEADLINE_TXT}</th>
        <th width="15%">${SHOW_TXT}</th>
    `;

  tbody.appendChild(columns);

  const completedManagementSectionElem = createCompletedManagementSection();
  completedToggleBtn.addEventListener('click', () => {
    const isHidden = completedManagementSectionElem.style.display === 'none';
    completedManagementSectionElem.style.display = isHidden ? 'block' : 'none';
    completedToggleBtn.innerText = isHidden
      ? HIDE_HIDDEN_ASSIGNMENTS_TXT
      : SHOW_HIDDEN_ASSIGNMENTS_TXT;
  });

  removeExpiredAssignmentsFromStorage(() => {
    chrome.storage.sync.get(null, (data) => {
      const storedAssignments = Object.values(data).filter(
        (assignment) => assignment && assignment['id'] !== 'PREFERENCES'
      );
      const assignments = Object.values(data)
        .filter(
          (assignment) =>
            assignment &&
            assignment['id'] !== 'PREFERENCES' &&
            !isDeletedAssignment(assignment)
        )
        .sort(compareAssignmentsByDue);
      const completedAssignmentCount = assignments.filter(
        (assignment) => assignment['isVisible'] === false
      ).length;
      const deletedAssignments = storedAssignments.filter(isDeletedAssignment);

      if (completedAssignmentCount > 0 || deletedAssignments.length > 0) {
        completedCountElem.innerText = `${HIDDEN_ASSIGNMENTS_TXT} ${completedAssignmentCount}件`;
        completedCountElem.style.display = 'inline-block';
        completedToggleBtn.style.display = 'inline-block';
      }

      if (completedAssignmentCount > 0) {
        const completedToolsElem = document.createElement('div');
        completedToolsElem.style.display = 'flex';
        completedToolsElem.style.alignItems = 'center';
        completedToolsElem.style.flexWrap = 'wrap';
        completedToolsElem.style.gap = '8px';
        completedToolsElem.style.margin = '0 0 8px';

        const deleteCompletedBtn = document.createElement('button');
        deleteCompletedBtn.innerText = DELETE_COMPLETED_TXT;
        stylePopupButton(deleteCompletedBtn, 'danger');
        deleteCompletedBtn.addEventListener(
          'click',
          deleteCompletedAssignments
        );
        completedToolsElem.appendChild(deleteCompletedBtn);
        completedManagementSectionElem.appendChild(completedToolsElem);
      }

      if (deletedAssignments.length > 0) {
        const stoppedFetchToolsElem = document.createElement('div');
        stoppedFetchToolsElem.style.display = 'flex';
        stoppedFetchToolsElem.style.alignItems = 'center';
        stoppedFetchToolsElem.style.flexWrap = 'wrap';
        stoppedFetchToolsElem.style.gap = '8px';

        const stoppedFetchStatusElem = document.createElement('strong');
        stoppedFetchStatusElem.innerText = `${STOPPED_FETCH_ASSIGNMENTS_TXT} ${deletedAssignments.length}件`;
        stoppedFetchStatusElem.style.color = '#555';
        stoppedFetchStatusElem.style.backgroundColor = '#f6f6f6';
        stoppedFetchStatusElem.style.border = '1px solid #ddd';
        stoppedFetchStatusElem.style.borderRadius = '4px';
        stoppedFetchStatusElem.style.padding = '5px 8px';
        stoppedFetchToolsElem.appendChild(stoppedFetchStatusElem);

        const stoppedFetchToggleBtn = document.createElement('button');
        stoppedFetchToggleBtn.innerText = SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT;
        stylePopupButton(stoppedFetchToggleBtn);
        stoppedFetchToolsElem.appendChild(stoppedFetchToggleBtn);

        const stoppedFetchSectionElem =
          createStoppedFetchSection(deletedAssignments);
        stoppedFetchToggleBtn.addEventListener('click', () => {
          const isHidden = stoppedFetchSectionElem.style.display === 'none';
          stoppedFetchSectionElem.style.display = isHidden ? 'block' : 'none';
          stoppedFetchToggleBtn.innerText = isHidden
            ? HIDE_STOPPED_FETCH_ASSIGNMENTS_TXT
            : SHOW_STOPPED_FETCH_ASSIGNMENTS_TXT;
        });
        completedManagementSectionElem.appendChild(stoppedFetchToolsElem);
        completedManagementSectionElem.appendChild(stoppedFetchSectionElem);
      }

      if (assignments.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyColumn = document.createElement('td');
        emptyColumn.colSpan = 4;
        emptyColumn.innerText = EMPTY_TXT;
        emptyColumn.style.textAlign = 'center';
        emptyColumn.style.padding = '12px';
        emptyRow.appendChild(emptyColumn);
        tbody.appendChild(emptyRow);
      }

      for (const assignment of assignments) {
        const record = document.createElement('tr');
        if (!isVisibleAssignment(assignment)) {
          record.style.opacity = '0.65';
        }

        const subjectColumn = document.createElement('td');
        const subjectElem = document.createElement('p');
        subjectElem.innerText = getDisplaySubject(assignment);
        subjectColumn.appendChild(subjectElem);

        const nameColumn = document.createElement('td');
        const nameElem = document.createElement('p');
        nameElem.innerText = getDisplayAssignmentName(assignment);
        nameColumn.appendChild(nameElem);

        const dueColumn = document.createElement('td');
        dueColumn.align = 'center';
        if (hasValidDue(assignment)) {
          dueColumn.innerText = new Date(assignment.due).toLocaleString(
            'ja-JP'
          );
          if (isOverdue(assignment)) {
            dueColumn.style.color = '#666';
            dueColumn.style.fontWeight = '700';
          }
        } else {
          dueColumn.innerText = NO_DEADLINE_TXT;
          dueColumn.style.color = '#666';
          dueColumn.style.fontWeight = '700';
        }

        const showColumn = document.createElement('td');
        showColumn.align = 'center';

        const showCheckbox = document.createElement('input');
        showCheckbox.checked = isVisibleAssignment(assignment);
        showCheckbox.type = 'checkbox';
        showCheckbox.addEventListener('change', () => {
          setAssignmentVisibility(
            assignment,
            showCheckbox.checked,
            (result) => {
              if (result && (result.skippedDeleted || result.skippedMissing)) {
                showCheckbox.checked = !showCheckbox.checked;
                const message = result.skippedDeleted
                  ? '完了リストから消した課題は、この操作では一覧に戻せません。再取得できるようにしてから講義ページを開いてください。'
                  : '選択した課題はすでに削除されています。画面を更新してください。';
                showStatus(message, '#c0392b');
                return;
              }
              if (result && result.error) {
                showCheckbox.checked = !showCheckbox.checked;
                showStatus(
                  '変更できませんでした。時間をおいてもう一度試してください。',
                  '#c0392b'
                );
                return;
              }
              refreshPopup();
            }
          );
        });
        showColumn.appendChild(showCheckbox);

        record.appendChild(subjectColumn);
        record.appendChild(nameColumn);
        record.appendChild(dueColumn);
        record.appendChild(showColumn);

        tbody.append(record);
      }
    });
  });

  tableElem.appendChild(tbody);
  listBlockElem.appendChild(tableElem);

  document.body.appendChild(controlsElem);
  document.body.appendChild(statusElem);
  document.body.appendChild(completedManagementSectionElem);
  document.body.appendChild(listBlockElem);
}
