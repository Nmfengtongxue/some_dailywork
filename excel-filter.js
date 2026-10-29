const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileName = document.getElementById('fileName');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const filterSection = document.getElementById('filterSection');
const columnSelect = document.getElementById('columnSelect');
const keywordsInput = document.getElementById('keywordsInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const resultSection = document.getElementById('resultSection');
const resultsContainer = document.getElementById('resultsContainer');
const totalAmount = document.getElementById('totalAmount');
const dataTableSection = document.getElementById('dataTableSection');
const tableBody = document.getElementById('tableBody');
const noDataMessage = document.getElementById('noDataMessage');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const copyableResults = document.getElementById('copyableResults');
const resultsText = document.getElementById('resultsText');
const copyTextBtn = document.getElementById('copyTextBtn');
const copyToast = document.getElementById('copyToast');
const copyToastText = document.getElementById('copyToastText');
const dayFilterSection = document.getElementById('dayFilterSection');
const dayFilterList = document.getElementById('dayFilterList');
const dayFilterMeta = document.getElementById('dayFilterMeta');

let copyToastTimer = null;
const keywordDisplayMap = {
    公司药房: '公司药房（西药房）',
    中药房: '中药房（中医）',
    散户: '散户（传统个检）'
};
const keywordIcons = [
    'fa-globe-asia',
    'fa-shopping-bag',
    'fa-heart',
    'fa-prescription-bottle',
    'fa-store',
    'fa-building',
    'fa-user-tie',
    'fa-hospital'
];
const preferredDateColumns = ['操作时间', '登记时间', '结账时间', '付款时间', '交易时间', '创建时间'];

let excelData = null;
let columnHeaders = [];
let selectedColumn = '';
let keywords = [];
let allFilteredItems = [];
let keywordResults = {};
let dailySummaries = [];
let activeKeyword = '';
let activeDates = [];
let xlsxLoadPromise = null;

function ensureXlsxLoaded() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;

    xlsxLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'assets/vendor/xlsx.full.min.js';
        script.async = true;
        script.addEventListener('load', () => {
            if (window.XLSX) {
                resolve(window.XLSX);
                return;
            }
            xlsxLoadPromise = null;
            reject(new Error('Excel 解析组件初始化失败，请刷新页面后重试'));
        }, { once: true });
        script.addEventListener('error', () => {
            xlsxLoadPromise = null;
            script.remove();
            reject(new Error('Excel 解析组件加载失败，请刷新页面后重试'));
        }, { once: true });
        document.head.appendChild(script);
    });

    return xlsxLoadPromise;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

    if (typeof value === 'number' && value > 20000 && value < 80000 && typeof XLSX !== 'undefined' && XLSX.SSF?.parse_date_code) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) return formatDateKey(parsed.y, parsed.m, parsed.d);
    }

    const text = String(value).trim();
    const match = text.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
    if (match) return formatDateKey(match[1], match[2], match[3]);
    return '';
}

function getDateColumnNames() {
    const names = columnHeaders.map((header) => header.name);
    const preferred = preferredDateColumns.filter((name) => names.includes(name));
    const extras = names.filter((name) => /时间|日期/.test(name) && !preferred.includes(name));
    return [...preferred, ...extras];
}

function extractRowDate(row) {
    for (const name of getDateColumnNames()) {
        const dateKey = normalizeDateKey(row[name]);
        if (dateKey) return dateKey;
    }
    return '';
}

function weekdayLabel(dateKey) {
    const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}

function formatDisplayDate(dateKey) {
    const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dateKey || '未识别日期';
    return `${Number(match[2])}月${Number(match[3])}日`;
}

function isAllDatesSelected() {
    return activeDates.length === 0;
}

function isDateSelected(dateKey) {
    if (isAllDatesSelected()) return dateKey === '';
    return activeDates.includes(dateKey);
}

function sortDateKeys(keys) {
    return [...keys].sort((left, right) => {
        if (left === '__unknown__') return 1;
        if (right === '__unknown__') return -1;
        return left.localeCompare(right);
    });
}

function formatDateList(keys = activeDates) {
    return keys.map((key) => (key === '__unknown__' ? '未识别日期' : formatDisplayDate(key))).join('、');
}

function matchesDate(item, dateKeys = activeDates) {
    if (!dateKeys.length) return true;
    if (!item.dateKey) return dateKeys.includes('__unknown__');
    return dateKeys.includes(item.dateKey);
}

