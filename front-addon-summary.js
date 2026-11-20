'use strict';

const CLINICAL_HINTS = [
  '彩超', '甲功', 'HPV', 'TCT', '核磁', 'CT', '抗原', 'PSA', '白带', '心电图',
  '胃肠', '甲状腺', '颈动脉', '动脉硬化', '幽门', '分型', '血脂', '血糖', '肾功', '肝功',
  '激素', '风湿', '同型', '心肌', '液基', '妇科', '阴超', '抽血', '胃功', '心脏',
  '腰椎', '颈椎', '前列腺', '糖链', 'CA125', 'CA153', 'CA19', '癌胚', '骨密度',
  '无痛', '碳13', '碳14', 'C13', 'C14', '血常规', '尿常规', '便常规', '肝肾',
  '糖化', '胰岛素', '性激素', '维生素', '微量', '过敏', '钼靶', '宫颈', '分泌物',
  '支原体', '衣原体', '胸部', '血流', '转氨酶', '肌酐', '尿素', '尿酸', 'HCY',
  '定量', '酶谱', '半胱', '胃蛋白酶', '呼吸', '肺功能', '眼底', '人体成分',
  '总检', '淀粉酶', '离子', '免疫', '腋窝', '阴式', '淋巴结', '血型', '报告费',
  '工本', '隐血', '胶囊', '肺癌'
];

const STABLE_PRICES = [
  [/碳14|C14/, 60],
  [/阴式彩超|阴超/, 25],
  [/血型/, 8],
  [/血淀粉酶/, 7],
  [/粪便常规|大便常规|便常规/, 10],
  [/甲功五项/, 139],
  [/甲状腺彩超/, 80],
  [/颈动脉/, 100],
  [/幽门螺杆菌抗体/, 51],
  [/游离前列腺|F-PSA/, 60],
  [/总前列腺|TPSA/, 60],
  [/糖类抗原153|CA153/, 60],
  [/糖类抗原125|CA125/, 60],
  [/HPV23/, 288]
];

const state = {
  checkoutRows: [],
  dates: [],
  selectedDate: '',
  includeHealthCert: true,
  existingAddon: null,
  existingAddonName: '',
  existingQianai: null,
  existingQianaiName: '',
  doctorByItem: new Map(),
  preview: null
};

