'use strict';

const DOCTOR_SOURCE = '医生加项';
const FRONT_SOURCE = '前台推荐';

const state = {
  checkoutRows: [],
  addonListRows: [],
  dates: [],
  selectedDate: '',
  includeFrontRecommend: true,
  includeDoctorId: true,
  includeHealthCert: true,
  existingAddon: null,
  existingAddonName: '',
  existingQianai: null,
  existingQianaiName: '',
  existingHealth: null,
  existingHealthName: '',
  existingOnboard: null,
  existingOnboardName: '',
  doctorIdFromDraft: new Map(),
  doctorIdFromList: new Map(),
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

function beijingTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shanghaiDateKey(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value);
}

function normalizeDateKey(value) {
  if (value === undefined || value === null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return shanghaiDateKey(value);
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

function addonListDateKey(row) {
  return normalizeDateKey(row['结账时间'] || row['加项日期']);
}

function formatClock(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const date = shanghaiDateKey(value);
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(value);
    return `${date} ${time}`;
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

function toNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

function idText(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value)) return String(value);
    return String(value);
  }
  return String(value).trim().replace(/\.0$/, '');
}

function personNameLike(value) {
  const text = String(value || '').trim();
  return /^[\u4e00-\u9fa5]{2,4}$/.test(text);
}

function doctorNameOnly(value) {
  return String(value || '').trim().replace(/-\d{8,}$/, '');
}

function doctorIdForm(value) {
  const match = String(value || '').trim().match(/^([\u4e00-\u9fa5]{2,4})-(\d{8,})$/);
  return match ? `${match[1]}-${match[2]}` : '';
}

function rememberDoctorId(store, value) {
  const full = doctorIdForm(value);
  if (!full) return;
  const name = doctorNameOnly(full);
  if (!store.has(name)) store.set(name, new Map());
  const counts = store.get(name);
  counts.set(full, (counts.get(full) || 0) + 1);
}

function pickDoctorIds(store) {
  const output = new Map();
  store.forEach((counts, name) => {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) output.set(name, best[0]);
  });
  return output;
}

function allowedAddonSources() {
  const sources = new Set([DOCTOR_SOURCE]);
  if (state.includeFrontRecommend) sources.add(FRONT_SOURCE);
  return sources;
}

function resolveDoctor(raw) {
  const full = doctorIdForm(raw);
  const name = doctorNameOnly(raw) || String(raw || '').trim();
  if (!state.includeDoctorId) return name;
  if (full) return full;
  if (!name) return '';
  return state.doctorIdFromDraft.get(name) || state.doctorIdFromList.get(name) || name;
}

function parseDoctorRosterFromWorkbook(workbook) {
  const store = new Map();
  workbook.SheetNames.forEach((sheetName) => {
    if (!/^\d+\.\d+$/.test(sheetName)) return;
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
    let headerIndex = -1;
    let doctorCol = 7;
    const limit = Math.min(rows.length, 5);
    for (let index = 0; index < limit; index += 1) {
      const row = rows[index].map((cell) => String(cell || ''));
      const doctorAt = row.findIndex((cell) => cell.includes('加项医生'));
      if (doctorAt >= 0) {
        headerIndex = index;
        doctorCol = doctorAt;
        break;
      }
    }
    if (headerIndex < 0) return;
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const label = String(rows[index][0] || '');
      if (label.includes('合计') || label.includes('累计')) break;
      rememberDoctorId(store, rows[index][doctorCol]);
    }
  });
  state.doctorIdFromDraft = pickDoctorIds(store);
}

function harvestDoctorsFromAddonList(rows) {
  const store = new Map();
  rows.forEach((row) => rememberDoctorId(store, row['加项医生']));
  state.doctorIdFromList = pickDoctorIds(store);
}

function mergedDoctorRoster() {
  const merged = new Map(state.doctorIdFromList);
  state.doctorIdFromDraft.forEach((full, name) => merged.set(name, full));
  return [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
}

function renderDoctorRoster() {
  const box = $('doctorRosterBox');
  const list = $('doctorRosterList');
  const note = $('doctorRosterNote');
  if (!box || !list || !note) return;
  const rows = mergedDoctorRoster();
  if (!rows.length) {
    box.hidden = true;
    note.textContent = '';
    return;
  }
  box.hidden = false;
  note.textContent = `已梳理 ${state.doctorIdFromDraft.size} 位底稿编号、${state.doctorIdFromList.size} 位客户加选编号，导出加项医生用「姓名-编号」。`;
  list.innerHTML = rows.map(([name, full]) => {
    const fromDraft = state.doctorIdFromDraft.get(name) === full;
    return `<li><code>${escapeHtml(full)}</code>${fromDraft ? '（底稿）' : '（加选）'}</li>`;
  }).join('');
}

function wxoFromText(value) {
  const match = String(value || '').match(/wxo\d+/i);
  return match ? match[0] : '';
}

function wxoOrderOf(row) {
  return wxoFromText(row['前台备注']) || wxoFromText(row['前台备注(不进检中)']);
}

function salesmanOf(row) {
  const manager = String(row['业务经理'] || '').trim();
  return personNameLike(manager) ? manager : '';
}

function splitChargeItems(charge) {
  return String(charge || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function packageFullName(items, charge) {
  const packs = items.filter((item) => /套餐|健康证|普惠基础|胶囊胃镜/.test(item) || (isPackageToken(item) && !/加项包/.test(item)));
  if (packs.length) return packs[0];
  return items.find((item) => !/加项包/.test(item)) || String(charge || '');
}

function isQianaiRow(row) {
  const blob = `${row['所属单位'] || ''} ${row['订单名称'] || ''} ${row['收费项目'] || ''}`;
  return /千爱/.test(blob);
}

function isHealthCert(items, type) {
  return items.some((item) => item.includes('健康证')) || type === '健康证';
}

function isOnboard(items, type) {
  const blob = items.join(' ');
  return /入职/.test(blob) || type === '入职';
}

function isPackagePriced(items, amount) {
  const blob = items.join(' ');
  if (!items.some(isPackageToken)) return false;
  if (/健康证/.test(blob) && amount <= 80) return true;
  if (amount >= 399 && /套餐|普惠基础|电力外检|职工体检方案|加项包|千爱/.test(blob)) return true;
  return false;
}

function isQianaiVisitRow(row, items, amount, healthCert) {
  if (!isQianaiRow(row)) return false;
  if (healthCert) return true;
  const blob = items.join(' ');
  if (/套餐|普惠基础|职工体检方案|自选/.test(blob)) return true;
  if (items.some((item) => /^\d{2}千爱/.test(item))) return true;
  return isPackagePriced(items, amount);
}

function applySharedQianaiAmounts(visits) {
  const byOrder = new Map();
  visits.forEach((row) => {
    if (/健康证/.test(`${row.packageName || ''} ${row.note || ''}`)) return;
    const order = String(row.soaOrder || '').trim();
    if (!order) return;
    if (!byOrder.has(order)) byOrder.set(order, []);
    byOrder.get(order).push(row);
  });
  byOrder.forEach((group) => {
    const byAmt = new Map();
    group.forEach((row) => {
      const amt = money(row.amount);
      if (!(amt > 0)) return;
      if (!byAmt.has(amt)) byAmt.set(amt, []);
      byAmt.get(amt).push(row);
    });
    byAmt.forEach((people) => {
      if (people.length < 2) return;
      people.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || a.name.localeCompare(b.name, 'zh'));
      people.forEach((row, index) => {
        row.qty = people.length;
        if (index === 0) return;
        row.amount = 0;
        row.note = row.note || '同码零计费';
      });
    });
  });
}

function isCancelled(row) {
  return String(row['状态'] || '').includes('取消');
}

function isAddonCancelled(row) {
  const flag = String(row['是否取消'] || '').trim();
  return flag === '是' || flag.includes('取消');
}

function isNoiseRow(row) {
  return /测试/.test(String(row['体检人'] || ''));
}

function findHeaderIndex(rows, needles) {
  const limit = Math.min(rows.length, 8);
  for (let index = 0; index < limit; index += 1) {
    const text = (rows[index] || []).map((cell) => String(cell || '')).join(' ');
    if (needles.every((needle) => text.includes(needle))) return index;
  }
  for (let index = 0; index < limit; index += 1) {
    const filled = (rows[index] || []).filter((cell) => cell && String(cell).trim());
    if (filled.length >= 8) return index;
  }
  return -1;
}

function rowsToRecords(sheet, needles) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  const headerIndex = findHeaderIndex(rows, needles);
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((cell) => String(cell || '').trim());
  const records = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const record = {};
    headers.forEach((name, col) => {
      if (name) record[name] = row[col];
    });
    records.push(record);
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
      const amt = money(row['结账总金额']);
      if (amt > 0 || (amt === 0 && isQianaiRow(row))) output.push(row);
    });
  });
  return output;
}

