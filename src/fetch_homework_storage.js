// fetch_homework_storage.js
// Fetch homework to submit or resubmit

const A_TYPE = {
  other: 1,
  report: 2,
  test: 3,
  questionnaire: 4,
};

/* main */
(async () => {
  setTextLanguage();

  const newAssignments = await getAssignments();
  saveToStorage(newAssignments);

  const assignments = await loadFromStorage();
  const curLecId = getLectureID();
  injectAssignmentTable(assignments.filter((x) => x.subject_id == curLecId));
})();

function setTextLanguage() {
  //LANGUAGE = document.querySelector("#langList > option[selected]").textContent
  LANGUAGE = getLanguage();
  if (LANGUAGE == 'English') {
    ASSIGNMENT_FOR_THIS_LECTURE_TXT = 'Assignments';
    ASSIGNMENT_TXT = 'Assignment';
    DEADLINE_TXT = 'DEADLINE';
    NOT_EXECUTED_TXT = 'Not executed';
    NOT_VIEWED_TXT = 'Not viewed';
    NOT_SUBMITTED_TXT = 'Not submitted';
    NOT_RESPONDED_TXT = 'Not responded';
    RESUBMISSION_TXT = 'Resubmission';
  } else {
    ASSIGNMENT_FOR_THIS_LECTURE_TXT = '課題';
    ASSIGNMENT_TXT = '課題名';
    DEADLINE_TXT = '提出期限';
    NOT_VIEWED_TXT = '未参照';
    NOT_SUBMITTED_TXT = '未提出';
    NOT_EXECUTED_TXT = '未実施';
    NOT_RESPONDED_TXT = '未回答';
    RESUBMISSION_TXT = '再提出';
  }
}

function getLanguage() {
  const LOGOUT_TEXT = document.querySelector(
    '#form-id > div > ul > li.logoutButtonFrame > a'
  ).textContent;
  return LOGOUT_TEXT.includes('Logout') ? 'English' : '日本語';
}

class Assignment {
  constructor(id, subject_ja, subject_en, name, due, isVisible) {
    this.id = id;
    this.subject_ja = subject_ja;
    this.subject_en = subject_en;
    this.name = name;
    this.due = due.toJSON();
    this.isVisible = isVisible;
  }
}

async function getAssignments() {
  class Assignment {
    constructor(id, subject_id, subject_ja, subject_en, name, due, isVisible) {
      this.id = id;
      this.subject_id = subject_id;
      this.subject_ja = subject_ja;
      this.subject_en = subject_en;
      this.name = name;
      this.due = due.toJSON();
      this.isVisible = isVisible;
    }
  }

  if (LANGUAGE == 'English') {
    //regex = /(Submission Due on|Resubmission deadline|Response Due on|Activity Due on):(.*)/
    //availableText = 'Available'
    unavailableText = 'Unavailable';
  } else if (LANGUAGE == '日本語') {
    //regex = /(提出期限|再提出期限|回答期限|実施期限):(.*)/
    //availableText = '公開中'
    unavailableText = '公開終了';
  }

  const subject_id = getLectureID();
  let subject_texts = getSubjectTexts(LANGUAGE);
  //const subject_ja = subject_texts[2]
  //const subject_en = subject_texts[4]
  if (subject_texts instanceof Array) {
    subject_ja = subject_texts[1];
    subject_en = subject_texts[3];
  } else {
    subject_ja = subject_texts;
    subject_en = subject_texts;
  }

  let assignments = [];
  const idsInStorage = await loadIDsFromStorage();

  //const assignmentDateElems = document.querySelectorAll("tbody > tr > td.td03")
  const assignmentDateElems = Array.from(
    document.querySelectorAll('[id^=REP],[id^=ANK],[id^=TES]')
  ).map((x) => x.parentElement);

  for (const dateElem of assignmentDateElems) {
    /*
        let isDue = dateElem.textContent.match(regex);
        let isAvailable = dateElem.parentElement.querySelector("td.td02").textContent.trim() == availableText

        if (isDue && isAvailable) {

            const id = dateElem.parentElement.querySelector("td.td01").id
            const name = dateElem.parentElement.querySelector("td.td01").textContent.trim()
            const dueDate = isDue[2]
            
            if (!idsInStorage.includes(id)) {
                const assignment = new Assignment(id, subject_ja, subject_en, name, new Date(dueDate), true)
                assignments.push(assignment)
            } else {
                console.log(id + ' is already added')
            }
        }
        */
    let isNotSubmitted =
      (dateElem.querySelector('td.jyugyeditCell > span').textContent ==
        NOT_SUBMITTED_TXT) |
      (dateElem.querySelector('td.jyugyeditCell > span').textContent ==
        NOT_VIEWED_TXT) |
      (dateElem.querySelector('td.jyugyeditCell > span').textContent ==
        NOT_EXECUTED_TXT) |
      (dateElem.querySelector('td.jyugyeditCell > span').textContent ==
        NOT_RESPONDED_TXT) |
      (dateElem.querySelector('td.jyugyeditCell > span').textContent ==
        RESUBMISSION_TXT);
    let isDue = !dateElem.textContent.includes(unavailableText);

    if (isDue && isNotSubmitted) {
      const id = dateElem.querySelector('td.kyozaititleCell').id;
      const name = dateElem
        .querySelector('td.kyozaititleCell')
        .textContent.trim()
        .match(/(.*)\n(\s*)(.*)/)[3];
      const dueDate = new Date(
        dateElem.querySelectorAll('td.jyugyeditCell')[0].textContent.trim()
      );
      dueDate.setSeconds(dueDate.getSeconds() - 1);

      if (!idsInStorage.includes(id)) {
        const assignment = new Assignment(
          id,
          subject_id,
          subject_ja,
          subject_en,
          name,
          dueDate,
          true
        );
        assignments.push(assignment);
      } else {
        console.log(id + ' is already added');
      }
    }
  }

  return assignments;
}

