let headers = [];
let workbookData = [];
let companies = [];
let departments = [];
let dates = [];

const departmentPersonLists = {
  "行政部": ["朱甦雅", "王斌斌", "杜永丽", "张巧花", "李雁程", "王晶玉"],
  "销售部": ["史正蓓", "陈炳森", "白金玉", "王莉莉", "刘倩倩", "周东升", "刘晓霞"],
  "医疗部": [
    "苏丹",
    "张改霞",
    "李雨婷",
    "赵改过",
    "张英玲",
    "胡立茹",
    "杨晓晖",
    "王烁楠",
    "朱丹",
    "胡秀娥",
    "韩万忠",
    "程芸",
    "张文慧",
    "王倩倩",
    "孙悦",
    "郑晓燕",
    "魏霞",
    "姚建强",
    "潘丽萍",
    "朱艳丽",
    "董凯丽",
    "张鹤延",
    "张丽娟",
    "邵倩",
    "王晓霞",
    "党江娟",
    "刘沛",
    "周娜",
    "姜媛媛",
    "苏巧燕",
    "杨文娟",
    "陈佳佳",
    "卢林博",
    "孔娟娟",
    "马艳萍",
    "王敏敏",
    "张彩荷",
    "朱文婷",
    "张园胜",
    "曹圆圆",
  ],
};

const leavePersons = ["朱英", "孙绿萍"];

// 试岗人员：从指定日期开始才纳入“应打卡”对比
const trialPeriodStatStartByPerson = {
  "王敏敏": "2026-04-08",
  "张彩荷": "2026-04-08",
};

// 离职后不再纳入“未打卡对比统计”的起始日期（从该日期开始不参与）
// 同时不在首页「全员名单」展示；名单数据保留，管理人员名单中灰色标注
const departNotIncludeAfterByPerson = {
  "陈佳佳": "2026-05-06",
  "卢林博": "2026-05-06",
  "张文慧": "2026-05-12",
};

// 返岗日前不参与统计（所选打卡日期早于该日则不作为应打卡人员对比）
const statIncludeFromDateByPerson = {
  "朱艳丽": "2026-11-06",
};

// 名单展示用备注（不影响 Excel 姓名匹配）
const personViewNoteSuffixByPerson = {};

// 首页悬浮提示：名单部门对应的组织/中心展示名（可与 Excel 里的「部门」文案区分）
const rosterTooltipOrgByListDepartment = {
  "行政部": "行政部门",
  "销售部": "销售部门",
  "医疗部": "医疗中心",
};

// 个人在「组织」行额外补充（如科室、客服部）
const rosterTooltipOrgExtraByPerson = {
  "张园胜": "影像科室",
  "曹圆圆": "护理部",
};

function parseStatDateForCompare(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }

  // Excel 序列号日期（兼容常见导出）
  if (typeof val === "number" && !isNaN(val)) {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const s = String(val).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));

  const cn = s.replace(/\s/g, "").match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (cn) return new Date(parseInt(cn[1], 10), parseInt(cn[2], 10) - 1, parseInt(cn[3], 10));

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function personViewNoteSuffix(personName) {
  return personViewNoteSuffixByPerson[personName] || "";
}

function isDepartedPerson(personName) {
  return Object.prototype.hasOwnProperty.call(departNotIncludeAfterByPerson, personName);
}

function filterActivePersonsForHomeRoster(persons) {
  return persons.filter((person) => !isDepartedPerson(person));
}