function classifyWorkbook(workbook) {
  const names = workbook.SheetNames.join(' ');
  const sample = workbook.SheetNames.slice(0, 4).map((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }).slice(0, 4);
    return rows.flat().join(' ');
  }).join(' ');
  if (sample.includes('加项来源') && sample.includes('所加项目')) return 'addonList';
  if (sample.includes('结账总金额') && sample.includes('收费项目')) return 'checkout';
  if (sample.includes('从业地点') && sample.includes('身份证')) return 'health';
  if (sample.includes('ID号码') && (names.includes('1.1') || sample.includes('入职'))) return 'onboard';
  if (names.includes('千爱') || sample.includes('千爱客服部')) return 'qianai';
  if (sample.includes('所加项目') && sample.includes('加项医生')) return 'addonTpl';
  return '';
}

function lookupCheckout(row, byReserve, byNameDate, dateKey) {
  const reserve = idText(row['预约单号']);
  if (reserve && byReserve.has(reserve)) return byReserve.get(reserve);
  const name = String(row['姓名'] || '').trim();
  return byNameDate.get(`${dateKey}|${name}`) || null;
}

function buildPreview() {
  const dateKey = state.selectedDate;
  if (!dateKey) return null;

  const byReserve = new Map();
  const byNameDate = new Map();
  state.checkoutRows.forEach((row) => {
    const reserve = idText(row['预约单号']);
    if (reserve) byReserve.set(reserve, row);
    const name = String(row['体检人'] || '').trim();
    if (name) byNameDate.set(`${checkoutDateKey(row)}|${name}`, row);
  });

  const addon = [];
  const issues = [];
  state.addonListRows.forEach((row) => {
    if (addonListDateKey(row) !== dateKey) return;
    if (isAddonCancelled(row)) return;
    const amount = money(toNumber(row['成交价']));
    if (!(amount > 0)) return;
    const source = String(row['加项来源'] || '').trim();
    if (!allowedAddonSources().has(source)) return;
    const checkout = lookupCheckout(row, byReserve, byNameDate, dateKey);
    const unit = String(row['单位名称'] || '').trim() || String(checkout?.['所属单位'] || '').trim();
    const gender = String(row['性别'] || checkout?.['性别'] || '').trim();
    const qianai = /千爱/.test(`${unit} ${row['订单名称'] || ''} ${checkout?.['所属单位'] || ''} ${checkout?.['订单名称'] || ''}`);
    addon.push({
      name: String(row['姓名'] || '').trim(),
      gender,
      unit,
      id: idText(row['体检人ID']),
      datetime: formatClock(row['加项日期']),
      item: String(row['所加项目'] || row['体检项名称'] || '').trim(),
      doctor: resolveDoctor(row['加项医生']),
      operator: String(row['操作人'] || '').trim(),
      amount,
      source,
      type: String(checkout?.['体检类型'] || '') === '外检' ? '外检' : '院内',
      qianai,
      reserveNo: idText(row['预约单号'] || checkout?.['预约单号'])
    });
  });
  // 保持客户加选原表顺序，和手报表行序一致

  const sameDay = state.checkoutRows.filter((row) => checkoutDateKey(row) === dateKey);
  const dayRows = netCheckoutRows(sameDay.filter((row) => !isCancelled(row) && !isNoiseRow(row)));
  const qianai = [];
  const health = [];
  const onboard = [];
  const visitSeen = new Set();
  const healthSeen = new Set();
  const onboardSeen = new Set();

  dayRows.forEach((row) => {
    const items = splitChargeItems(row['收费项目']);
    const amount = money(row['结账总金额']);
    const type = String(row['体检类型'] || '');
    const person = String(row['体检人'] || '').trim();
    const reserve = idText(row['预约单号']);
    const healthCert = isHealthCert(items, type);
    const onboardFlag = isOnboard(items, type);
    const qianaiFlag = isQianaiRow(row);

    if (healthCert && reserve && !healthSeen.has(reserve)) {
      healthSeen.add(reserve);
      health.push({
        id: reserve,
        name: person,
        gender: String(row['性别'] || '').trim(),
        nation: '汉',
        place: String(row['名单备注'] || '').trim(),
        idCard: '',
        phone: '',
        date: qianaiDateLabel(dateKey),
        ok: ''
      });
    }

    if (onboardFlag && reserve && !onboardSeen.has(reserve)) {
      onboardSeen.add(reserve);
      onboard.push({
        id: reserve,
        name: person,
        gender: String(row['性别'] || '').trim(),
        nation: '汉',
        idCard: '',
        date: qianaiDateLabel(dateKey)
      });
    }

    const takeVisit = (qianaiFlag || (state.includeHealthCert && healthCert))
      && (healthCert || isQianaiVisitRow(row, items, amount, healthCert) || isPackagePriced(items, amount));
    if (takeVisit && (amount > 0 || (qianaiFlag && !healthCert))) {
      const packageName = packageFullName(items, row['收费项目']);
      const key = `${reserve}|${person}|${packageName}`;
      if (!visitSeen.has(key)) {
        visitSeen.add(key);
        qianai.push({
          date: dateKey,
          name: person,
          orderNo: wxoOrderOf(row),
          soaOrder: String(row['订单号'] || '').trim(),
          time: formatClock(row['操作时间']),
          qty: 1,
          packageName,
          amount,
          salesman: salesmanOf(row),
          note: healthCert ? '健康证' : ''
        });
      }
    }
  });
  applySharedQianaiAmounts(qianai);

  qianai.filter((row) => !row.orderNo).forEach((row) => {
    issues.push({
      kind: '千爱缺wxo订单号',
      name: row.name,
      amount: row.amount,
      detail: '千爱登记的订单编号要用前台备注里的 wxo 编码。结账「订单号」是 SOA，不能填进这一列。前台备注没有 wxo 就留空。'
    });
  });

  if (!state.addonListRows.length) {
    issues.push({
      kind: '缺客户加选',
      name: '',
      amount: '',
      detail: '没有客户加选项目列表时，加项汇总对不上上报口径，不会从结账表硬拆。'
    });
  }
  addon.filter((row) => row.doctor && !doctorIdForm(row.doctor)).forEach((row) => {
    issues.push({
      kind: '加项医生缺编号',
      name: row.name,
      amount: row.amount,
      detail: `当前是「${row.doctor}」，底稿和客户加选都没有「姓名-编号」。`
    });
  });
  addon.filter((row) => !row.unit).forEach((row) => {
    issues.push({
      kind: '单位待补',
      name: row.name,
      amount: row.amount,
      detail: '加选没有单位，结账也没对上预约单号。'
    });
  });
  health.forEach((row) => {
    issues.push({
      kind: '健康证缺证件',
      name: row.name,
      amount: '',
      detail: `从业地点「${row.place || '空'}」已用名单备注。身份证、电话不在结账/加选里，导出留空。`
    });
  });
  onboard.forEach((row) => {
    issues.push({
      kind: '入职缺身份证',
      name: row.name,
      amount: '',
      detail: '结账能出姓名、性别、预约单号、日期；身份证号不在这两张日常表里。'
    });
  });

  const inhouse = addon.filter((row) => row.type !== '外检');
  const outdoor = addon.filter((row) => row.type === '外检');
  const qianaiAddons = addon.filter((row) => row.qianai);
  const offlineInhouse = money(inhouse.filter((row) => !row.qianai).reduce((sum, row) => sum + row.amount, 0));
  const offlineOutdoor = money(outdoor.filter((row) => !row.qianai).reduce((sum, row) => sum + row.amount, 0));

  return {
    dateKey,
    addon,
    outdoor,
    qianai,
    health,
    onboard,
    issues,
    inhouseTotal: money(inhouse.reduce((sum, row) => sum + row.amount, 0)),
    outdoorTotal: money(outdoor.reduce((sum, row) => sum + row.amount, 0)),
    addonTotal: money(addon.reduce((sum, row) => sum + row.amount, 0)),
    qianaiAddonTotal: money(qianaiAddons.reduce((sum, row) => sum + row.amount, 0)),
    qianaiVisitTotal: money(qianai.reduce((sum, row) => sum + row.amount, 0)),
    offlineInhouse,
    offlineOutdoor,
    offlineTotal: money(offlineInhouse + offlineOutdoor),
    todayTotal: money(qianaiAddons.reduce((sum, row) => sum + row.amount, 0) + offlineInhouse + offlineOutdoor),
    priorMonth: priorMonthFromTemplate(dateKey),
    doctors: doctorTotals(addon)
  };
}