function getScopedItems(dateKeys = activeDates, keyword = '') {
    return allFilteredItems.filter((item) => {
        if (!matchesDate(item, dateKeys)) return false;
        if (keyword && item.keyword !== keyword) return false;
        return true;
    });
}

function buildKeywordResults(items) {
    const next = {};
    keywords.forEach((keyword) => {
        next[keyword] = { name: keyword, total: 0, count: 0, items: [] };
    });
    items.forEach((item) => {
        const bucket = next[item.keyword];
        if (!bucket) return;
        bucket.total += item.totalAmount;
        bucket.count += 1;
        bucket.items.push(item);
    });
    return next;
}

function refreshScopedResults() {
    keywordResults = buildKeywordResults(getScopedItems());
    updateDayFilter();
    updateResultCards();
    updateDataTable(activeKeyword);
}

uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.style.borderColor = '#2575fc';
    uploadArea.style.backgroundColor = '#f0ebff';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#6a11cb';
    uploadArea.style.backgroundColor = '#f9f7ff';
});

uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.style.borderColor = '#6a11cb';
    uploadArea.style.backgroundColor = '#f9f7ff';
    if (event.dataTransfer.files.length) {
        fileInput.files = event.dataTransfer.files;
        handleFileUpload(event.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (event) => {
    if (event.target.files.length) handleFileUpload(event.target.files[0]);
});

async function handleFileUpload(file) {
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/)) {
        showError('请上传有效的Excel文件 (.xls 或 .xlsx 格式)');
        return;
    }

    fileName.textContent = `已选择文件: ${file.name}`;
    fileName.style.color = '#6a11cb';
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
        await ensureXlsxLoaded();
    } catch (error) {
        showError(error.message);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const bytes = new Uint8Array(event.target.result);
            const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
            processExcelData(workbook, file.name);
        } catch (error) {
            showError(`解析Excel文件时出错: ${error.message}`);
        } finally {
            loading.style.display = 'none';
        }
    };
    reader.onerror = function () {
        showError('读取文件时出错，请重试');
        loading.style.display = 'none';
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(workbook, uploadedName) {
    try {
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        if (rows.length < 2) {
            showError('Excel文件中没有数据或格式不正确');
            return;
        }

        let headerIndex = -1;
        let headerRow = [];
        for (let index = 0; index < Math.min(rows.length, 5); index += 1) {
            const row = rows[index];
            if (Array.isArray(row) && row.length > 0) {
                const filled = row.filter((cell) => cell && String(cell).trim() !== '');
                if (filled.length >= 3) {
                    headerIndex = index;
                    headerRow = row;
                    break;
                }
            }
        }

        if (headerIndex === -1) {
            showError('未找到有效的表头行，请确认Excel格式是否正确');
            return;
        }

        columnHeaders = [];
        headerRow.forEach((cell, index) => {
            if (cell && String(cell).trim() !== '') {
                columnHeaders.push({ index, name: String(cell).trim() });
            }
        });

        const dataRows = [];
        for (let index = headerIndex + 1; index < rows.length; index += 1) {
            const row = rows[index];
            if (row && row.length > 0) {
                const record = {};
                columnHeaders.forEach((header) => {
                    record[header.name] = row[header.index] ?? '';
                });
                dataRows.push(record);
            }
        }

        excelData = {
            fileName: uploadedName,
            headerRow,
            columnHeaders,
            dataRows
        };

        resetScopedState();
        filterSection.style.display = 'block';
        populateColumnSelector();
        setDefaultKeywords();
        showSuccess(`Excel文件 "${uploadedName}" 加载成功！共找到 ${dataRows.length} 行数据，${columnHeaders.length} 个列。`);
        errorMessage.style.display = 'none';
    } catch (error) {
        showError(`处理Excel数据时出错: ${error.message}`);
    }
}

function populateColumnSelector() {
    columnSelect.innerHTML = '<option value="">请选择要筛选的列</option>';
    columnHeaders.forEach((header) => {
        const option = document.createElement('option');
        option.value = header.name;
        option.textContent = header.name;
        columnSelect.appendChild(option);
    });

    let defaultColumn = columnHeaders.find((header) => header.name === '订单名称');
    if (!defaultColumn) {
        defaultColumn = columnHeaders.find((header) => header.name.includes('订单') || header.name.includes('名称'));
    }
    if (defaultColumn) columnSelect.value = defaultColumn.name;
}

function setDefaultKeywords() {
    keywordsInput.value = '全国\n美团\n千爱\n中药房\n公司药房\n散户';
}

analyzeBtn.addEventListener('click', performAnalysis);
resetBtn.addEventListener('click', resetAnalysis);
copyResultsBtn.addEventListener('click', copyResultsToClipboard);
copyTextBtn.addEventListener('click', copyTextToClipboard);

function performAnalysis() {
    if (!excelData) {
        showError('请先上传Excel文件');
        return;
    }

    selectedColumn = columnSelect.value;
    if (!selectedColumn) {
        showError('请选择要筛选的列');
        return;
    }

    const rawKeywords = keywordsInput.value.trim();
    if (!rawKeywords) {
        showError('请输入至少一个关键词');
        return;
    }

    keywords = rawKeywords.split('\n').map((item) => item.trim()).filter((item) => item !== '');
    if (keywords.length === 0) {
        showError('请输入有效的关键词');
        return;
    }

    loading.style.display = 'block';
    setTimeout(() => {
        try {
            filterDataByKeywords();
            resultSection.style.display = 'block';
            dataTableSection.style.display = 'block';
            const days = dailySummaries.filter((item) => item.dateKey);
            const dayHint = days.length > 1
                ? `覆盖 ${days.length} 天（${days[0].dateKey} 至 ${days[days.length - 1].dateKey}）`
                : days.length === 1
                    ? `日期 ${days[0].dateKey}`
                    : '未识别到日期列';
            showSuccess(`筛选完成！共找到 ${allFilteredItems.length} 个匹配订单，总金额 ${calculateTotalAmount().toFixed(2)} 元。${dayHint}。`);
            loading.style.display = 'none';
            errorMessage.style.display = 'none';
            noDataMessage.style.display = 'none';
        } catch (error) {
            showError(`筛选数据时出错: ${error.message}`);
            loading.style.display = 'none';
        }
    }, 500);
}

function extractAmount(row) {
    const amountColumns = ['结账总金额', '金额', '总金额', '结账金额'];
    for (const name of amountColumns) {
        if (row[name] !== undefined && row[name] !== '') {
            const amount = parseFloat(row[name]);
            if (!Number.isNaN(amount)) return amount;
        }
    }
    for (const name in row) {
        const amount = parseFloat(row[name]);
        if (!Number.isNaN(amount) && Math.abs(amount) < 100000) return amount;
    }
    return 0;
}

function filterDataByKeywords() {
    allFilteredItems = [];
    activeKeyword = '';
    activeDates = [];

    excelData.dataRows.forEach((row) => {
        const cell = row[selectedColumn] ? String(row[selectedColumn]) : '';
        for (const keyword of keywords) {
            if (!cell.includes(keyword)) continue;
            const amount = extractAmount(row);
            allFilteredItems.push({
                orderName: row[selectedColumn] || '',
                originalPrice: row['原价'] || '',
                totalAmount: amount,
                keyword,
                person: row['体检人'] || row['姓名'] || '',
                unit: row['所属单位'] || row['单位'] || '',
                dateKey: extractRowDate(row),
                rowData: row
            });
            break;
        }
    });

    buildDailySummaries();
    refreshScopedResults();
}

function buildDailySummaries() {
    const grouped = new Map();
    allFilteredItems.forEach((item) => {
        const key = item.dateKey || '';
        if (!grouped.has(key)) grouped.set(key, { dateKey: key, total: 0, count: 0 });
        const bucket = grouped.get(key);
        bucket.total += item.totalAmount;
        bucket.count += 1;
    });

    dailySummaries = [...grouped.values()].sort((left, right) => {
        if (!left.dateKey) return 1;
        if (!right.dateKey) return -1;
        return left.dateKey.localeCompare(right.dateKey);
    });
}

function calculateTotalAmount(items = getScopedItems()) {
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
}

function updateDayFilter() {
    if (!dayFilterSection || !dayFilterList) return;

    const knownDays = dailySummaries.filter((item) => item.dateKey);
    if (!knownDays.length) {
        dayFilterSection.hidden = true;
        dayFilterList.innerHTML = '';
        return;
    }

    dayFilterSection.hidden = false;
    dayFilterList.innerHTML = '';

    const allCount = allFilteredItems.length;
    const allTotal = allFilteredItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const chips = [
        { dateKey: '', label: '全部日期', count: allCount, total: allTotal, extra: `${knownDays.length} 天` }
    ];

    knownDays.forEach((day) => {
        chips.push({
            dateKey: day.dateKey,
            label: formatDisplayDate(day.dateKey),
            count: day.count,
            total: day.total,
            extra: weekdayLabel(day.dateKey)
        });
    });

    const unknown = dailySummaries.find((item) => !item.dateKey);
    if (unknown) {
        chips.push({
            dateKey: '__unknown__',
            label: '未识别日期',
            count: unknown.count,
            total: unknown.total,
            extra: ''
        });
    }

    chips.forEach((chip) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'day-chip';
        button.dataset.date = chip.dateKey;
        button.setAttribute('aria-pressed', isDateSelected(chip.dateKey) ? 'true' : 'false');
        if (isDateSelected(chip.dateKey)) button.classList.add('active');
        if (activeDates.length > 1 && chip.dateKey) button.classList.add('day-chip--multi');
        button.innerHTML = `
            <span class="day-chip__label">${escapeHtml(chip.label)}</span>
            <span class="day-chip__meta">${chip.extra ? `${escapeHtml(chip.extra)} · ` : ''}${chip.count} 单</span>
            <span class="day-chip__amount">¥${chip.total.toFixed(2)}</span>
        `;
        button.addEventListener('mousedown', (event) => {
            if (event.shiftKey) event.preventDefault();
        });
        button.addEventListener('click', (event) => selectDate(chip.dateKey, event));
        dayFilterList.appendChild(button);
    });

    updateDayFilterMeta(knownDays, allCount, allTotal);
}