function $(id) {
  return document.getElementById(id);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateKey(year, month, day) {
  if (!year || !month || !day) return '';
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizeDateKey(value) {
  if (value === undefined || value === null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number' && value > 20000 && value < 80000 && window.XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return formatDateKey(parsed.y, parsed.m, parsed.d);
  }
  const text = String(value).trim();
  const match = text.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (match) return formatDateKey(match[1], match[2], match[3]);
  return '';
}

function checkoutDateKey(row) {
  return normalizeDateKey(row['操作时间']);
}

function formatClock(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${formatDateKey(value.getFullYear(), value.getMonth() + 1, value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
  }
  const text = String(value || '').trim();
  const match = text.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  return match ? match[1] : text;
}

function sheetNameForDate(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}.${day}`;
}

function displayDate(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}月${day}日`;
}

function qianaiDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${year}.${month}.${day}`;
}

function money(value) {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
}

function isPackageToken(name) {
  const text = String(name || '');
  if (!text) return true;
  if (/加项包|专项体检|健康证|电力外检|电力退休|普惠基础|营养小屋/.test(text)) return true;
  if (/套餐/.test(text)) return true;
  if (/职工体检方案|胶囊胃镜/.test(text)) return true;
  if (/^\d{2}.+-/.test(text)) return true;
  return false;
}

function isClinicalItem(name) {
  const text = String(name || '');
  if (!text || isPackageToken(text) || /胶片/.test(text)) return false;
  return CLINICAL_HINTS.some((hint) => text.includes(hint));
}

function isHealthCert(items, type) {
  return items.some((item) => item.includes('健康证')) || type === '健康证';
}

function isPackagePriced(items, amount) {
  const blob = items.join(' ');
  if (!items.some(isPackageToken)) return false;
  if (/健康证/.test(blob) && amount <= 80) return true;
  if (amount >= 399 && /套餐|普惠基础|电力外检|职工体检方案|加项包/.test(blob)) return true;
  return false;
}

function shouldKeepAsAddon(items, amount) {
  const clinical = items.filter(isClinicalItem);
  const packageCount = items.filter(isPackageToken).length;
  if (!clinical.length || !(amount > 0)) return false;
  if (isPackagePriced(items, amount)) return false;
  if (packageCount) {
    if (clinical.length >= 3) return false;
    return amount < 500;
  }
  if (clinical.length >= 4 && amount >= 400) return false;
  return true;
}

function splitChargeItems(charge) {
  return String(charge || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function knownPrice(name) {
  const hit = STABLE_PRICES.find(([pattern]) => pattern.test(name));
  return hit ? hit[1] : 0;
}

function allocateAmounts(clinical, amount) {
  const total = money(amount);
  if (clinical.length === 1) return [total];
  const assigned = clinical.map(() => 0);
  let remain = total;
  const order = clinical
    .map((name, index) => ({ index, price: knownPrice(name) }))
    .filter((item) => item.price > 0)
    .sort((a, b) => b.price - a.price);
  order.forEach((item) => {
    if (item.price <= remain + 0.001) {
      assigned[item.index] = item.price;
      remain = money(remain - item.price);
    }
  });
  const open = clinical.map((_, index) => index).filter((index) => assigned[index] === 0);
  if (open.length && remain > 0) {
    const share = money(remain / open.length);
    open.forEach((index, pos) => {
      assigned[index] = pos === open.length - 1 ? money(remain - share * (open.length - 1)) : share;
    });
    remain = 0;
  }
  if (remain && !open.length) {
    assigned[clinical.length - 1] = money(assigned[clinical.length - 1] + remain);
  }
  return assigned;
}

function findHeaderIndex(rows) {
  const limit = Math.min(rows.length, 8);
  for (let index = 0; index < limit; index += 1) {
    const row = rows[index] || [];
    const text = row.map((cell) => String(cell || '')).join(' ');
    if (text.includes('体检人') && text.includes('收费项目')) return index;
  }
  for (let index = 0; index < limit; index += 1) {
    const filled = (rows[index] || []).filter((cell) => cell && String(cell).trim());
    if (filled.length >= 8) return index;
  }
  return -1;
}

function rowsToRecords(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((cell) => String(cell || '').trim());
  const records = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const record = {};
    headers.forEach((name, col) => {
      if (name) record[name] = row[col];
    });
    if (record['体检人'] || record['收费项目']) records.push(record);
  }
  return records;
}

function netCheckoutRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${checkoutDateKey(row)}|${row['预约单号'] || ''}|${row['收费项目'] || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  const output = [];
  groups.forEach((group) => {
    const amounts = group.map((row) => money(row['结账总金额']));
    const hasNeg = amounts.some((value) => value < 0);
    const hasPos = amounts.some((value) => value > 0);
    if (hasNeg && hasPos) {
      const net = money(amounts.reduce((sum, value) => sum + value, 0));
      if (net > 0) {
        const template = group.find((row) => money(row['结账总金额']) > 0) || group[0];
        output.push({ ...template, 结账总金额: net });
      }
      return;
    }
    group.forEach((row) => {
      if (money(row['结账总金额']) > 0) output.push(row);
    });
  });
  return output;
}

function personNameLike(value) {
  const text = String(value || '').trim();
  return /^[\u4e00-\u9fa5]{2,4}$/.test(text);
}

function salesmanOf(row) {
  const manager = String(row['业务经理'] || '').trim();
  if (personNameLike(manager)) return manager;
  const remark = String(row['前台备注'] || '').trim() || String(row['名单备注'] || '').trim();
  if (personNameLike(remark)) return remark;
  const advisor = String(row['健康顾问'] || '').trim();
  if (personNameLike(advisor) && advisor !== '杜永丽') return advisor;
  const cashier = String(row['结账人'] || '').trim();
  return personNameLike(cashier) ? cashier : (manager || advisor || cashier);
}

function doctorNameOnly(value) {
  return String(value || '').trim().replace(/-\d{8,}$/, '');
}

function rememberDoctor(item, doctor) {
  const key = String(item || '').trim();
  const name = doctorNameOnly(doctor);
  if (!key || !personNameLike(name)) return;
  if (!state.doctorByItem.has(key)) state.doctorByItem.set(key, new Map());
  const counts = state.doctorByItem.get(key);
  counts.set(name, (counts.get(name) || 0) + 1);
}

function lookupDoctor(item) {
  const text = String(item || '').trim();
  if (!text || !state.doctorByItem.size) return '';
  const exact = state.doctorByItem.get(text);
  const pool = exact || [...state.doctorByItem.entries()]
    .filter(([key]) => text.includes(key) || key.includes(text))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];
  if (!pool || !pool.size) return '';
  return [...pool.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function parseDoctorMapFromXlsx(workbook) {
  state.doctorByItem = new Map();
  workbook.SheetNames.forEach((name) => {
    if (!/^\d+\.\d+$/.test(name)) return;
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '' });
    let headerIndex = -1;
    let itemCol = 6;
    let doctorCol = 7;
    const limit = Math.min(rows.length, 5);
    for (let index = 0; index < limit; index += 1) {
      const row = rows[index].map((cell) => String(cell || ''));
      const itemAt = row.findIndex((cell) => cell.includes('所加项目'));
      const doctorAt = row.findIndex((cell) => cell.includes('加项医生'));
      if (itemAt >= 0 && doctorAt >= 0) {
        headerIndex = index;
        itemCol = itemAt;
        doctorCol = doctorAt;
        break;
      }
    }
    if (headerIndex < 0) return;
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const label = String(rows[index][0] || '');
      if (label.includes('合计') || label.includes('累计')) break;
      rememberDoctor(rows[index][itemCol], rows[index][doctorCol]);
    }
  });
}

function parseDoctorMapFromExceljs(workbook) {
  dateSheetList(workbook).forEach((sheet) => {
    const stop = findRowByLabel(sheet, '合计') || sheet.rowCount;
    for (let row = 3; row < stop; row += 1) {
      rememberDoctor(sheet.getRow(row).getCell(7).value, sheet.getRow(row).getCell(8).value);
    }
  });
}

function addonDoctorOf(row, item) {
  const mapped = lookupDoctor(item);
  if (mapped) return mapped;
  if (/报告费|总检|工本|血型/.test(item) || String(row['体检人'] || '') === '报告费') {
    return doctorNameOnly(row['结账人']);
  }
  return '';
}

function packageFullName(items, charge) {
  const packs = items.filter((item) => /套餐|健康证|普惠基础|胶囊胃镜/.test(item) || (isPackageToken(item) && !/加项包/.test(item)));
  if (packs.length) return packs[0];
  return items.find((item) => !/加项包/.test(item)) || String(charge || '');
}

function isQianaiRow(row) {
  const blob = `${row['所属单位'] || ''} ${row['订单名称'] || ''} ${row['收费项目'] || ''}`;
  return /千爱/.test(blob);
}

function isCancelled(row) {
  return String(row['状态'] || '').includes('取消');
}

function isNoiseRow(row) {
  const person = String(row['体检人'] || '');
  if (/测试/.test(person)) return true;
  if (person === '报告费') {
    const items = splitChargeItems(row['收费项目']);
    const clinical = items.filter((item) => isClinicalItem(item) || /总检|报告费|工本/.test(item));
    return clinical.length === 0;
  }
  return false;
}

function isReportFeeRow(row, items) {
  const person = String(row['体检人'] || '');
  return person === '报告费' || items.some((item) => /总检|报告费|工本费/.test(item));
}

function visitKey(row, packageName) {
  return `${row['预约单号'] || row['订单号'] || ''}|${row['体检人'] || ''}|${packageName}`;
}

function buildPreview(rows, dateKey, includeHealthCert) {
  const sameDay = rows.filter((row) => checkoutDateKey(row) === dateKey);
  const dayRows = netCheckoutRows(sameDay.filter((row) => !isCancelled(row) && !isNoiseRow(row)));

  const addon = [];
  const qianai = [];
  const issues = [];
  const visitSeen = new Set();

  dayRows.forEach((row) => {
    const items = splitChargeItems(row['收费项目']);
    const amount = money(row['结账总金额']);
    const clinical = items.filter(isClinicalItem);
    const type = String(row['体检类型'] || '');
    const outdoorFlag = type === '外检';
    const qianaiFlag = isQianaiRow(row);
    const healthCert = isHealthCert(items, type);
    const person = String(row['体检人'] || '');
    const unit = String(row['所属单位'] || '');
    const id = String(row['交易批次号'] || row['预约单号'] || '');
    const datetime = formatClock(row['操作时间'] || row['登记时间']);

    const takeVisit = (qianaiFlag || (includeHealthCert && healthCert))
      && (healthCert || isPackagePriced(items, amount) || (items.some(isPackageToken) && !clinical.length));
    if (takeVisit && amount > 0) {
      const packageName = packageFullName(items, row['收费项目']);
      const key = visitKey(row, packageName);
      if (!visitSeen.has(key)) {
        visitSeen.add(key);
        qianai.push({
          date: dateKey,
          name: person,
          orderNo: String(row['订单号'] || ''),
          qty: 1,
          packageName,
          amount,
          salesman: salesmanOf(row),
          note: healthCert ? '健康证' : (outdoorFlag ? '外检' : '')
        });
      }
    }

    if (isReportFeeRow(row, items) && amount > 0 && !items.some(isPackageToken)) {
      const itemName = items.find((item) => /总检|报告费|工本/.test(item)) || items[0] || '报告费';
      addon.push({
        name: person || '报告费',
        gender: row['性别'] || '女',
        unit,
        id,
        datetime,
        item: itemName,
        doctor: addonDoctorOf(row, itemName),
        operator: row['结账人'] || '',
        amount,
        type: outdoorFlag ? '外检' : '院内',
        qianai: qianaiFlag
      });
      return;
    }

    if (
      items.some((item) => /自选/.test(item))
      && clinical.length
      && clinical.every((item) => /心电图/.test(item))
      && amount < 50
    ) {
      return;
    }

    if (!shouldKeepAsAddon(items, amount) || !clinical.length) return;

    const shares = allocateAmounts(clinical, amount);
    clinical.forEach((item, index) => {
      addon.push({
        name: person,
        gender: row['性别'] || '',
        unit,
        id,
        datetime,
        item,
        doctor: addonDoctorOf(row, item),
        operator: row['结账人'] || '',
        amount: shares[index],
        type: outdoorFlag ? '外检' : '院内',
        qianai: qianaiFlag
      });
    });

    if (items.some(isPackageToken)) {
      issues.push({
        kind: '套餐夹带加项',
        name: person,
        amount,
        detail: '结账行里套餐和加项写在一起，已按金额拆进加项汇总。若检中没挂这一条，上报前删掉。'
      });
    }
    if (!addonDoctorOf(row, clinical[0] || '')) {
      issues.push({
        kind: '加项医生待补',
        name: person,
        amount,
        detail: '结账表没有 HIS 加项医生。血型/总检/报告费已用结账人；其余留空，可对照检中后补。'
      });
    }
  });

  addon.sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)) || String(a.name).localeCompare(String(b.name)));
  qianai.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'));

  const inhouse = addon.filter((row) => row.type !== '外检');
  const outdoor = addon.filter((row) => row.type === '外检');
  const qianaiAddons = addon.filter((row) => row.qianai);
  const offlineInhouse = money(inhouse.filter((row) => !row.qianai).reduce((sum, row) => sum + row.amount, 0));
  const offlineOutdoor = money(outdoor.filter((row) => !row.qianai).reduce((sum, row) => sum + row.amount, 0));
  const inhouseTotal = money(inhouse.reduce((sum, row) => sum + row.amount, 0));
  const outdoorTotal = money(outdoor.reduce((sum, row) => sum + row.amount, 0));
  const addonTotal = money(addon.reduce((sum, row) => sum + row.amount, 0));
  const qianaiAddonTotal = money(qianaiAddons.reduce((sum, row) => sum + row.amount, 0));
  const qianaiVisitTotal = money(qianai.reduce((sum, row) => sum + row.amount, 0));

  return {
    dateKey,
    checkoutCount: sameDay.length,
    addon,
    inhouse,
    outdoor,
    qianai,
    qianaiAddons,
    inhouseTotal,
    outdoorTotal,
    addonTotal,
    qianaiAddonTotal,
    qianaiVisitTotal,
    offlineInhouse,
    offlineOutdoor,
    offlineTotal: money(offlineInhouse + offlineOutdoor),
    todayTotal: money(qianaiAddonTotal + offlineInhouse + offlineOutdoor),
    issues
  };
}

function setFilename(id, file) {
  $(id).textContent = file ? `已选：${file.name}` : '尚未选择文件';
}

function setStatus(message, ok) {
  const node = $('statusMessage');
  node.textContent = message || '';
  node.className = ok ? 'front-addon-ok' : 'front-addon-error';
}

function renderDateOptions(dates) {
  const select = $('dateSelect');
  select.innerHTML = '';
  dates.forEach((dateKey) => {
    const option = document.createElement('option');
    option.value = dateKey;
    option.textContent = displayDate(dateKey);
    select.append(option);
  });
  if (dates.length) {
    select.value = dates[dates.length - 1];
    state.selectedDate = select.value;
  }
}

function renderTable(targetId, rows, columns) {
  const wrap = $(targetId);
  if (!rows.length) {
    wrap.innerHTML = '<p class="front-addon-empty">这一天没有匹配记录。</p>';
    return;
  }
  const head = columns.map((col) => `<th>${col.label}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(col.value(row))}</td>`).join('')}</tr>`).join('');
  wrap.innerHTML = `<div class="front-addon-table-wrap"><table class="front-addon-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showTab(name) {
  ['addon', 'outdoor', 'qianai', 'issues'].forEach((id) => {
    $(`panel-${id}`).hidden = id !== name;
    $(`tab-${id}`).setAttribute('aria-selected', String(id === name));
  });
}

function refreshPreview() {
  if (!state.checkoutRows.length || !state.selectedDate) {
    $('previewSection').hidden = true;
    return;
  }
  state.preview = buildPreview(state.checkoutRows, state.selectedDate, state.includeHealthCert);
  const preview = state.preview;
  $('dayBanner').textContent = `只含 ${displayDate(preview.dateKey)}（按结账「操作时间」）。加项汇总 ${preview.addon.length} 条 / ¥${preview.addonTotal}，可直接导出上报；千爱登记是套餐和健康证到检。`;
  $('statAddon').textContent = `¥${preview.addonTotal}`;
  $('statOutdoor').textContent = `¥${preview.outdoorTotal}`;
  $('statQianai').textContent = `¥${preview.qianaiVisitTotal}`;
  $('statToday').textContent = `¥${preview.todayTotal}`;
  $('countAddon').textContent = `${preview.addon.length} 条明细`;
  $('countOutdoor').textContent = `${preview.outdoor.length} 条明细`;
  $('countQianai').textContent = `${preview.qianai.length} 条到检`;

  renderTable('panel-addon', preview.addon, [
    { label: '结账时间', value: (row) => row.datetime },
    { label: '姓名', value: (row) => row.name },
    { label: '单位', value: (row) => row.unit },
    { label: '所加项目', value: (row) => row.item },
    { label: '金额', value: (row) => row.amount },
    { label: '加项医生', value: (row) => row.doctor || '待补' },
    { label: '结账人', value: (row) => row.operator },
    { label: '来源', value: (row) => (row.qianai ? '千爱加项' : row.type) }
  ]);
  renderTable('panel-issues', preview.issues, [
    { label: '类型', value: (row) => row.kind },
    { label: '姓名', value: (row) => row.name },
    { label: '金额', value: (row) => row.amount },
    { label: '说明', value: (row) => row.detail }
  ]);
  renderTable('panel-outdoor', preview.outdoor, [
    { label: '结账时间', value: (row) => row.datetime },
    { label: '姓名', value: (row) => row.name },
    { label: '单位', value: (row) => row.unit },
    { label: '所加项目', value: (row) => row.item },
    { label: '金额', value: (row) => row.amount }
  ]);
  renderTable('panel-qianai', preview.qianai, [
    { label: '姓名', value: (row) => row.name },
    { label: '套餐', value: (row) => row.packageName },
    { label: '金额', value: (row) => row.amount },
    { label: '业务员', value: (row) => row.salesman },
    { label: '订单号', value: (row) => row.orderNo }
  ]);
  $('previewSection').hidden = false;
  $('downloadAddonBtn').disabled = false;
  $('downloadQianaiBtn').disabled = false;
  $('downloadBothBtn').disabled = false;
  const missing = [];
  if (!state.existingAddon) missing.push('加项汇总底稿');
  if (!state.existingQianai) missing.push('千爱登记底稿');
  setStatus(
    missing.length
      ? `已筛出 ${displayDate(preview.dateKey)}。还差：${missing.join('、')}。底稿当模板，导出时不改原来的 Excel 格式。`
      : `已筛出 ${displayDate(preview.dateKey)}，会按底稿原格式填入当天后导出。`,
    true
  );
}

async function readWorkbookFile(file) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

async function handleCheckout(file) {
  const workbook = await readWorkbookFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = rowsToRecords(sheet);
  if (!rows.length) throw new Error('没有读到结账明细。请确认是「结账付款统计表」。');
  const dates = [...new Set(rows.map(checkoutDateKey).filter(Boolean))].sort();
  if (!dates.length) throw new Error('没有识别到操作时间。');
  state.checkoutRows = rows;
  state.dates = dates;
  renderDateOptions(dates);
  refreshPreview();
}

function copyCellLook(src, dst) {
  if (!src || !dst) return;
  dst.style = src.style;
  if (src.numFmt) dst.numFmt = src.numFmt;
}

function copyRowLook(srcRow, dstRow, columns) {
  dstRow.height = srcRow.height;
  for (let col = 1; col <= columns; col += 1) {
    copyCellLook(srcRow.getCell(col), dstRow.getCell(col));
  }
}

function writeRowValues(sheet, rowNumber, values, styleRow, columns) {
  const row = sheet.getRow(rowNumber);
  if (styleRow) copyRowLook(styleRow, row, columns);
  values.forEach((value, index) => {
    row.getCell(index + 1).value = value;
  });
}

function dateSheetList(workbook) {
  return workbook.worksheets.filter((sheet) => /^\d+\.\d+$/.test(sheet.name));
}

function latestDateSheet(workbook, exceptName) {
  const sheets = dateSheetList(workbook)
    .filter((sheet) => sheet.name !== exceptName)
    .sort((a, b) => {
      const [am, ad] = a.name.split('.').map(Number);
      const [bm, bd] = b.name.split('.').map(Number);
      return am - bm || ad - bd;
    });
  return sheets[sheets.length - 1];
}

function findRowByLabel(sheet, keyword) {
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    if (String(sheet.getRow(row).getCell(1).value || '').includes(keyword)) return row;
  }
  return 0;
}

function cellAmount(sheet, row, col) {
  return parseMoneyCell(sheet.getRow(row).getCell(col).value);
}

function unmergeFrom(sheet, minRow) {
  const merges = [...(sheet.model?.merges || [])];
  merges.forEach((range) => {
    const start = String(range).split(':')[0];
    const row = Number(String(start).replace(/[A-Z]/gi, ''));
    if (row >= minRow) {
      try { sheet.unMergeCells(range); } catch (error) { /* ignore */ }
    }
  });
}

function copySheetChrome(from, to) {
  try { to.pageSetup = from.pageSetup; } catch (error) { /* ignore */ }
  try { to.views = from.views; } catch (error) { /* ignore */ }
  from.columns.forEach((col, index) => {
    const target = to.getColumn(index + 1);
    if (col.width) target.width = col.width;
    target.hidden = col.hidden;
  });
}

function fillAddonSheet(workbook, preview) {
  const sheetName = sheetNameForDate(preview.dateKey);
  const template = latestDateSheet(workbook, sheetName);
  const title = `定西美年大健康${sheetName}加项汇总表`;
  const month = Number(preview.dateKey.slice(5, 7));
  const priorMonthRow = template ? findRowByLabel(template, '累计') : 0;
  const priorMonth = priorMonthRow ? cellAmount(template, priorMonthRow, 9) : 0;
  const existing = workbook.getWorksheet(sheetName);
  if (existing) workbook.removeWorksheet(existing.id);
  const ws = workbook.addWorksheet(sheetName);

  if (template) {
    copySheetChrome(template, ws);
    for (let row = 1; row <= 2; row += 1) {
      copyRowLook(template.getRow(row), ws.getRow(row), 9);
      for (let col = 1; col <= 9; col += 1) {
        ws.getRow(row).getCell(col).value = template.getRow(row).getCell(col).value;
      }
    }
    safeMerge(ws, 'A1:I1');
  } else {
    ws.mergeCells('A1:I1');
    ws.getRow(2).values = ['序号', '姓名', '性别', '单位', 'ID号', '加项日期', '所加项目', '加项医生', '最终价'];
    ws.columns = [
      { width: 9 }, { width: 12 }, { width: 8 }, { width: 22 }, { width: 22 },
      { width: 22 }, { width: 28 }, { width: 12 }, { width: 10 }
    ];
  }
  ws.getCell('A1').value = title;

  const dataStyle = template ? template.getRow(3) : ws.getRow(2);
  const totalStyleRow = template ? template.getRow(findRowByLabel(template, '合计') || 3) : dataStyle;
  const monthStyleRow = template ? template.getRow(findRowByLabel(template, '累计') || 3) : dataStyle;

  preview.addon.forEach((row, index) => {
    writeRowValues(ws, index + 3, [
      String(index + 1),
      row.name,
      row.gender,
      row.unit,
      row.id,
      row.datetime,
      row.item,
      row.doctor || lookupDoctor(row.item) || '',
      row.amount
    ], dataStyle, 9);
  });

  const totalRow = preview.addon.length + 3;
  const monthRow = totalRow + 1;
  writeRowValues(ws, totalRow, ['合计', '', '', '', '', '', '', '', preview.addonTotal], totalStyleRow, 9);
  writeRowValues(ws, monthRow, [`${month}月累计`, '', '', '', '', '', '', '', money(priorMonth + preview.addonTotal)], monthStyleRow, 9);
  safeMerge(ws, `A${totalRow}:H${totalRow}`);
  safeMerge(ws, `A${monthRow}:H${monthRow}`);
}

function parseMoneyCell(value) {
  if (value && typeof value === 'object') {
    if (typeof value.result === 'number') return money(value.result);
    if (typeof value.formula === 'string') return parseMoneyCell(value.formula);
    if (value.text) return parseMoneyCell(value.text);
  }
  if (typeof value === 'number') return money(value);
  const text = String(value || '');
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  return money(nums.reduce((sum, num) => sum + num, 0));
}

function qianaiDateOf(cell) {
  return String(cell.value || '').replace(/\.0(\d)/g, '.$1');
}

function lastFilledRow(sheet, col) {
  for (let row = sheet.rowCount; row >= 3; row -= 1) {
    if (String(sheet.getRow(row).getCell(col).value || '').trim()) return row;
  }
  return 2;
}

function writeQianaiSheets(workbook, preview) {
  let ws = workbook.getWorksheet('千爱');
  if (!ws) {
    ws = workbook.addWorksheet('千爱');
    safeMerge(ws, 'A1:I1');
    ws.getCell('A1').value = '2026年千爱客服部体检登记明细';
    ws.getRow(2).values = ['序号', '体检日期', '姓名', '订单编号', '数量', '体检套餐', '金额', '业务员', '备注'];
  }

  const dateLabel = qianaiDateLabel(preview.dateKey);
  const kept = new Map();
  const styleRow = ws.getRow(lastFilledRow(ws, 3));
  for (let row = 3; row <= ws.rowCount; row += 1) {
    if (qianaiDateOf(ws.getRow(row).getCell(2)) === dateLabel) {
      const name = String(ws.getRow(row).getCell(3).value || '');
      kept.set(name, {
        orderNo: String(ws.getRow(row).getCell(4).value || ''),
        salesman: String(ws.getRow(row).getCell(8).value || '')
      });
    }
  }
  for (let row = ws.rowCount; row >= 3; row -= 1) {
    if (qianaiDateOf(ws.getRow(row).getCell(2)) === dateLabel) ws.spliceRows(row, 1);
  }

  preview.qianai.forEach((row, index) => {
    const prev = kept.get(row.name);
    const orderNo = (prev?.orderNo && /^wxo/i.test(prev.orderNo)) ? prev.orderNo : row.orderNo;
    const salesman = row.salesman || prev?.salesman || '';
    const excelRow = ws.addRow([]);
    copyRowLook(styleRow, excelRow, 9);
    [
      index + 1,
      dateLabel,
      row.name,
      orderNo,
      row.qty,
      row.packageName,
      row.amount,
      salesman,
      ''
    ].forEach((value, col) => {
      excelRow.getCell(col + 1).value = value;
    });
  });

  const summary = workbook.getWorksheet('Sheet1');
  if (!summary) return;
  const prevDate = String(summary.getCell('A2').value || '');
  const sameDay = prevDate.includes(displayDate(preview.dateKey));
  const prevQianaiAddon = parseMoneyCell(summary.getCell('C3').value);
  const prevOffline = parseMoneyCell(summary.getCell('C4').value);
  const prevToday = parseMoneyCell(summary.getCell('C5').value);
  const prevQianaiMonth = parseMoneyCell(summary.getCell('C6').value);
  const prevOfflineMonth = parseMoneyCell(summary.getCell('C7').value);
  const prevYear = parseMoneyCell(summary.getCell('C8').value);
  const qianaiMonth = sameDay
    ? money(prevQianaiMonth - prevQianaiAddon + preview.qianaiAddonTotal)
    : money((prevQianaiMonth || 0) + preview.qianaiAddonTotal);
  const offlineMonth = sameDay
    ? money(prevOfflineMonth - prevOffline + preview.offlineTotal)
    : money((prevOfflineMonth || 0) + preview.offlineTotal);
  const yearTotal = sameDay
    ? money(prevYear - prevToday + preview.todayTotal)
    : money((prevYear || 0) + preview.todayTotal);

  summary.getCell('A2').value = `时间:${displayDate(preview.dateKey)}`;
  summary.getCell('C3').value = preview.qianaiAddonTotal;
  summary.getCell('C4').value = `${preview.offlineInhouse}（店内）+${preview.offlineOutdoor}（外检）`;
  summary.getCell('C5').value = preview.todayTotal;
  summary.getCell('C6').value = qianaiMonth;
  summary.getCell('C7').value = offlineMonth;
  summary.getCell('C8').value = yearTotal;
}

async function downloadWorkbook(kind) {
  if (!state.preview) return;
  if (typeof ExcelJS === 'undefined') {
    setStatus('Excel 导出组件未加载，请刷新后重试。', false);
    return;
  }
  const workbook = new ExcelJS.Workbook();
  if (kind === 'addon') {
    if (state.existingAddon) {
      await workbook.xlsx.load(state.existingAddon.slice(0));
      if (!state.doctorByItem.size) parseDoctorMapFromExceljs(workbook);
    }
    fillAddonSheet(workbook, state.preview);
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(
      buffer,
      state.existingAddonName || `加项汇总表_${sheetNameForDate(state.preview.dateKey)}.xlsx`
    );
    return;
  }
  if (state.existingQianai) await workbook.xlsx.load(state.existingQianai.slice(0));
  writeQianaiSheets(workbook, state.preview);
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    buffer,
    state.existingQianaiName || `2026千爱体检登记表_${sheetNameForDate(state.preview.dateKey)}.xlsx`
  );
}

function safeMerge(sheet, range) {
  try {
    sheet.mergeCells(range);
  } catch (error) {
    /* already merged in template */
  }
}

async function downloadBoth() {
  await downloadWorkbook('addon');
  await new Promise((resolve) => setTimeout(resolve, 400));
  await downloadWorkbook('qianai');
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bindDropzone(zoneId, inputId, onFile) {
  const zone = $(zoneId);
  const input = $(inputId);
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', async (event) => {
    event.preventDefault();
    zone.classList.remove('is-over');
    const file = event.dataTransfer.files[0];
    if (file) await onFile(file);
  });
  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await onFile(file);
  });
}

function init() {
  bindDropzone('checkoutZone', 'checkoutInput', async (file) => {
    try {
      setFilename('checkoutName', file);
      await handleCheckout(file);
    } catch (error) {
      setStatus(error.message, false);
    }
  });
  bindDropzone('addonZone', 'addonInput', async (file) => {
    const buffer = await file.arrayBuffer();
    state.existingAddon = buffer;
    state.existingAddonName = file.name;
    parseDoctorMapFromXlsx(XLSX.read(buffer.slice(0), { type: 'array' }));
    setFilename('addonName', file);
    if (state.checkoutRows.length) refreshPreview();
    setStatus(`已载入加项汇总底稿。加项医生按底稿里同类项目补了 ${state.doctorByItem.size} 种。`, true);
  });
  bindDropzone('qianaiZone', 'qianaiInput', async (file) => {
    state.existingQianai = await file.arrayBuffer();
    state.existingQianaiName = file.name;
    setFilename('qianaiName', file);
    setStatus('已载入千爱登记底稿，导出时按这本的格式只追加当天。', true);
  });
  $('dateSelect').addEventListener('change', (event) => {
    state.selectedDate = event.target.value;
    refreshPreview();
  });
  $('includeHealthCert').addEventListener('change', (event) => {
    state.includeHealthCert = event.target.checked;
    refreshPreview();
  });
  $('tab-addon').addEventListener('click', () => showTab('addon'));
  $('tab-outdoor').addEventListener('click', () => showTab('outdoor'));
  $('tab-qianai').addEventListener('click', () => showTab('qianai'));
  $('tab-issues').addEventListener('click', () => showTab('issues'));
  $('downloadAddonBtn').addEventListener('click', () => downloadWorkbook('addon'));
  $('downloadQianaiBtn').addEventListener('click', () => downloadWorkbook('qianai'));
  $('downloadBothBtn').addEventListener('click', () => downloadBoth());
}

init();