function formatAmount(value) {
  const num = money(value);
  return Number.isInteger(num) ? String(num) : String(num);
}

function dateOnly(value, dateKey) {
  return normalizeDateKey(value) || dateKey;
}

function doctorTotals(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const label = String(row.doctor || '').trim();
    if (!label) return;
    if (!map.has(label)) {
      map.set(label, { name: label, amount: 0, people: new Set(), count: 0 });
    }
    const item = map.get(label);
    item.amount = money(item.amount + row.amount);
    item.count += 1;
    if (row.name) item.people.add(row.name);
  });
  return [...map.values()]
    .map((item) => ({
      name: item.name,
      amount: item.amount,
      people: item.people.size,
      count: item.count
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'zh'));
}

function priorMonthFromTemplate(dateKey) {
  if (!state.existingAddon || typeof XLSX === 'undefined') return 0;
  try {
    const workbook = XLSX.read(state.existingAddon.slice(0), { type: 'array' });
    const except = sheetNameForDate(dateKey);
    const sheets = workbook.SheetNames
      .filter((name) => /^\d+\.\d+$/.test(name) && name !== except)
      .sort((a, b) => {
        const [am, ad] = a.split('.').map(Number);
        const [bm, bd] = b.split('.').map(Number);
        return am - bm || ad - bd;
      });
    const last = sheets[sheets.length - 1];
    if (!last) return 0;
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[last], { header: 1, raw: true, defval: '' });
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (String(rows[index][0] || '').includes('累计')) return parseMoneyCell(rows[index][8]);
    }
  } catch (error) {
    return 0;
  }
  return 0;
}

const EXCEL_FONT = '"Songti SC","SimSun","NSimSun","STSong","PingFang SC","Microsoft YaHei",serif';
const CHART_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
const EXCEL_BLUE = '#5B9BD5';
const EXCEL_GRID = '#D9D9D9';
const EXCEL_AXIS = '#595959';