function shouldIncludeInAttendanceStat(personName, selectedDateStr) {
  const selected = parseStatDateForCompare(selectedDateStr);
  if (!selected) return true;

  const includeFromStr = statIncludeFromDateByPerson[personName];
  if (includeFromStr) {
    const includeFrom = parseStatDateForCompare(includeFromStr);
    if (includeFrom && selected.getTime() < includeFrom.getTime()) return false;
  }

  const startStr = trialPeriodStatStartByPerson[personName];
  if (startStr) {
    const start = parseStatDateForCompare(startStr);
    if (start && selected.getTime() < start.getTime()) return false;
  }

  const departAfterStr = departNotIncludeAfterByPerson[personName];
  if (departAfterStr) {
    const departAfter = parseStatDateForCompare(departAfterStr);
    if (departAfter && selected.getTime() >= departAfter.getTime()) return false;
  }

  return true;
}

const updateLogs = [
  "2026-05-26: 医疗部新增张园胜（影像科室）、曹圆圆（护理部）；移除客服部王凯迪、销售部王佳（已从名单删除）",
  "2026-05-25: 离职人员（含原销售部王佳）不在首页「全员名单」展示；名单保留、管理人员名单灰色标注、未打卡对比按离职日排除",
  "2026-05-12: 医疗部张文慧离职，名单保留，自 2026-05-12 起未打卡对比不再纳入统计",
  "2026-05-12: 销售部新增刘晓霞；医疗部新增王凯迪（客服）、朱文婷；行政部新增王晶玉；朱艳丽孕假，所选打卡日期早于 2026-11-06 时不纳入未打卡对比，返岗日起恢复",
  "2026-04-29: 销售部新增周东升；五一后陈佳佳、卢林博离职，自 2026-05-06 起不再纳入统计",
  "2026-04-07: 行政部新增李雁程",
  "2026-04-07: 医疗部新增王敏敏、张彩荷（试岗），自 2026-04-08 起纳入未打卡对比",
  "2026-04-07: 医疗部新增孔娟娟、马艳萍；行政部移除曹娟；隐藏请假人员朱英、孙绿萍",
  "2026-03-12: 医疗部移除刘丹，确认添加陈佳佳和卢林博",
  "2026-03-10: 销售部移除董博，医疗部添加陈佳佳、卢林博",
];

function getAllPersons() {
  let allPersons = [];
  Object.values(departmentPersonLists).forEach((persons) => {
    allPersons = [...allPersons, ...persons];
  });
  return allPersons;
}

function getPersonDepartment(personName) {
  for (const [department, persons] of Object.entries(departmentPersonLists)) {
    if (persons.includes(personName)) {
      return department;
    }
  }
  return "医疗部";
}

function rosterOrganizationLine(listDepartment, personName) {
  const base = rosterTooltipOrgByListDepartment[listDepartment] || listDepartment;
  const extra = rosterTooltipOrgExtraByPerson[personName];
  return extra ? `${base} · ${extra}` : base;
}

function buildPersonRosterTooltipText(personName) {
  const dept = getPersonDepartment(personName);
  const lines = [];
  lines.push(`姓名：${personName}`);
  lines.push(`名单部门：${dept}`);
  lines.push(`组织：${rosterOrganizationLine(dept, personName)}`);
  const suffix = personViewNoteSuffix(personName);
  if (suffix && suffix.includes("客服")) {
    lines.push("岗位：客服人员");
  } else if (suffix) {
    lines.push(`备注：${suffix.replace(/[()（）]/g, "").trim()}`);
  }

  if (leavePersons.includes(personName)) {
    lines.push("未打卡对比：请假期间已排除");
  }
  if (statIncludeFromDateByPerson[personName]) {
    lines.push(`未打卡对比：孕假，${statIncludeFromDateByPerson[personName]} 起纳入应到名单`);
  }
  if (departNotIncludeAfterByPerson[personName]) {
    lines.push(`未打卡对比：${departNotIncludeAfterByPerson[personName]} 起离职不参与`);
  }
  if (trialPeriodStatStartByPerson[personName]) {
    lines.push(`未打卡对比：试岗，${trialPeriodStatStartByPerson[personName]} 起纳入`);
  }
  return lines.join("\n");
}

function homeRosterDepartmentClass(department) {
  if (department === "行政部") return "admin";
  if (department === "销售部") return "sales";
  if (department === "医疗部") return "medical";
  return "medical";
}