function updateDayFilterMeta(knownDays, allCount, allTotal) {
    const scoped = getScopedItems();
    const scopedCount = scoped.length;
    const scopedTotal = scoped.reduce((sum, item) => sum + item.totalAmount, 0);
    const hint = document.getElementById('dayFilterHint');
    const totalTitle = document.getElementById('totalTitle');

    if (dayFilterMeta) {
        if (isAllDatesSelected()) {
            dayFilterMeta.textContent = `当前查看全部 ${knownDays.length} 天，共 ${allCount} 单，金额 ¥${allTotal.toFixed(2)}`;
        } else if (activeDates.length === 1) {
            dayFilterMeta.textContent = `当前查看 ${formatDateList()}，共 ${scopedCount} 单，金额 ¥${scopedTotal.toFixed(2)}`;
        } else {
            dayFilterMeta.textContent = `已多选 ${activeDates.length} 天（${formatDateList()}），合计 ${scopedCount} 单，金额 ¥${scopedTotal.toFixed(2)}`;
        }
    }

    if (hint) {
        hint.hidden = false;
        hint.textContent = isAllDatesSelected() || activeDates.length === 1
            ? '单击只看一天；按住 Shift 再点其他日期可多选，下方显示所选日期合计。'
            : `已按住 Shift 选中 ${activeDates.length} 天，下方卡片、合计和表格都是这几天的总和。`;
    }

    if (totalTitle) {
        totalTitle.textContent = isAllDatesSelected()
            ? '所有筛选订单总金额'
            : activeDates.length > 1
                ? `所选 ${activeDates.length} 天合计`
                : '当天订单总金额';
    }
}