function wrapLines(ctx, text, maxWidth) {
  const source = String(text ?? '');
  if (!source) return [''];
  const lines = [];
  let current = '';
  for (const ch of source) {
    const trial = current + ch;
    if (ctx.measureText(trial).width <= maxWidth) current = trial;
    else {
      if (current) lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function fitFont(ctx, text, maxWidth, size, min) {
  let current = size;
  ctx.font = `bold ${current}px ${EXCEL_FONT}`;
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 0.5;
    ctx.font = `bold ${current}px ${EXCEL_FONT}`;
  }
  return current;
}

function drawCenteredLines(ctx, lines, cx, cy, lineHeight) {
  const top = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, cx, top + index * lineHeight);
  });
}

function addonTitle(dateKey) {
  return `定西美年大健康${sheetNameForDate(dateKey)}加项汇总表`;
}

function drawAddonTableImage(preview) {
  const scale = 2;
  const cols = [
    { key: 'seq', w: 46, header: '序号' },
    { key: 'name', w: 64, header: '姓名' },
    { key: 'gender', w: 42, header: '性别' },
    { key: 'unit', w: 190, header: '单位' },
    { key: 'id', w: 148, header: 'ID号' },
    { key: 'date', w: 78, header: '加项日期' },
    { key: 'item', w: 118, header: '所加项目' },
    { key: 'doctor', w: 168, header: '加项医生' },
    { key: 'amount', w: 62, header: '最终价' }
  ];
  const tableW = cols.reduce((sum, col) => sum + col.w, 0);
  const pad = 3;
  const titleH = 28;
  const minRow = 22;
  const lineH = 14;
  const month = Number(preview.dateKey.slice(5, 7));
  const monthTotal = money((preview.priorMonth || 0) + preview.addonTotal);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `11px ${EXCEL_FONT}`;
  const records = preview.addon.map((row, index) => ({
    seq: String(index + 1),
    name: row.name,
    gender: row.gender,
    unit: row.unit,
    id: row.id,
    date: dateOnly(row.datetime, preview.dateKey),
    item: row.item,
    doctor: row.doctor,
    amount: formatAmount(row.amount)
  }));
  const measureRow = (record, header) => {
    ctx.font = header ? `bold 11px ${EXCEL_FONT}` : `11px ${EXCEL_FONT}`;
    const lines = cols.map((col) => wrapLines(ctx, header ? col.header : record[col.key], col.w - pad * 2));
    return Math.max(minRow, Math.max(...lines.map((item) => item.length)) * lineH + 8);
  };
  const headerH = measureRow({}, true);
  const rowHeights = records.map((record) => measureRow(record, false));
  const footH = 24;
  const tableH = titleH + headerH + rowHeights.reduce((sum, h) => sum + h, 0) + footH * 2;

  canvas.width = Math.round(tableW * scale);
  canvas.height = Math.round(tableH * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, tableW, tableH);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.font = `bold 16px ${EXCEL_FONT}`;
  ctx.fillText(addonTitle(preview.dateKey), tableW / 2, titleH / 2);
  ctx.strokeRect(0.5, 0.5, tableW - 1, tableH - 1);

  const drawRow = (y, h, values, bold) => {
    ctx.font = bold ? `bold 11px ${EXCEL_FONT}` : `11px ${EXCEL_FONT}`;
    let x = 0;
    cols.forEach((col, index) => {
      ctx.strokeRect(x + 0.5, y + 0.5, col.w, h);
      const lines = wrapLines(ctx, values[index], col.w - pad * 2);
      drawCenteredLines(ctx, lines, x + col.w / 2, y + h / 2, lineH);
      x += col.w;
    });
  };

  let y = titleH;
  drawRow(y, headerH, cols.map((col) => col.header), true);
  y += headerH;
  records.forEach((record, index) => {
    drawRow(y, rowHeights[index], cols.map((col) => record[col.key]), false);
    y += rowHeights[index];
  });

  const lastW = cols[cols.length - 1].w;
  const mergeW = tableW - lastW;
  [['合计', formatAmount(preview.addonTotal)], [`${month}月累计`, formatAmount(monthTotal)]].forEach((pair) => {
    ctx.font = '11px ' + EXCEL_FONT;
    ctx.strokeRect(0.5, y + 0.5, mergeW, footH);
    ctx.strokeRect(mergeW + 0.5, y + 0.5, lastW, footH);
    ctx.fillText(pair[0], mergeW / 2, y + footH / 2);
    ctx.fillText(pair[1], mergeW + lastW / 2, y + footH / 2);
    y += footH;
  });
  return canvas;
}

function doctorChartTotals(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const name = doctorNameOnly(row.doctor);
    if (!name) return;
    if (!map.has(name)) map.set(name, { name, amount: 0, people: new Set() });
    const item = map.get(name);
    item.amount = money(item.amount + row.amount);
    if (row.name) item.people.add(row.name);
  });
  return [...map.values()]
    .map((item) => ({ name: item.name, amount: item.amount, people: item.people.size }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'zh'));
}

function niceChartMax(value) {
  const padded = Math.max(1, Number(value) || 1) * 1.12;
  const mag = 10 ** Math.floor(Math.log10(padded));
  const n = padded / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * mag;
}