function disposeHomeRosterTooltips() {
  const root = document.getElementById("homePersonRoster");
  if (!root) return;
  root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  });
}

function initHomeRosterTooltips() {
  const root = document.getElementById("homePersonRoster");
  if (!root || typeof bootstrap === "undefined" || !bootstrap.Tooltip) return;
  root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    new bootstrap.Tooltip(el, {
      customClass: "tooltip-home-roster",
      trigger: "hover focus",
      container: "body",
    });
  });
}

function renderHomePersonRoster() {
  const root = document.getElementById("homePersonRoster");
  if (!root) return;

  disposeHomeRosterTooltips();
  root.innerHTML = "";

  const deptOrder = ["行政部", "销售部", "医疗部"];
  deptOrder.forEach((department) => {
    const persons = filterActivePersonsForHomeRoster(departmentPersonLists[department] || []);
    if (persons.length === 0) return;

    const group = document.createElement("div");
    group.className = "home-roster-group";

    const title = document.createElement("div");
    title.className = "home-roster-group-title";
    title.textContent = `${department}（${persons.length} 人）`;
    group.appendChild(title);

    const chips = document.createElement("div");
    chips.className = "home-roster-chips";

    const deptClass = homeRosterDepartmentClass(department);
    persons.forEach((person) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `home-roster-chip ${deptClass}`;
      chip.textContent = person;
      chip.setAttribute("data-bs-toggle", "tooltip");
      chip.setAttribute("data-bs-placement", "top");
      chip.setAttribute("title", buildPersonRosterTooltipText(person));
      chips.appendChild(chip);
    });

    group.appendChild(chips);
    root.appendChild(group);
  });

  initHomeRosterTooltips();
}

function addPerson(name) {
  if (!name || name.trim() === "") {
    alert('请输入人员姓名,格式为"张三+销售部",例如"张三+销售部",果没有按严格的格式添加');
    return;
  }

  const trimmedName = name.trim();
  const match = trimmedName.match(/^(.*?)\s*\+\s*(行政部|销售部|医疗部)$/);
  let personName, department;

  if (match) {
    personName = match[1].trim();
    department = match[2];
  } else {
    personName = trimmedName;
    department = "医疗部";
  }

  const allPersons = getAllPersons();
  if (!allPersons.includes(personName)) {
    if (!departmentPersonLists[department]) {
      departmentPersonLists[department] = [];
    }
    departmentPersonLists[department].push(personName);
    alert(`人员添加成功，已添加到${department}`);
  } else {
    alert("该人员已存在");
  }
}

function removePerson(name) {
  if (!name || name.trim() === "") {
    alert("请输入人员姓名");
    return;
  }
  name = name.trim();

  let found = false;
  for (const [, persons] of Object.entries(departmentPersonLists)) {
    const index = persons.indexOf(name);
    if (index !== -1) {
      persons.splice(index, 1);
      found = true;
      break;
    }
  }

  if (found) {
    alert("人员删除成功");
  } else {
    alert("该人员不存在");
  }
}

function updatePerson(oldName, newName) {
  if (!oldName || oldName.trim() === "" || !newName || newName.trim() === "") {
    alert("请输入旧姓名和新姓名");
    return;
  }
  oldName = oldName.trim();
  newName = newName.trim();

  let found = false;
  for (const [, persons] of Object.entries(departmentPersonLists)) {
    const index = persons.indexOf(oldName);
    if (index !== -1) {
      persons[index] = newName;
      found = true;
      break;
    }
  }

  if (found) {
    alert("人员更新成功");
  } else {
    alert("旧姓名不存在");
  }
}

function getPersonList() {
  return getAllPersons();
}