function getSubjectTexts(lang) {
  //return document.querySelector("#cs_loginInfo_left ul li:not(#home)").textContent.match(/(\>\s)(.*)(\[)(.*)(\])(\[.*\])/)
  if (lang == 'English')
    return document
      .querySelector(
        'body > div.base > div.headerContents > div.courseMenu > div.courseName'
      )
      .textContent.trim();
  else {
    let elem = document
      .querySelector(
        'body > div.base > div.headerContents > div.courseMenu > div.courseName'
      )
      .textContent.trim()
      .match(/(.*)(\[)(.*)(\])/);
    if (elem != null && elem.length > 4) {
      return elem;
    }
    return document
      .querySelector(
        'body > div.base > div.headerContents > div.courseMenu > div.courseName'
      )
      .textContent.trim();
  }
}

function injectAssignmentTable(assignments) {
  const BANNER_ICON_URL = '/lms/img/cs/yazi3.gif';

  let bannerElem = document.createElement('div');
  bannerElem.id = 'title';
  bannerElem.innerHTML = `
        <h2>${ASSIGNMENT_FOR_THIS_LECTURE_TXT}
            <img src="${BANNER_ICON_URL}">
        </h2>
    `;

  let listBlockElem = document.createElement('div');
  listBlockElem.id = 'list_block';

  let tableElem = document.createElement('table');
  tableElem.className = 'cs_table2';

  let tbody = document.createElement('tbody');
  let columns = document.createElement('tr');
  columns.innerHTML = `
        <th width="37%">${ASSIGNMENT_TXT}</th>
        <th width="10%">${DEADLINE_TXT}</th>
    `;

  tbody.appendChild(columns);

  assignments.sort((a, b) => new Date(a['due']) - new Date(b['due']));
  for (const assignment of assignments) {
    // name, due
    let record = document.createElement('tr');

    // name
    let nameColumn = document.createElement('td');

    let img = document.createElement('img');
    img.src = getIconURLFromID(assignment['id']);
    let a = document.createElement('a');
    a.href = 'javascript:void(0)';
    a.setAttribute(
      'onclick',
      `kyozaiTitleLink('${assignment['id']}','0${checkAssignmentType(assignment['id'])}')`
    );
    a.innerText = assignment.name;

    nameColumn.appendChild(img);
    nameColumn.appendChild(a);

    // due
    let dueColumn = document.createElement('td');
    dueColumn.align = 'center';
    if (assignment.due) {
      dueColumn.innerText = new Date(assignment.due).toLocaleString('ja-JP');
    } else {
      dueColumn.innerText = '-';
    }

    record.appendChild(nameColumn);
    record.appendChild(dueColumn);

    tbody.append(record);
  }

  tableElem.appendChild(tbody);
  listBlockElem.appendChild(tableElem);
  listBlockElem.style =
    'box-sizing: border-box; height: 100%; max-height: 15rem; margin-bottom: 2rem; overflow-y: auto';

  //let mainElem = document.querySelector('div#main')
  let mainElem = document.querySelector('div.contentsColumn');
  mainElem.prepend(listBlockElem);
  mainElem.prepend(bannerElem);
}

function getIconURLFromID(hw_name) {
  const type = checkAssignmentType(hw_name);
  if (type == A_TYPE.report) {
    //return "/lms/img/cs/icon2b.gif"
    return '/lms/img/pc/material_report_S.png';
  } else if (type == A_TYPE.questionnaire) {
    //return "/lms/img/cs/icon7b.gif"
    return '/lms/img/pc/material_questionnaire_S.png';
  } else if (type == A_TYPE.test) {
    //return "/lms/img/cs/icon3b.gif"
    return '/lms/img/pc/material_exam_S.png';
  } else {
    //return "/lms/img/cs/icon5b.gif"
    return '/lms/img/pc/material_study-materials_S.png';
  }
}

function checkAssignmentType(id) {
  if (id.includes('REP')) {
    //return "/lms/img/cs/icon2b.gif"
    return A_TYPE.report;
  } else if (id.includes('ANK')) {
    //return "/lms/img/cs/icon7b.gif"
    return A_TYPE.questionnaire;
  } else if (id.includes('TES')) {
    //return "/lms/img/cs/icon3b.gif"
    return A_TYPE.test;
  } else {
    //return "/lms/img/cs/icon5b.gif"
    return A_TYPE.other;
  }
}

function getLectureID() {
  //return document.querySelector("#cs_loginInfo_left ul li:not(#home)").textContent.match(/(.*)\[(.*)\]/)[2]
  let subjectNameElem = document
    .querySelector(
      'body > div.base > div.headerContents > div.breadCrumbBar > ul > li.current > a > p'
    )
    .textContent.match(/(.*)\[(.*)\]/);
  if (subjectNameElem != null && subjectNameElem.length > 2)
    return document
      .querySelector(
        'body > div.base > div.headerContents > div.breadCrumbBar > ul > li.current > a > p'
      )
      .textContent.match(/(.*)\[(.*)\]/)[2];
  else return 'AAA1234';
}

function saveToStorage(assignments) {
  for (const assignment of assignments) {
    let record = {};
    record[assignment.id] = assignment;
    chrome.storage.sync.set(record);
  }
}

async function loadFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      resolve(Object.values(data));
    });
  });
}

async function loadIDsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      let assignmentIDs = Object.values(data).map((a) => a['id']);
      resolve(assignmentIDs);
    });
  });
}