function drawDoctorChartImage(preview) {
  const scale = 2;
  const doctors = doctorChartTotals(preview.addon || []);
  const width = Math.max(920, 160 + doctors.length * 88);
  const height = 520;
  const pad = { top: 56, right: 24, bottom: 42, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxAmount = niceChartMax(Math.max(0, ...doctors.map((row) => row.amount)));
  const tickCount = 9;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#404040';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `16px ${CHART_FONT}`;
  ctx.fillText(addonTitle(preview.dateKey), width / 2, 22);

  ctx.font = `11px ${CHART_FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= tickCount; i += 1) {
    const value = (maxAmount / tickCount) * i;
    const y = pad.top + plotH - (value / maxAmount) * plotH;
    ctx.strokeStyle = i === 0 ? EXCEL_AXIS : EXCEL_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y + 0.5);
    ctx.lineTo(pad.left + plotW, y + 0.5);
    ctx.stroke();
    ctx.fillStyle = EXCEL_AXIS;
    ctx.fillText(String(Math.round(value)), pad.left - 8, y);
  }

  const n = Math.max(doctors.length, 1);
  const slot = plotW / n;
  const barW = Math.min(46, slot * 0.42);
  doctors.forEach((row, index) => {
    const barH = (row.amount / maxAmount) * plotH;
    const x = pad.left + slot * index + (slot - barW) / 2;
    const y = pad.top + plotH - barH;
    const cx = pad.left + slot * index + slot / 2;
    ctx.fillStyle = EXCEL_BLUE;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#404040';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `12px ${CHART_FONT}`;
    ctx.fillText(formatAmount(row.amount), cx, Math.max(pad.top + 8, y - 4));
    ctx.textBaseline = 'top';
    ctx.font = `12px ${CHART_FONT}`;
    ctx.fillText(row.name, cx, pad.top + plotH + 8);
  });
  return canvas;
}

function canvasToArrayBuffer(canvas) {
  return canvasToBlobUrl(canvas).then((url) => fetch(url).then((res) => res.arrayBuffer()));
}

function revokeLater(url) {
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToBlobUrl(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error('还没有生成上报图'));
      return;
    }
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('图片导出失败'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
      return;
    }
    try {
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      reject(error);
    }
  });
}

function bindBlobPreview(img, canvas) {
  if (img.dataset.blobUrl) {
    URL.revokeObjectURL(img.dataset.blobUrl);
    delete img.dataset.blobUrl;
  }
  if (!canvas) {
    img.removeAttribute('src');
    return Promise.resolve();
  }
  return canvasToBlobUrl(canvas).then((url) => {
    if (url.startsWith('blob:')) img.dataset.blobUrl = url;
    img.src = url;
  });
}

function ensureReportCanvases(preview) {
  if (!preview?.addon?.length) {
    state.tableCanvas = null;
    state.chartCanvas = null;
    return false;
  }
  if (!state.tableCanvas || !state.chartCanvas) {
    state.tableCanvas = drawAddonTableImage(preview);
    state.chartCanvas = drawDoctorChartImage(preview);
  }
  return true;
}

function renderReportImages(preview) {
  const tableImg = $('reportTableImg');
  const chartImg = $('reportChartImg');
  if (!tableImg || !chartImg) return;
  if (!preview?.addon?.length) {
    bindBlobPreview(tableImg, null);
    bindBlobPreview(chartImg, null);
    state.tableCanvas = null;
    state.chartCanvas = null;
    return;
  }
  try {
    state.tableCanvas = drawAddonTableImage(preview);
    state.chartCanvas = drawDoctorChartImage(preview);
    bindBlobPreview(tableImg, state.tableCanvas);
    bindBlobPreview(chartImg, state.chartCanvas);
  } catch (error) {
    state.tableCanvas = null;
    state.chartCanvas = null;
    setStatus(`上报图没画出来：${error.message}`, false);
  }
}

async function downloadCanvasPng(canvas, filename) {
  try {
    const url = await canvasToBlobUrl(canvas);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (url.startsWith('blob:')) revokeLater(url);
  } catch (error) {
    setStatus(error.message, false);
  }
}

async function downloadReportPng(kind) {
  if (!state.preview?.addon?.length) {
    setStatus('先算出当天加项汇总，再导出上报图。', false);
    return;
  }
  try {
    ensureReportCanvases(state.preview);
  } catch (error) {
    setStatus(`上报图没画出来：${error.message}`, false);
    return;
  }
  const tag = sheetNameForDate(state.preview.dateKey);
  if (kind === 'table') {
    await downloadCanvasPng(state.tableCanvas, `加项汇总表_${tag}.png`);
    return;
  }
  await downloadCanvasPng(state.chartCanvas, `加项医生柱状图_${tag}.png`);
}

function setFilename(id, file) {
  $(id).textContent = file ? `已选：${file.name}` : '尚未选择文件';
}

function setStatus(message, ok) {
  const node = $('statusMessage');
  node.textContent = message || '';
  node.className = ok ? 'front-addon-ok' : 'front-addon-error';
}

function unionDates() {
  const fromCheckout = state.checkoutRows.map(checkoutDateKey);
  const fromAddon = state.addonListRows.map(addonListDateKey);
  return [...new Set([...fromCheckout, ...fromAddon, beijingTodayKey()].filter(Boolean))].sort();
}

function pickDefaultDate(dates, previous) {
  const today = beijingTodayKey();
  if (previous && dates.includes(previous)) return previous;
  if (dates.includes(today)) return today;
  return dates[dates.length - 1] || today;
}

function renderDateOptions(dates) {
  const select = $('dateSelect');
  const previous = state.selectedDate;
  select.innerHTML = '';
  dates.forEach((dateKey) => {
    const option = document.createElement('option');
    option.value = dateKey;
    option.textContent = dateKey === beijingTodayKey() ? `${displayDate(dateKey)}（今天）` : displayDate(dateKey);
    select.append(option);
  });
  if (dates.length) {
    select.value = pickDefaultDate(dates, previous);
    state.selectedDate = select.value;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function showTab(name) {
  ['addon', 'images', 'qianai', 'health', 'onboard', 'issues'].forEach((id) => {
    $(`panel-${id}`).hidden = id !== name;
    $(`tab-${id}`).setAttribute('aria-selected', String(id === name));
  });
}

function refreshPreview() {
  state.dates = unionDates();
  if (state.dates.length && !state.dates.includes(state.selectedDate)) {
    renderDateOptions(state.dates);
  }
  if ((!state.checkoutRows.length && !state.addonListRows.length) || !state.selectedDate) {
    $('previewSection').hidden = true;
    return;
  }
  state.preview = buildPreview();
  const preview = state.preview;
  const sourceLabel = state.includeFrontRecommend ? '医生加项+前台推荐' : '仅医生加项';
  $('dayBanner').textContent = `${displayDate(preview.dateKey)}：加项汇总 ${preview.addon.length} 条 / ¥${preview.addonTotal}（${sourceLabel}）；千爱到检 ${preview.qianai.length} 人；健康证 ${preview.health.length} 人；入职 ${preview.onboard.length} 人。`;
  $('statAddon').textContent = `¥${preview.addonTotal}`;
  $('statQianai').textContent = `¥${preview.qianaiVisitTotal}`;
  $('statHealth').textContent = String(preview.health.length);
  $('statOnboard').textContent = String(preview.onboard.length);
  $('countAddon').textContent = `${preview.addon.length} 条明细`;
  $('countQianai').textContent = `${preview.qianai.length} 条到检`;
  $('countHealth').textContent = preview.health.some((row) => !row.idCard) ? '身份证电话待补' : '人';
  $('countOnboard').textContent = preview.onboard.some((row) => !row.idCard) ? '身份证待补' : '人';

  renderTable('panel-addon', preview.addon, [
    { label: '加项时间', value: (row) => row.datetime },
    { label: '姓名', value: (row) => row.name },
    { label: '单位', value: (row) => row.unit },
    { label: '所加项目', value: (row) => row.item },
    { label: '成交价', value: (row) => row.amount },
    { label: '加项医生', value: (row) => row.doctor },
    { label: '来源', value: (row) => row.source },
    { label: 'ID', value: (row) => row.id }
  ]);
  renderTable('panel-qianai', preview.qianai, [
    { label: '姓名', value: (row) => row.name },
    { label: '套餐', value: (row) => row.packageName },
    { label: '金额', value: (row) => row.amount },
    { label: '业务员', value: (row) => row.salesman },
    { label: '订单编号', value: (row) => row.orderNo || '待补（前台备注无wxo）' }
  ]);
  renderTable('panel-health', preview.health, [
    { label: 'ID号码', value: (row) => row.id },
    { label: '姓名', value: (row) => row.name },
    { label: '性别', value: (row) => row.gender },
    { label: '从业地点', value: (row) => row.place },
    { label: '身份证号', value: (row) => row.idCard || '待补' },
    { label: '电话', value: (row) => row.phone || '待补' }
  ]);
  renderTable('panel-onboard', preview.onboard, [
    { label: 'ID号码', value: (row) => row.id },
    { label: '姓名', value: (row) => row.name },
    { label: '性别', value: (row) => row.gender },
    { label: '身份证号', value: (row) => row.idCard || '待补' },
    { label: '体检日期', value: (row) => row.date }
  ]);
  renderTable('panel-issues', preview.issues, [
    { label: '类型', value: (row) => row.kind },
    { label: '姓名', value: (row) => row.name },
    { label: '金额', value: (row) => row.amount },
    { label: '说明', value: (row) => row.detail }
  ]);
  $('previewSection').hidden = false;
  $('downloadAddonBtn').disabled = false;
  $('downloadQianaiBtn').disabled = !state.checkoutRows.length;
  $('downloadHealthBtn').disabled = !state.checkoutRows.length;
  $('downloadOnboardBtn').disabled = !state.checkoutRows.length;
  $('downloadBothBtn').disabled = false;
  if ($('downloadTablePngBtn')) $('downloadTablePngBtn').disabled = !preview.addon.length;
  if ($('downloadChartPngBtn')) $('downloadChartPngBtn').disabled = !preview.addon.length;
  renderTable('doctorStatsTable', doctorChartTotals(preview.addon), [
    { label: '加项医生', value: (row) => row.name },
    { label: '人数', value: (row) => row.people },
    { label: '金额', value: (row) => row.amount }
  ]);
  renderReportImages(preview);
  const missing = [];
  if (!state.addonListRows.length) missing.push('客户加选');
  if (!state.checkoutRows.length) missing.push('结账表');
  if (!state.existingAddon) missing.push('加项汇总底稿');
  if (!state.existingQianai) missing.push('千爱底稿');
  if (!state.existingHealth) missing.push('健康证底稿');
  if (!state.existingOnboard) missing.push('入职底稿');
  const dayLabel = preview.dateKey === beijingTodayKey()
    ? `${displayDate(preview.dateKey)}（今天）`
    : displayDate(preview.dateKey);
  const sheetHint = `会在底稿里新增「${sheetNameForDate(preview.dateKey)}」工作表，昨天及更早的日期表原样保留`;
  setStatus(
    missing.length
      ? `已算出 ${dayLabel}。还差：${missing.join('、')}。有底稿的${sheetHint}；没有的也能新出一本。`
      : `已算出 ${dayLabel}，${sheetHint}。`,
    true
  );
}

async function readWorkbookFile(file) {
  const buffer = await file.arrayBuffer();
  return { workbook: XLSX.read(buffer.slice(0), { type: 'array', cellDates: true }), buffer };
}

async function ingestFile(file, hintedKind) {
  const { workbook, buffer } = await readWorkbookFile(file);
  const kind = classifyWorkbook(workbook) || hintedKind;
  if (kind === 'checkout') {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = rowsToRecords(sheet, ['体检人', '收费项目']).filter((row) => row['体检人'] || row['收费项目']);
    if (!rows.length) throw new Error('没有读到结账明细。请确认是「结账付款统计表」。');
    state.checkoutRows = rows;
    setFilename('checkoutName', file);
  } else if (kind === 'addonList') {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = rowsToRecords(sheet, ['所加项目', '加项来源']).filter((row) => row['姓名'] || row['所加项目']);
    if (!rows.length) throw new Error('没有读到客户加选明细。');
    state.addonListRows = rows;
    harvestDoctorsFromAddonList(rows);
    setFilename('addonListName', file);
  } else if (kind === 'addonTpl') {
    state.existingAddon = buffer;
    state.existingAddonName = file.name;
    parseDoctorRosterFromWorkbook(workbook);
    setFilename('addonName', file);
  } else if (kind === 'qianai') {
    state.existingQianai = buffer;
    state.existingQianaiName = file.name;
    setFilename('qianaiName', file);
  } else if (kind === 'health') {
    state.existingHealth = buffer;
    state.existingHealthName = file.name;
    setFilename('healthName', file);
  } else if (kind === 'onboard') {
    state.existingOnboard = buffer;
    state.existingOnboardName = file.name;
    setFilename('onboardName', file);
  } else if (hintedKind) {
    throw new Error('这个文件对不上当前格子，请换对应的表。');
  } else {
    throw new Error('无法识别文件类型。');
  }
  state.dates = unionDates();
  renderDateOptions(state.dates);
  renderDoctorRoster();
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

function cellAmount(sheet, row, col) {
  return parseMoneyCell(sheet.getRow(row).getCell(col).value);
}

function safeMerge(sheet, range) {
  try {
    sheet.mergeCells(range);
  } catch (error) {
    /* already merged */
  }
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

function excelSheetRef(sheetName, cell) {
  const escaped = String(sheetName || '').replace(/'/g, "''");
  return `'${escaped}'!${cell}`;
}

function formulaCell(formula, result) {
  const cell = { formula: String(formula).replace(/^=/, '') };
  if (result !== undefined && result !== null && result !== '') cell.result = result;
  return cell;
}

function setActiveWorksheet(workbook, ws) {
  const index = workbook.worksheets.findIndex((sheet) => sheet === ws || sheet.id === ws.id);
  if (index < 0) return;
  workbook.views = [{
    x: 0,
    y: 0,
    width: 120000,
    height: 40000,
    firstSheet: 0,
    activeTab: index,
    visibility: 'visible'
  }];
}

function placeDateSheetAfterLatest(workbook, ws, afterSheet) {
  const sheets = workbook._worksheets;
  if (!afterSheet || !Array.isArray(sheets)) {
    setActiveWorksheet(workbook, ws);
    return;
  }
  const desiredId = afterSheet.id + 1;
  if (ws.id === desiredId) {
    setActiveWorksheet(workbook, ws);
    return;
  }
  const currentId = ws.id;
  delete sheets[currentId];
  const movers = [];
  sheets.forEach((sheet, id) => {
    if (sheet && id >= desiredId) movers.push(sheet);
  });
  movers.sort((a, b) => b.id - a.id);
  movers.forEach((sheet) => {
    delete sheets[sheet.id];
    sheet.id += 1;
    sheets[sheet.id] = sheet;
  });
  ws.id = desiredId;
  sheets[desiredId] = ws;
  setActiveWorksheet(workbook, ws);
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
  placeDateSheetAfterLatest(workbook, ws, template);

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
      row.doctor,
      row.amount
    ], dataStyle, 9);
  });

  const totalRow = preview.addon.length + 3;
  const monthRow = totalRow + 1;
  const lastDataRow = Math.max(3, totalRow - 1);
  const monthTotal = money(priorMonth + preview.addonTotal);
  const monthFormula = priorMonthRow
    ? `${excelSheetRef(template.name, `I${priorMonthRow}`)}+I${totalRow}`
    : `I${totalRow}`;
  writeRowValues(ws, totalRow, ['合计', '', '', '', '', '', '', '', formulaCell(`SUM(I3:I${lastDataRow})`, preview.addonTotal)], totalStyleRow, 9);
  writeRowValues(ws, monthRow, [`${month}月累计`, '', '', '', '', '', '', '', formulaCell(monthFormula, monthTotal)], monthStyleRow, 9);
  safeMerge(ws, `A${totalRow}:H${totalRow}`);
  safeMerge(ws, `A${monthRow}:H${monthRow}`);

  if (preview.addon.length) {
    const dataStart = 3;
    const dataEnd = lastDataRow;
    const nameRange = `$J$${dataStart}:$J$${dataEnd}`;
    const personRange = `$B$${dataStart}:$B$${dataEnd}`;
    const amountRange = `$I$${dataStart}:$I$${dataEnd}`;
    ws.getColumn(10).width = 12;
    ws.getColumn(10).hidden = true;
    ws.getRow(2).getCell(10).value = '医生姓名';
    for (let row = dataStart; row <= dataEnd; row += 1) {
      ws.getRow(row).getCell(10).value = formulaCell(
        `IF(H${row}="","",IF(ISNUMBER(FIND("-",H${row})),LEFT(H${row},FIND("-",H${row})-1),H${row}))`,
        doctorNameOnly(preview.addon[row - dataStart]?.doctor)
      );
    }

    const chartDoctors = doctorChartTotals(preview.addon);
    ws.getColumn(11).width = 14;
    ws.getColumn(12).width = 10;
    ws.getColumn(13).width = 12;
    ws.getRow(2).getCell(11).value = '加项医生';
    ws.getRow(2).getCell(12).value = '人数';
    ws.getRow(2).getCell(13).value = '金额';
    chartDoctors.forEach((row, index) => {
      const excelRow = ws.getRow(index + 3);
      const cell = `K${index + 3}`;
      excelRow.getCell(11).value = row.name;
      excelRow.getCell(12).value = formulaCell(
        `IF(${cell}="","",SUMPRODUCT((${nameRange}=${cell})*(${personRange}<>"")/COUNTIFS(${nameRange},${nameRange},${personRange},${personRange})))`,
        row.people
      );
      excelRow.getCell(13).value = formulaCell(
        `IF(${cell}="","",SUMIF(${nameRange},${cell},${amountRange}))`,
        row.amount
      );
    });
  }
}

async function embedAddonChart(workbook, preview) {
  if (!preview?.addon?.length) return;
  const canvas = drawDoctorChartImage(preview);
  const buffer = await canvasToArrayBuffer(canvas);
  const imageId = workbook.addImage({ buffer, extension: 'png' });
  const ws = workbook.getWorksheet(sheetNameForDate(preview.dateKey));
  if (!ws) return;
  ws.addImage(imageId, {
    tl: { col: 14, row: 1 },
    ext: { width: 760, height: 420 }
  });
}

function qianaiDateOf(cell) {
  const value = cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return qianaiDateLabel(shanghaiDateKey(value));
  }
  if (value && typeof value === 'object') {
    if (value.result instanceof Date) return qianaiDateOf({ value: value.result });
    if (value.result !== undefined && value.result !== null && value.result !== '') {
      return qianaiDateOf({ value: value.result });
    }
    if (value.text) return qianaiDateOf({ value: value.text });
  }
  const text = String(value || '').trim();
  const iso = normalizeDateKey(text);
  if (iso) return qianaiDateLabel(iso);
  const zh = text.match(/(?:(\d{4})[年.])?(\d{1,2})月(\d{1,2})日?/);
  if (zh) {
    const year = zh[1] || beijingTodayKey().slice(0, 4);
    return qianaiDateLabel(formatDateKey(year, zh[2], zh[3]));
  }
  return text.replace(/\.0(\d)/g, '.$1');
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
    const orderNo = wxoFromText(row.orderNo) || wxoFromText(prev?.orderNo) || '';
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
  summary.getCell('C5').value = formulaCell(
    `${preview.offlineInhouse}+${preview.offlineOutdoor}+C3`,
    preview.todayTotal
  );
  summary.getCell('C6').value = formulaCell(
    `C3+${money(qianaiMonth - preview.qianaiAddonTotal)}`,
    qianaiMonth
  );
  summary.getCell('C7').value = formulaCell(
    `${preview.offlineInhouse}+${preview.offlineOutdoor}+${money(offlineMonth - preview.offlineTotal)}`,
    offlineMonth
  );
  summary.getCell('C8').value = formulaCell(
    `C5+${money(yearTotal - preview.todayTotal)}`,
    yearTotal
  );
}

function writeDailySheet(workbook, sheetName, previewRows, dateKey, dateCol, nameCol, columns, valuesOf) {
  let ws = workbook.getWorksheet(sheetName);
  if (!ws) {
    ws = workbook.addWorksheet(sheetName);
    ws.getRow(1).values = columns;
  }
  const dateLabel = qianaiDateLabel(dateKey);
  const styleRow = ws.getRow(Math.max(2, lastFilledRow(ws, nameCol)));
  for (let row = ws.rowCount; row >= 2; row -= 1) {
    const dateValue = qianaiDateOf(ws.getRow(row).getCell(dateCol));
    const name = String(ws.getRow(row).getCell(nameCol).value || '').trim();
    if (!name && !String(ws.getRow(row).getCell(1).value || '').trim()) {
      ws.spliceRows(row, 1);
      continue;
    }
    if (dateValue === dateLabel) ws.spliceRows(row, 1);
  }
  previewRows.forEach((row, index) => {
    const excelRow = ws.addRow([]);
    copyRowLook(styleRow, excelRow, columns.length);
    valuesOf(row, index + 1, excelRow.number).forEach((value, col) => {
      excelRow.getCell(col + 1).value = value;
    });
  });
}

function writeHealthSheet(workbook, preview) {
  writeDailySheet(
    workbook,
    'Sheet1',
    preview.health,
    preview.dateKey,
    9,
    3,
    ['序号', 'ID号码', '姓名', '性别', '民族', '从业地点', '身份证号', '电话', '体检日期', '报错', '备注'],
    (row, seq, excelRow) => [
      seq,
      row.id,
      row.name,
      row.gender,
      row.nation,
      row.place,
      row.idCard,
      row.phone,
      row.date,
      formulaCell(`IF(IF(MOD(MID(G${excelRow},17,1),2),"男","女")=D${excelRow},"对","错")`),
      ''
    ]
  );
}

function writeOnboardSheet(workbook, preview) {
  const name = workbook.getWorksheet('1.1') ? '1.1' : (workbook.worksheets[0]?.name || '1.1');
  writeDailySheet(
    workbook,
    name,
    preview.onboard,
    preview.dateKey,
    7,
    3,
    ['序号', 'ID号码', '姓名', '性别', '民族', '身份证号', '体检日期'],
    (row, seq) => [seq, row.id, row.name, row.gender, row.nation, row.idCard, row.date]
  );
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLater(url);
}

async function downloadWorkbook(kind) {
  if (!state.preview) return;
  if (typeof ExcelJS === 'undefined') {
    setStatus('Excel 导出组件未加载，请刷新后重试。', false);
    return;
  }
  const preview = state.preview;
  const workbook = new ExcelJS.Workbook();
  if (kind === 'addon') {
    if (state.existingAddon) await workbook.xlsx.load(state.existingAddon.slice(0));
    fillAddonSheet(workbook, preview);
    await embedAddonChart(workbook, preview);
    triggerDownload(await workbook.xlsx.writeBuffer(), state.existingAddonName || `加项汇总表_${sheetNameForDate(preview.dateKey)}.xlsx`);
    return;
  }
  if (kind === 'qianai') {
    if (state.existingQianai) await workbook.xlsx.load(state.existingQianai.slice(0));
    writeQianaiSheets(workbook, preview);
    triggerDownload(await workbook.xlsx.writeBuffer(), state.existingQianaiName || `2026千爱体检登记表_${sheetNameForDate(preview.dateKey)}.xlsx`);
    return;
  }
  if (kind === 'health') {
    if (state.existingHealth) await workbook.xlsx.load(state.existingHealth.slice(0));
    writeHealthSheet(workbook, preview);
    triggerDownload(await workbook.xlsx.writeBuffer(), state.existingHealthName || `健康证_${sheetNameForDate(preview.dateKey)}.xlsx`);
    return;
  }
  if (kind === 'onboard') {
    if (state.existingOnboard) await workbook.xlsx.load(state.existingOnboard.slice(0));
    writeOnboardSheet(workbook, preview);
    triggerDownload(await workbook.xlsx.writeBuffer(), state.existingOnboardName || `入职体检_${sheetNameForDate(preview.dateKey)}.xlsx`);
  }
}

async function downloadBoth() {
  const jobs = ['addon'];
  if (state.checkoutRows.length) jobs.push('qianai', 'health', 'onboard');
  for (const kind of jobs) {
    await downloadWorkbook(kind);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (state.preview?.addon?.length) {
    await downloadReportPng('table');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await downloadReportPng('chart');
  }
}

function bindDropzone(zoneId, inputId, hintedKind) {
  const zone = $(zoneId);
  const input = $(inputId);
  const run = async (file) => {
    try {
      await ingestFile(file, hintedKind);
    } catch (error) {
      setStatus(error.message, false);
    }
  };
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', async (event) => {
    event.preventDefault();
    zone.classList.remove('is-over');
    const files = [...event.dataTransfer.files];
    for (const file of files) await run(file);
  });
  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await run(file);
  });
}

function init() {
  bindDropzone('checkoutZone', 'checkoutInput', 'checkout');
  bindDropzone('addonListZone', 'addonListInput', 'addonList');
  bindDropzone('addonZone', 'addonInput', 'addonTpl');
  bindDropzone('qianaiZone', 'qianaiInput', 'qianai');
  bindDropzone('healthZone', 'healthInput', 'health');
  bindDropzone('onboardZone', 'onboardInput', 'onboard');
  $('dateSelect').addEventListener('change', (event) => {
    state.selectedDate = event.target.value;
    refreshPreview();
  });
  $('includeFrontRecommend').addEventListener('change', (event) => {
    state.includeFrontRecommend = event.target.checked;
    refreshPreview();
  });
  $('includeDoctorId').addEventListener('change', (event) => {
    state.includeDoctorId = event.target.checked;
    refreshPreview();
  });
  $('includeHealthCert').addEventListener('change', (event) => {
    state.includeHealthCert = event.target.checked;
    refreshPreview();
  });
  $('tab-addon').addEventListener('click', () => showTab('addon'));
  $('tab-images').addEventListener('click', () => showTab('images'));
  $('tab-qianai').addEventListener('click', () => showTab('qianai'));
  $('tab-health').addEventListener('click', () => showTab('health'));
  $('tab-onboard').addEventListener('click', () => showTab('onboard'));
  $('tab-issues').addEventListener('click', () => showTab('issues'));
  $('downloadAddonBtn').addEventListener('click', () => downloadWorkbook('addon'));
  $('downloadQianaiBtn').addEventListener('click', () => downloadWorkbook('qianai'));
  $('downloadHealthBtn').addEventListener('click', () => downloadWorkbook('health'));
  $('downloadOnboardBtn').addEventListener('click', () => downloadWorkbook('onboard'));
  $('downloadBothBtn').addEventListener('click', () => downloadBoth());
  $('downloadTablePngBtn').addEventListener('click', () => downloadReportPng('table'));
  $('downloadChartPngBtn').addEventListener('click', () => downloadReportPng('chart'));
}

init();