document.getElementById("uploadBtn").addEventListener("click", function () {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) {
    alert("请先选择Excel文件");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array", WTF: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      alert("Excel文件中没有数据");
      return;
    }

    headers = jsonData[0];
    workbookData = jsonData.slice(1);
    extractCompaniesDepartmentsAndDates();
    populateFilters();
    document.getElementById("filterSection").style.display = "block";
  };
  reader.readAsArrayBuffer(file);
});

function extractCompaniesDepartmentsAndDates() {
  const companyIndex = headers.indexOf("您所在的公司：");
  const departmentIndex = headers.indexOf("您所在的部门：");
  const dateIndex = headers.indexOf("请选择打卡日期：（默认当前日期不可跨越选择）");

  companies = [
    ...new Set(workbookData.map((row) => (companyIndex < row.length ? row[companyIndex] : "")).filter(Boolean)),
  ];
  departments = [
    ...new Set(
      workbookData.map((row) => (departmentIndex < row.length ? row[departmentIndex] : "")).filter(Boolean),
    ),
  ];
  dates = [
    ...new Set(workbookData.map((row) => (dateIndex < row.length ? row[dateIndex] : "")).filter(Boolean)),
  ];
}

function populateFilters() {
  const companyIndex = headers.indexOf("您所在的公司：");
  const departmentIndex = headers.indexOf("您所在的部门：");
  const dateIndex = headers.indexOf("请选择打卡日期：（默认当前日期不可跨越选择）");

  const uniqueCompanies = [
    ...new Set(workbookData.map((row) => (companyIndex < row.length ? row[companyIndex] : "")).filter(Boolean)),
  ];
  const uniqueDepartments = [
    ...new Set(
      workbookData.map((row) => (departmentIndex < row.length ? row[departmentIndex] : "")).filter(Boolean),
    ),
  ];
  const uniqueDates = [
    ...new Set(workbookData.map((row) => (dateIndex < row.length ? row[dateIndex] : "")).filter(Boolean)),
  ];

  const companyFilter = document.getElementById("companyFilter");
  companyFilter.innerHTML = '<option value="">全部</option>';
  uniqueCompanies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company;
    option.textContent = company;
    if (company.includes("定西")) option.selected = true;
    companyFilter.appendChild(option);
  });

  const departmentFilter = document.getElementById("departmentFilter");
  departmentFilter.innerHTML = '<option value="">全部</option>';
  uniqueDepartments.forEach((department) => {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentFilter.appendChild(option);
  });

  const dateFilter = document.getElementById("dateFilter");
  dateFilter.innerHTML = '<option value="">全部</option>';
  let todaySelected = false;
  uniqueDates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    if (isToday(date)) {
      option.selected = true;
      todaySelected = true;
    }
    dateFilter.appendChild(option);
  });

  if (!todaySelected && uniqueDates.length > 0) {
    dateFilter.options[1].selected = true;
  }
}

function isToday(dateString) {
  const today = new Date();
  const date = new Date(dateString);
  return date.toDateString() === today.toDateString();
}