function selectDate(dateKey, event) {
    const shiftMulti = Boolean(event?.shiftKey);
    if (!dateKey) {
        activeDates = [];
    } else if (shiftMulti) {
        if (isAllDatesSelected()) {
            activeDates = [dateKey];
        } else if (activeDates.includes(dateKey)) {
            activeDates = activeDates.filter((item) => item !== dateKey);
        } else {
            activeDates = sortDateKeys([...activeDates, dateKey]);
        }
    } else {
        activeDates = [dateKey];
    }

    activeKeyword = '';
    refreshScopedResults();

    if (activeDates.length > 1) {
        const scoped = getScopedItems();
        const total = scoped.reduce((sum, item) => sum + item.totalAmount, 0);
        showSuccess(`已多选 ${activeDates.length} 天（${formatDateList()}）。下方显示这几天合计：${scoped.length} 单，¥${total.toFixed(2)}。`);
    }
}

function getDisplayItems(keyword = activeKeyword) {
    return getScopedItems(activeDates, keyword);
}

function updateResultCards() {
    resultsContainer.innerHTML = '';
    const scopedItems = getDisplayItems('');
    const scopedResults = buildKeywordResults(scopedItems);
    keywordResults = scopedResults;

    let sum = 0;
    let count = 0;

    keywords.forEach((keyword) => {
        const result = scopedResults[keyword] || { total: 0, count: 0 };
        const amount = result.total || 0;
        const itemCount = result.count || 0;
        sum += amount;
        count += itemCount;

        const icon = keywordIcons[keywords.indexOf(keyword) % keywordIcons.length];
        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        if (activeKeyword === keyword) card.classList.add('active');
        card.dataset.keyword = keyword;
        const displayName = keywordDisplayMap[keyword] || keyword;
        card.innerHTML = `
            <div class="copy-indicator"><i class="fas fa-check"></i> 已复制</div>
            ${activeKeyword === keyword ? '<div class="active-indicator"><i class="fas fa-check-circle"></i></div>' : ''}
            <div class="result-keyword"><i class="fas ${icon}"></i> ${escapeHtml(displayName)}</div>
            <div class="result-amount">¥${amount.toFixed(2)}</div>
            <div class="result-count">${itemCount} 个订单</div>
        `;
        const activate = () => {
            filterTableByKeyword(keyword);
            copyCardResultToClipboard(card);
        };
        card.addEventListener('click', activate);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
            }
        });
        resultsContainer.appendChild(card);
    });

    const qianai = scopedResults['千爱'] || { total: 0, count: 0 };
    const walkin = scopedResults['散户'] || { total: 0, count: 0 };
    const tcm = scopedResults['中药房'] || { total: 0, count: 0 };
    const localTotal = qianai.total + walkin.total + tcm.total;
    const localCount = qianai.count + walkin.count + tcm.count;
    const localCard = document.createElement('div');
    localCard.className = 'result-card';
    localCard.dataset.keyword = '本地私域（千爱+传统个检+中药房）';
    localCard.innerHTML = `
        <div class="copy-indicator"><i class="fas fa-check"></i> 已复制</div>
        <div class="result-keyword"><i class="fas fa-home"></i> 本地私域（千爱+传统个检+中药房）</div>
        <div class="result-amount">¥${localTotal.toFixed(2)}</div>
        <div class="result-count">${localCount} 个订单</div>
    `;
    localCard.addEventListener('click', () => copyCardResultToClipboard(localCard));
    resultsContainer.appendChild(localCard);

    totalAmount.textContent = `¥${sum.toFixed(2)}`;
    updateCopyableResults(sum, count);
}

