'use strict';

const CLINICAL_HINTS = [
  '彩超', '甲功', 'HPV', 'TCT', '核磁', 'CT', '抗原', 'PSA', '白带', '心电图',
  '胃肠', '甲状腺', '颈动脉', '动脉硬化', '幽门', '分型', '血脂', '血糖', '肾功', '肝功',
  '激素', '风湿', '同型', '心肌', '液基', '妇科', '阴超', '抽血', '胃功', '心脏',
  '腰椎', '颈椎', '前列腺', '糖链', 'CA125', 'CA153', 'CA19', '癌胚', '骨密度',
  '无痛', '碳13', '碳14', 'C13', 'C14', '血常规', '尿常规', '便常规', '肝肾',
  '糖化', '胰岛素', '性激素', '维生素', '微量', '过敏', '钼靶', '宫颈', '分泌物',
  '支原体', '衣原体', '胸部', '血流', '转氨酶', '肌酐', '尿素', '尿酸', 'HCY',
  '定量', '酶谱', '半胱', '胃蛋白酶', '呼吸', '肺功能', '眼底', '人体成分'
];

const state = {
  checkoutRows: [],
  dates: [],
  selectedDate: '',
  includeHealthCert: false,
  existingAddon: null,
  existingQianai: null,
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

function money(value) {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
}

function isPackageToken(name) {
  const text = String(name || '');
  if (!text) return true;
  if (/加项包|专项体检|健康证|电力外检|普惠基础|营养小屋/.test(text)) return true;
  if (/套餐/.test(text)) return true;
  if (/^\d{2}.+-/.test(text)) return true;
  return false;
}

function isClinicalItem(name) {
  const text = String(name || '');
  if (!text || isPackageToken(text) || /胶片/.test(text)) return false;
  return CLINICAL_HINTS.some((hint) => text.includes(hint));
}

function shouldKeepAsAddon(items, amount) {
  const clinical = items.filter(isClinicalItem);
  const packageCount = items.filter(isPackageToken).length;
  if (!clinical.length || !(amount > 0)) return false;
  if (packageCount) return amount < 500;
  if (clinical.length >= 4 && amount >= 400) return false;
  return true;
}

function splitChargeItems(charge) {
  return String(charge || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikePackageRow(items, amount) {
  const clinical = items.filter(isClinicalItem);
  if (clinical.length === 0) return true;
  return !shouldKeepAsAddon(items, amount);
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

function salesmanOf(row) {
  return String(row['业务经理'] || '').trim()
    || String(row['名单备注'] || '').trim()
    || String(row['前台备注'] || '').trim()
    || String(row['健康顾问'] || '').trim();
}

function packageLabel(items, charge) {
  const packages = items.filter((item) => !isClinicalItem(item));
  const text = packages[0] || String(charge || '');
  if (/健康证/.test(text)) return '健康证';
  if (/618/.test(text)) return '2026年618';
  return text.replace(/^\d{2}/, '').slice(0, 24);
}

function isQianaiRow(row) {
  const blob = `${row['所属单位'] || ''} ${row['订单名称'] || ''} ${row['收费项目'] || ''}`;
  return /千爱/.test(blob);
}

function isCancelled(row) {
  return String(row['状态'] || '').includes('取消');
}

function isReportFee(row) {
  const person = String(row['体检人'] || '');
  const charge = String(row['收费项目'] || '');
  return person === '报告费' || charge === '总检' || /测试/.test(person);
}

function buildPreview(rows, dateKey, includeHealthCert) {
  const sameDay = rows.filter((row) => checkoutDateKey(row) === dateKey);
  const dayRows = netCheckoutRows(sameDay.filter((row) => !isCancelled(row) && !isReportFee(row)));

  const inhouse = [];
  const outdoor = [];
  const qianai = [];

  dayRows.forEach((row) => {
    const items = splitChargeItems(row['收费项目']);
    const amount = money(row['结账总金额']);
    const clinical = items.filter(isClinicalItem);
    const type = String(row['体检类型'] || '');
    const outdoorFlag = type === '外检';
    const qianaiFlag = isQianaiRow(row);
    const healthCert = items.some((item) => item.includes('健康证')) || type === '健康证';

    if (qianaiFlag || (includeHealthCert && healthCert)) {
      if (looksLikePackageRow(items, amount) || healthCert) {
        qianai.push({
          date: dateKey,
          name: row['体检人'] || '',
          orderNo: row['订单号'] || '',
          qty: 1,
          packageName: packageLabel(items, row['收费项目']),
          amount,
          salesman: salesmanOf(row),
          note: outdoorFlag ? '外检' : ''
        });
      } else if (clinical.length) {
        const share = money(amount / clinical.length);
        clinical.forEach((item) => {
          qianai.push({
            date: dateKey,
            name: row['体检人'] || '',
            orderNo: row['订单号'] || '',
            qty: 1,
            packageName: item,
            amount: share,
            salesman: salesmanOf(row),
            note: outdoorFlag ? '外检加项' : '加项'
          });
        });
      }
    }

    if (!shouldKeepAsAddon(items, amount) || !clinical.length) return;

    const share = money(amount / clinical.length);
    const doctorHint = String(row['健康顾问'] || '').trim();
    clinical.forEach((item) => {
      const record = {
        name: row['体检人'] || '',
        gender: row['性别'] || '',
        unit: row['所属单位'] || '',
        id: String(row['预约单号'] || row['交易批次号'] || ''),
        datetime: formatClock(row['操作时间'] || row['登记时间']),
        item,
        doctor: '',
        doctorHint,
        operator: row['结账人'] || '',
        amount: share,
        type: outdoorFlag ? '外检' : '院内'
      };
      if (outdoorFlag) outdoor.push(record);
      else inhouse.push(record);
    });
  });

  const inhouseTotal = money(inhouse.reduce((sum, row) => sum + row.amount, 0));
  const outdoorTotal = money(outdoor.reduce((sum, row) => sum + row.amount, 0));
  const qianaiAddonTotal = money(qianai.filter((row) => row.note.includes('加项')).reduce((sum, row) => sum + row.amount, 0));
  const qianaiVisitTotal = money(qianai.reduce((sum, row) => sum + row.amount, 0));

  inhouse.sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
  outdoor.sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));

  return {
    dateKey,
    checkoutCount: sameDay.length,
    inhouse,
    outdoor,
    qianai,
    inhouseTotal,
    outdoorTotal,
    qianaiAddonTotal,
    qianaiVisitTotal,
    todayTotal: money(inhouseTotal + outdoorTotal + qianaiAddonTotal)
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
  ['inhouse', 'outdoor', 'qianai'].forEach((id) => {
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
  $('dayBanner').textContent = `只含 ${displayDate(preview.dateKey)}（按结账「操作时间」），当天结账 ${preview.checkoutCount} 笔。不是多日合计。`;
  $('statInhouse').textContent = `¥${preview.inhouseTotal}`;
  $('statOutdoor').textContent = `¥${preview.outdoorTotal}`;
  $('statQianai').textContent = `¥${preview.qianaiVisitTotal}`;
  $('statToday').textContent = `¥${preview.todayTotal}`;
  $('countInhouse').textContent = `${preview.inhouse.length} 条明细`;
  $('countOutdoor').textContent = `${preview.outdoor.length} 条明细`;
  $('countQianai').textContent = `${preview.qianai.length} 条明细`;

  renderTable('panel-inhouse', preview.inhouse, [
    { label: '结账时间', value: (row) => row.datetime },
    { label: '姓名', value: (row) => row.name },
    { label: '单位', value: (row) => row.unit },
    { label: '所加项目', value: (row) => row.item },
    { label: '金额', value: (row) => row.amount },
    { label: '加项医生', value: (row) => row.doctor || '待补' },
    { label: '参考顾问', value: (row) => row.doctorHint },
    { label: '结账人', value: (row) => row.operator }
  ]);
  renderTable('panel-outdoor', preview.outdoor, [
    { label: '结账时间', value: (row) => row.datetime },
    { label: '姓名', value: (row) => row.name },
    { label: '单位', value: (row) => row.unit },
    { label: '所加项目', value: (row) => row.item },
    { label: '金额', value: (row) => row.amount },
    { label: '参考顾问', value: (row) => row.doctorHint }
  ]);
  renderTable('panel-qianai', preview.qianai, [
    { label: '姓名', value: (row) => row.name },
    { label: '套餐/项目', value: (row) => row.packageName },
    { label: '金额', value: (row) => row.amount },
    { label: '业务员', value: (row) => row.salesman },
    { label: '备注', value: (row) => row.note }
  ]);
  $('previewSection').hidden = false;
  $('downloadAddonBtn').disabled = false;
  $('downloadQianaiBtn').disabled = false;
  setStatus(`已列出 ${displayDate(preview.dateKey)} 明细。换日期会整表重算，不会把几天加在一起。`, true);
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

function styleTitle(row) {
  row.font = { name: '微软雅黑', size: 14, bold: true };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3E8D8' }
  };
}

function writeAddonSheet(workbook, preview) {
  const sheetName = sheetNameForDate(preview.dateKey);
  const old = workbook.getWorksheet(sheetName);
  if (old) workbook.removeWorksheet(old.id);
  const ws = workbook.addWorksheet(sheetName);
  const title = `定西美年大健康${sheetName}加项汇总表`;
  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = title;
  styleTitle(ws.getRow(1));
  const headers = ['序号', '姓名', '性别', '单位', 'ID号', '加项日期', '所加项目', '加项医生', '最终价'];
  ws.getRow(2).values = headers;
  ws.getRow(2).font = { bold: true };
  preview.inhouse.forEach((row, index) => {
    ws.addRow([
      index + 1,
      row.name,
      row.gender,
      row.unit,
      row.id,
      row.datetime,
      row.item,
      row.doctor,
      row.amount
    ]);
  });
  const totalRow = ws.addRow(['合计', '', '', '', '', '', '', '', preview.inhouseTotal]);
  ws.mergeCells(`A${totalRow.number}:G${totalRow.number}`);
  const monthSheets = workbook.worksheets.filter((sheet) => /^\d+\.\d+$/.test(sheet.name));
  const monthTotal = monthSheets.reduce((sum, sheet) => {
    const last = sheet.getRow(sheet.rowCount);
    const label = String(last.getCell(1).value || '');
    if (label.includes('累计')) {
      const prev = sheet.getRow(sheet.rowCount - 1);
      return sum + (Number(prev.getCell(9).value) || 0);
    }
    if (label.includes('合计')) return sum + (Number(last.getCell(9).value) || 0);
    return sum;
  }, 0);
  const monthRow = ws.addRow([`${Number(preview.dateKey.slice(5, 7))}月累计`, '', '', '', '', '', '', '', money(monthTotal)]);
  ws.mergeCells(`A${monthRow.number}:G${monthRow.number}`);
  ws.columns = [
    { width: 8 }, { width: 10 }, { width: 8 }, { width: 28 }, { width: 22 },
    { width: 22 }, { width: 28 }, { width: 16 }, { width: 10 }
  ];
}

function qianaiDateLabel(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number);
  return `2026.${month}.${day}`;
}

function writeQianaiSheets(workbook, preview) {
  let ws = workbook.getWorksheet('千爱');
  if (!ws) {
    ws = workbook.addWorksheet('千爱');
    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = '2026年千爱客服部体检登记明细';
    ws.getRow(2).values = ['序号', '体检日期', '姓名', '订单编号', '数量', '体检套餐', '', '业务员'];
  }
  const dateLabel = qianaiDateLabel(preview.dateKey);
  for (let row = ws.rowCount; row >= 3; row -= 1) {
    const cellDate = String(ws.getRow(row).getCell(2).value || '');
    const normalized = cellDate.replace(/\.0(\d)/g, '.$1');
    if (normalized === dateLabel || cellDate === dateLabel) ws.spliceRows(row, 1);
  }
  preview.qianai.forEach((row, index) => {
    ws.addRow([index + 1, dateLabel, row.name, row.orderNo, row.qty, row.packageName, row.amount, row.salesman, row.note]);
  });

  let summary = workbook.getWorksheet('Sheet1');
  if (!summary) summary = workbook.addWorksheet('Sheet1');
  summary.mergeCells('A1:C1');
  summary.getCell('A1').value = '加项统计';
  summary.getCell('A2').value = `时间:${displayDate(preview.dateKey)}`;
  summary.getCell('C2').value = '金额';
  summary.getCell('A3').value = '千爱加项';
  summary.getCell('C3').value = preview.qianaiAddonTotal;
  summary.getCell('A4').value = '线下加项';
  summary.getCell('C4').value = `${preview.inhouseTotal}（店内）+${preview.outdoorTotal}（外检）`;
  summary.getCell('A5').value = '今日加项合计';
  summary.getCell('C5').value = preview.todayTotal;
}

async function downloadWorkbook(kind) {
  if (!state.preview) return;
  if (typeof ExcelJS === 'undefined') {
    setStatus('Excel 导出组件未加载，请刷新后重试。', false);
    return;
  }
  const workbook = new ExcelJS.Workbook();
  if (kind === 'addon') {
    if (state.existingAddon) await workbook.xlsx.load(state.existingAddon.slice(0));
    writeAddonSheet(workbook, state.preview);
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, `加项汇总表_${sheetNameForDate(state.preview.dateKey)}.xlsx`);
    return;
  }
  if (state.existingQianai) await workbook.xlsx.load(state.existingQianai.slice(0));
  writeQianaiSheets(workbook, state.preview);
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `2026千爱体检登记表_${sheetNameForDate(state.preview.dateKey)}.xlsx`);
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
    state.existingAddon = await file.arrayBuffer();
    setFilename('addonName', file);
    setStatus('已载入现有加项汇总，下载时会写入/覆盖当日工作表。', true);
  });
  bindDropzone('qianaiZone', 'qianaiInput', async (file) => {
    state.existingQianai = await file.arrayBuffer();
    setFilename('qianaiName', file);
    setStatus('已载入现有千爱登记表，下载时会替换当日行并更新加项统计。', true);
  });
  $('dateSelect').addEventListener('change', (event) => {
    state.selectedDate = event.target.value;
    refreshPreview();
  });
  $('includeHealthCert').addEventListener('change', (event) => {
    state.includeHealthCert = event.target.checked;
    refreshPreview();
  });
  $('tab-inhouse').addEventListener('click', () => showTab('inhouse'));
  $('tab-outdoor').addEventListener('click', () => showTab('outdoor'));
  $('tab-qianai').addEventListener('click', () => showTab('qianai'));
  $('downloadAddonBtn').addEventListener('click', () => downloadWorkbook('addon'));
  $('downloadQianaiBtn').addEventListener('click', () => downloadWorkbook('qianai'));
}

init();