function getFilteredData() {
  const companyFilter = document.getElementById("companyFilter").value;
  const departmentFilter = document.getElementById("departmentFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  const companyIndex = headers.indexOf("您所在的公司：");
  const departmentIndex = headers.indexOf("您所在的部门：");
  const dateIndex = headers.indexOf("请选择打卡日期：（默认当前日期不可跨越选择）");

  return workbookData.filter((row) => {
    const companyMatch = !companyFilter || (companyIndex < row.length && row[companyIndex] === companyFilter);
    const departmentMatch =
      !departmentFilter || (departmentIndex < row.length && row[departmentIndex] === departmentFilter);
    const dateMatch = !dateFilter || (dateIndex < row.length && row[dateIndex] === dateFilter);
    return companyMatch && departmentMatch && dateMatch;
  });
}

function comparePersonLists() {
  const companyFilter = document.getElementById("companyFilter").value;
  const departmentFilter = document.getElementById("departmentFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  if (!companyFilter || !dateFilter) {
    alert("请选择公司和日期进行对比");
    return;
  }

  const filteredData = getFilteredData();
  const excelPersonList = [];
  const nameIndex = headers.findIndex((header) => header.includes("姓名") || header.includes("名字") || header.includes("人员"));
  if (nameIndex === -1) {
    alert("无法在Excel文件中找到姓名列");
    return;
  }

  filteredData.forEach((row) => {
    if (nameIndex < row.length && row[nameIndex] !== "" && row[nameIndex] !== null) {
      excelPersonList.push(String(row[nameIndex]).trim());
    }
  });

  let targetPersonList = [];
  if (departmentFilter) {
    if (departmentPersonLists[departmentFilter]) {
      targetPersonList = departmentPersonLists[departmentFilter];
    } else {
      alert("所选部门暂无人员名单");
      return;
    }
  } else {
    targetPersonList = getAllPersons();
  }

  targetPersonList = targetPersonList.filter((person) => shouldIncludeInAttendanceStat(person, dateFilter));
  const missingPersons = targetPersonList.filter((person) => !excelPersonList.includes(person) && !leavePersons.includes(person));
  displayComparisonResult(missingPersons);
}

function displayComparisonResult(missingPersons) {
  const comparisonSection = document.getElementById("comparisonSection");
  const missingPersonsList = document.getElementById("missingPersonsList");
  const missingCountEl = document.getElementById("missingCount");
  const resultTitleEl = document.getElementById("resultTitle");

  const selectedDate = document.getElementById("dateFilter").value;
  resultTitleEl.textContent = selectedDate ? `${selectedDate} 未打卡人员名单` : "未打卡人员名单";

  comparisonSection.style.display = "block";
  missingCountEl.textContent = missingPersons.length;

  const groupedPersons = { "行政部": [], "销售部": [], "医疗部": [] };
  missingPersons.forEach((person) => {
    const department = getPersonDepartment(person);
    groupedPersons[department].push(person);
  });

  if (missingPersons.length > 0) {
    let listHTML = "";
    Object.entries(groupedPersons).forEach(([department, persons]) => {
      if (persons.length > 0) {
        let departmentClass = "";
        switch (department) {
          case "行政部":
            departmentClass = "admin";
            break;
          case "销售部":
            departmentClass = "sales";
            break;
          case "医疗部":
            departmentClass = "medical";
            break;
        }

        listHTML += `<div class="department-group"><h7>${department} (${persons.length}人)</h7><div class="department-persons">`;
        persons.forEach((person) => {
          listHTML += `<span class="person-item ${departmentClass}">${person}</span>`;
        });
        listHTML += `</div></div>`;
      }
    });
    missingPersonsList.innerHTML = listHTML;
  } else {
    missingPersonsList.innerHTML = '<div class="no-persons">所有人员均已打卡</div>';
  }
}

function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tab = this.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      tabPanes.forEach((pane) => {
        pane.classList.remove("active");
        if (pane.id === tab + "-tab") {
          pane.classList.add("active");
        }
      });

      if (tab === "view") {
        renderPersonList();
      }
    });
  });
}