function filterTableByKeyword(keyword) {
    activeKeyword = keyword;
    document.querySelectorAll('.result-card').forEach((card) => {
        if (card.dataset.keyword === keyword) {
            card.classList.add('active');
            if (!card.querySelector('.active-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'active-indicator';
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                card.prepend(indicator);
            }
        } else {
            card.classList.remove('active');
            const indicator = card.querySelector('.active-indicator');
            if (indicator) indicator.remove();
        }
    });
    updateDataTable(keyword);
}

function updateDataTable(keyword = '') {
    tableBody.innerHTML = '';
    const items = getDisplayItems(keyword);

    if (items.length === 0) {
        const row = document.createElement('tr');
        const emptyText = keyword
            ? `没有找到关键词"${escapeHtml(keyword)}"的订单数据`
            : '没有找到匹配的订单数据';
        row.innerHTML = `<td colspan="7" style="text-align: center;">${emptyText}</td>`;
        tableBody.appendChild(row);
        return;
    }

    items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.dateKey ? `${formatDisplayDate(item.dateKey)} ${item.dateKey}` : '未识别')}</td>
            <td>${escapeHtml(item.orderName)}</td>
            <td>${escapeHtml(item.originalPrice)}</td>
            <td>${item.totalAmount.toFixed(2)}</td>
            <td>${escapeHtml(item.keyword)}</td>
            <td>${escapeHtml(item.person)}</td>
            <td>${escapeHtml(item.unit)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function getAmountTextFromCard(card) {
    const amountNode = card.querySelector('.result-amount');
    if (!amountNode) return '';
    return amountNode.textContent.replace(/[¥￥,\s]/g, '').trim();
}

function showCopyFeedback(card, amount) {
    if (card) {
        card.classList.add('copy-success');
        setTimeout(() => card.classList.remove('copy-success'), 2000);
    }
    if (copyToastTimer) clearTimeout(copyToastTimer);
    copyToastText.textContent = `已复制：${amount}`;
    copyToast.classList.add('show');
    copyToastTimer = setTimeout(() => {
        copyToast.classList.remove('show');
    }, 2000);
}

function copyCardResultToClipboard(card) {
    const amount = getAmountTextFromCard(card);
    if (!amount) {
        showError('未找到可复制的金额');
        return;
    }
    navigator.clipboard.writeText(amount)
        .then(() => showCopyFeedback(card, amount))
        .catch((error) => {
            console.error('复制失败: ', error);
            showError('复制失败，请手动选择并复制文本');
        });
}

function updateCopyableResults(sum, count) {
    let text = '';
    if (activeDates.length === 1) {
        text += activeDates[0] === '__unknown__'
            ? '未识别日期\n'
            : `${activeDates[0]} ${formatDisplayDate(activeDates[0])}\n`;
    } else if (activeDates.length > 1) {
        text += `多选 ${activeDates.length} 天：${activeDates.map((key) => (key === '__unknown__' ? '未识别日期' : `${key} ${formatDisplayDate(key)}`)).join('、')}\n`;
    }

    keywords.forEach((keyword) => {
        const result = keywordResults[keyword] || { total: 0, count: 0 };
        const displayName = keywordDisplayMap[keyword] || keyword;
        text += `${displayName}: ¥${(result.total || 0).toFixed(2)} (${result.count || 0}个订单)\n`;
    });

    const qianai = keywordResults['千爱'] || { total: 0, count: 0 };
    const walkin = keywordResults['散户'] || { total: 0, count: 0 };
    const tcm = keywordResults['中药房'] || { total: 0, count: 0 };
    const localTotal = qianai.total + walkin.total + tcm.total;
    const localCount = qianai.count + walkin.count + tcm.count;
    text += `本地私域（千爱+传统个检+中药房）: ¥${localTotal.toFixed(2)} (${localCount}个订单)\n`;
    text += `总计: ¥${sum.toFixed(2)} (${count}个订单)`;
    resultsText.textContent = text;
    copyableResults.style.display = 'block';
}

function copyResultsToClipboard() {
    const text = resultsText.textContent;
    navigator.clipboard.writeText(text)
        .then(() => {
            const previous = copyResultsBtn.innerHTML;
            copyResultsBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
            copyResultsBtn.style.background = '#2E7D32';
            setTimeout(() => {
                copyResultsBtn.innerHTML = previous;
                copyResultsBtn.style.background = '#2E7D32';
            }, 2000);
        })
        .catch((error) => {
            console.error('复制失败: ', error);
            alert('复制失败，请手动选择并复制文本');
        });
}

function copyTextToClipboard() {
    const text = resultsText.textContent;
    navigator.clipboard.writeText(text)
        .then(() => {
            const previous = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
            copyTextBtn.style.backgroundColor = '#2E7D32';
            setTimeout(() => {
                copyTextBtn.innerHTML = previous;
                copyTextBtn.style.backgroundColor = '#4CAF50';
            }, 2000);
        })
        .catch((error) => {
            console.error('复制失败: ', error);
            alert('复制失败，请手动选择并复制文本');
        });
}

function resetScopedState() {
    selectedColumn = '';
    keywords = [];
    keywordResults = {};
    allFilteredItems = [];
    dailySummaries = [];
    activeKeyword = '';
    activeDates = [];
}

function resetAnalysis() {
    resetScopedState();
    if (excelData) {
        populateColumnSelector();
        setDefaultKeywords();
    } else {
        columnSelect.value = '';
        keywordsInput.value = '';
    }
    resultSection.style.display = 'none';
    dataTableSection.style.display = 'none';
    copyableResults.style.display = 'none';
    noDataMessage.style.display = 'block';
    resultsContainer.innerHTML = '';
    totalAmount.textContent = '¥0.00';
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">请先上传Excel文件并开始筛选</td></tr>';
    if (dayFilterSection) dayFilterSection.hidden = true;
    if (dayFilterList) dayFilterList.innerHTML = '';
    if (excelData) showSuccess('筛选已重置，您可以重新设置筛选条件。');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    loading.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Excel动态关键词筛选分析工具已加载');
});