function renderPersonList() {
  const personListView = document.getElementById("personListView");
  const personCount = document.getElementById("personCount");
  if (!personListView || !personCount) return;

  personListView.innerHTML = "";
  const allPersons = getAllPersons();
  personCount.textContent = allPersons.length;

  for (const [department, persons] of Object.entries(departmentPersonLists)) {
    if (persons.length === 0) continue;

    const deptDiv = document.createElement("div");
    deptDiv.style.marginBottom = "15px";

    const deptTitle = document.createElement("h6");
    deptTitle.style.marginBottom = "8px";
    deptTitle.style.color = "#3b82f6";
    deptTitle.textContent = `${department} (${persons.length}人)`;
    deptDiv.appendChild(deptTitle);

    const ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    ul.style.padding = "0";
    ul.style.display = "grid";
    ul.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
    ul.style.gap = "8px";

    persons.forEach((person, index) => {
      const li = document.createElement("li");
      li.style.padding = "5px 10px";
      li.style.borderRadius = "4px";
      li.style.fontSize = "13px";
      li.style.textAlign = "center";

      if (leavePersons.includes(person)) {
        li.style.backgroundColor = "#fef3c7";
        li.style.color = "#92400e";
        li.style.textDecoration = "line-through";
        li.textContent = `${index + 1}. ${person}${personViewNoteSuffix(person)} (请假)`;
      } else if (statIncludeFromDateByPerson[person]) {
        const resumeOn = statIncludeFromDateByPerson[person];
        li.style.backgroundColor = "#fce7f3";
        li.style.color = "#9d174d";
        li.style.textDecoration = "none";
        li.textContent = `${index + 1}. ${person}${personViewNoteSuffix(person)}（孕假，${resumeOn} 起纳入对比）`;
      } else if (departNotIncludeAfterByPerson[person]) {
        const departAfter = departNotIncludeAfterByPerson[person];
        // “离职后不参与统计”是按日期生效，这里仅做标注，不做删除/删除线避免误解
        li.style.backgroundColor = "#f3f4f6";
        li.style.color = "#4b5563";
        li.style.textDecoration = "none";
        li.textContent = `${index + 1}. ${person}${personViewNoteSuffix(person)}（离职，${departAfter} 起不参与统计）`;
      } else {
        li.style.backgroundColor = "#e0f2fe";
        const trialStart = trialPeriodStatStartByPerson[person];
        const suffix = personViewNoteSuffix(person);
        li.textContent = trialStart
          ? `${index + 1}. ${person}${suffix}（试岗，${trialStart} 起纳入对比）`
          : `${index + 1}. ${person}${suffix}`;
      }
      ul.appendChild(li);
    });

    deptDiv.appendChild(ul);
    personListView.appendChild(deptDiv);
  }

  if (leavePersons.length > 0) {
    const leaveDiv = document.createElement("div");
    leaveDiv.style.marginBottom = "15px";
    leaveDiv.style.padding = "10px";
    leaveDiv.style.backgroundColor = "#fef3c7";
    leaveDiv.style.borderRadius = "4px";

    const leaveTitle = document.createElement("h6");
    leaveTitle.style.marginBottom = "8px";
    leaveTitle.style.color = "#92400e";
    leaveTitle.textContent = "请假人员（暂不参与统计）：";
    leaveDiv.appendChild(leaveTitle);

    const leaveList = document.createElement("p");
    leaveList.style.margin = "0";
    leaveList.style.color = "#92400e";
    leaveList.textContent = leavePersons.join("、");
    leaveDiv.appendChild(leaveList);

    personListView.insertBefore(leaveDiv, personListView.firstChild);
  }

  const logsDiv = document.createElement("div");
  logsDiv.style.marginTop = "20px";
  logsDiv.style.padding = "10px";
  logsDiv.style.backgroundColor = "#f3f4f6";
  logsDiv.style.borderRadius = "4px";

  const logsTitle = document.createElement("h6");
  logsTitle.style.marginBottom = "8px";
  logsTitle.style.color = "#4b5563";
  logsTitle.textContent = "更新日志：";
  logsDiv.appendChild(logsTitle);

  const logsUl = document.createElement("ul");
  logsUl.style.listStyleType = "disc";
  logsUl.style.paddingLeft = "20px";
  logsUl.style.margin = "0";
  logsUl.style.fontSize = "12px";
  logsUl.style.color = "#6b7280";

  updateLogs.forEach((log) => {
    const li = document.createElement("li");
    li.textContent = log;
    logsUl.appendChild(li);
  });

  logsDiv.appendChild(logsUl);
  personListView.appendChild(logsDiv);
}

window.addEventListener("DOMContentLoaded", function () {
  renderHomePersonRoster();

  const compareBtn = document.getElementById("compareBtn");
  if (compareBtn) compareBtn.addEventListener("click", comparePersonLists);

  const managePersonsBtn = document.getElementById("managePersonsBtn");
  if (managePersonsBtn) {
    managePersonsBtn.addEventListener("click", function () {
      const personManagementSection = document.getElementById("personManagementSection");
      personManagementSection.style.display = "block";
      renderPersonList();
    });
  }

  initTabs();

  const addPersonBtn = document.getElementById("addPersonBtn");
  if (addPersonBtn) {
    addPersonBtn.addEventListener("click", function () {
      const addName = document.getElementById("addName").value;
      addPerson(addName);
      document.getElementById("addName").value = "";
      renderPersonList();
      renderHomePersonRoster();
    });
  }

  const removePersonBtn = document.getElementById("removePersonBtn");
  if (removePersonBtn) {
    removePersonBtn.addEventListener("click", function () {
      const removeName = document.getElementById("removeName").value;
      removePerson(removeName);
      document.getElementById("removeName").value = "";
      renderPersonList();
      renderHomePersonRoster();
    });
  }

  const updatePersonBtn = document.getElementById("updatePersonBtn");
  if (updatePersonBtn) {
    updatePersonBtn.addEventListener("click", function () {
      const oldName = document.getElementById("oldName").value;
      const newName = document.getElementById("newName").value;
      updatePerson(oldName, newName);
      document.getElementById("oldName").value = "";
      document.getElementById("newName").value = "";
      renderPersonList();
      renderHomePersonRoster();
    });
  }

  const exportToPngBtn = document.getElementById("exportToPngBtn");
  if (exportToPngBtn) {
    exportToPngBtn.addEventListener("click", function () {
      const comparisonSection = document.getElementById("comparisonSection");
      if (comparisonSection.style.display === "block") {
        const cloneSection = comparisonSection.cloneNode(true);
        const cloneExportButtons = cloneSection.querySelector(".export-buttons");
        if (cloneExportButtons) cloneExportButtons.style.display = "none";

        cloneSection.style.position = "absolute";
        cloneSection.style.left = "-9999px";
        cloneSection.style.top = "-9999px";
        document.body.appendChild(cloneSection);

        html2canvas(cloneSection, { scale: 2, useCORS: true, logging: false })
          .then((canvas) => {
            document.body.removeChild(cloneSection);
            const link = document.createElement("a");
            link.download = `未打卡人员名单_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
          })
          .catch((error) => {
            if (cloneSection && cloneSection.parentNode) document.body.removeChild(cloneSection);
            console.error("导出图片失败:", error);
            alert("导出图片失败，请重试");
          });
      } else {
        alert("请先进行人员对比，生成结果后再导出");
      }
    });
  }

  const exportToExcelBtn = document.getElementById("exportToExcelBtn");
  if (exportToExcelBtn) {
    exportToExcelBtn.addEventListener("click", function () {
      const comparisonSection = document.getElementById("comparisonSection");
      if (comparisonSection.style.display === "block") {
        const selectedDate = document.getElementById("dateFilter").value;
        const missingPersonsList = document.getElementById("missingPersonsList");
        const missingPersons = [];
        const listItems = missingPersonsList.querySelectorAll("li");
        listItems.forEach((item) => {
          missingPersons.push(item.textContent.trim());
        });

        const data = [];
        data.push(["日期", selectedDate || ""]);
        data.push(["未打卡人数", missingPersons.length]);
        data.push([]);
        data.push(["未打卡人员名单"]);
        missingPersons.forEach((person) => data.push([person]));

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "未打卡人员");
        XLSX.writeFile(wb, `未打卡人员名单_${selectedDate || new Date().toISOString().slice(0, 10)}.xlsx`);
      } else {
        alert("请先进行人员对比，生成结果后再导出");
      }
    });
  }
});