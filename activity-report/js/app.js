/**
 * 618 活动业绩统计 — 主应用
 */
const App = {
  currentTab: 'report',
  reportDate: null,
  reportNameFilter: '',

  async init() {
    await Store.init();
    this.reportDate = Store.getReportDate();
    this.bindEvents();
    this.startBeijingClock();
    this.renderAll();
  },

  startBeijingClock() {
    const el = document.getElementById('bjClock');
    if (!el) return;
    const tick = () => { el.textContent = BeijingTime.clockText(); };
    tick();
    setInterval(tick, 1000);
  },

  bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    document.getElementById('btnExportImage').addEventListener('click', () => this.exportImage());
    document.getElementById('btnExportSvg').addEventListener('click', () => this.exportSvg());
    document.getElementById('btnExportExcel').addEventListener('click', () => this.exportExcel());
    document.getElementById('btnSyncExcel').addEventListener('click', () => this.syncToExcel());
    document.getElementById('btnExportJson').addEventListener('click', () => this.exportJson());
    document.getElementById('btnImportJson').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => this.importJson(e));
    document.getElementById('btnAddRecord').addEventListener('click', () => this.addRecord());
    document.getElementById('reportDate').addEventListener('change', (e) => {
      this.reportDate = e.target.value;
      this.renderReport();
      this.renderStats();
    });
    document.getElementById('logFilterDate').addEventListener('change', () => this.renderLog());
    document.getElementById('logFilterEmployee').addEventListener('change', () => this.renderLog());
    document.getElementById('btnSaveSnapshot').addEventListener('click', () => this.saveSnapshot());
    document.getElementById('btnReset').addEventListener('click', () => this.confirmReset());
    document.getElementById('btnAddEmployee').addEventListener('click', () => EmployeeManage.openModal('add'));
    document.getElementById('reportNameFilter').addEventListener('input', (e) => {
      this.reportNameFilter = e.target.value.trim();
      this.renderReport();
    });

    this.bindReportInlineEdit();
  },

  bindReportInlineEdit() {
    const tbody = document.getElementById('reportBody');
    tbody.addEventListener('click', (e) => {
      const cell = e.target.closest('.editable-completed');
      if (!cell || cell.querySelector('input')) return;
      this.startInlineEdit(cell);
    });
  },

  startInlineEdit(cell) {
    const employeeId = cell.dataset.employeeId;
    const current = Store.getEmployeeCompleted(employeeId);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-edit-input';
    input.inputMode = 'decimal';
    input.placeholder = '+2 或 618+999';
    input.value = current ? String(current) : '';
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    // 光标移到末尾，方便在其后追加 +2
    input.setSelectionRange(input.value.length, input.value.length);

    const finish = (save) => {
      if (save) {
        const raw = input.value.trim();
        if (raw === '') {
          this.renderReport();
          return;
        }
        const parsed = Calc.parseCellInput(raw, current);
        if (parsed.cancel) {
          this.renderReport();
          return;
        }
        if (!parsed.ok) {
          this.toast(parsed.message || '输入无效');
          this.renderReport();
          return;
        }
        if (parsed.delta === 0) {
          this.renderReport();
          return;
        }
        const emp = Store.getEmployees().find(e => e.id === employeeId);
        const note = parsed.inputExpr;
        const record = Store.addDelta({
          employeeId,
          delta: parsed.delta,
          note,
          date: `${this.reportDate}T12:00:00`,
          source: 'table'
        });
        if (record) {
          const newTotal = parsed.newTotal;
          const rate = Calc.rate(newTotal, emp.target);
          const deltaStr = parsed.delta > 0
            ? `+${Calc.formatMoney(parsed.delta)}`
            : Calc.formatMoney(parsed.delta);
          this.toast(`${emp.name} 填入 ${deltaStr} → 合计 ${Calc.formatMoney(newTotal)}（${Calc.formatRate(rate)}）`);
          if (rate >= 100) this.triggerCelebration(emp, newTotal);
        }
        this.renderReport();
        this.renderStats();
      } else {
        this.renderReport();
      }
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    if (tab === 'log') this.renderLog();
    if (tab === 'stats') this.renderStats();
    if (tab === 'manual') ManualSheet.onTabShow();
  },

  renderAll() {
    this.populateEmployeeSelect();
    this.initEmployeeSearch();
    ManualSheet.init();
    document.getElementById('reportDate').value = this.reportDate;
    document.getElementById('entryDate').value = BeijingTime.dateTimeLocal();
    this.renderReport();
    this.renderStats();
  },

  initEmployeeSearch() {
    EmployeeSearch.mount('entryEmployee', {
      placeholder: '输入姓名 / 拼音 / 首字母，如：白金玉、bjy、bai',
      onChange: (employeeId) => {
        if (!employeeId) {
          document.getElementById('entryNote').placeholder = '如：下单599、女神节活动等';
          return;
        }
        const emp = Store.getEmployees().find(x => x.id === employeeId);
        if (emp) {
          document.getElementById('entryNote').placeholder =
            `当前累计: ${Calc.formatMoney(Store.getEmployeeCompleted(emp.id))} / 目标: ${Calc.formatMoney(emp.target)}`;
        }
      }
    });
  },

  populateEmployeeSelect() {
    const sel = document.getElementById('logFilterEmployee');
    const employees = Store.getEmployees();
    sel.innerHTML = '<option value="">全部人员</option>';
    const deptOrder = ['销售部', '行政部', '医疗中心'];
    for (const dept of deptOrder) {
      const group = document.createElement('optgroup');
      group.label = dept;
      employees.filter(e => e.department === dept).forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name}（目标 ${Calc.formatMoney(emp.target)}）`;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    }
  },

  renderReport() {
    const employees = Store.getEmployees();
    const { rows } = Calc.buildReportData(employees, id => Store.getEmployeeCompleted(id));
    const tbody = document.getElementById('reportBody');
    tbody.innerHTML = '';
    const filterQ = this.reportNameFilter;

    let directorRendered = {};
    let managerRendered = {};

    const opsCell = (html) => `<td class="no-export col-ops">${html}</td>`;
    const rowOps = (employeeId) => opsCell(`
      <div class="row-ops">
        <button type="button" class="ops-btn" title="下方插入" onclick="App.insertAfter('${employeeId}')">+</button>
        <button type="button" class="ops-btn" title="编辑" onclick="App.editEmployee('${employeeId}')">编</button>
        <button type="button" class="ops-btn ops-del" title="删除" onclick="App.removeEmployee('${employeeId}')">删</button>
      </div>`);

    for (const row of rows) {
      const tr = document.createElement('tr');
      if (row.type === 'dept-summary') tr.className = 'dept-summary';
      if (row.type === 'grand-total') tr.className = 'grand-total';

      if (row.type === 'employee' && filterQ) {
        const emp = employees.find(e => e.id === row.employeeId);
        if (emp && !EmployeeSearch.matches(emp, filterQ)) {
          tr.classList.add('row-filter-hidden');
        }
      }

      if (row.type === 'dept-summary') {
        tr.innerHTML = `
          <td></td>
          <td class="director-cell">${row.director || ''}</td>
          <td>${row.manager || ''}</td>
          <td class="text-left"><strong>${row.name}</strong></td>
          <td class="num">${Calc.formatMoney(row.target)}</td>
          <td class="num">${Calc.formatMoney(row.completed)}</td>
          <td class="num ${Calc.rateCellClass(row.rate, 'dept-summary')}">${Calc.formatRate(row.rate)}</td>
          ${opsCell('')}
        `;
      } else if (row.type === 'grand-total') {
        tr.innerHTML = `
          <td colspan="3" class="grand-label">合计</td>
          <td>小计</td>
          <td class="num">${Calc.formatMoney(row.target)}</td>
          <td class="num">${Calc.formatMoney(row.completed)}</td>
          <td class="num ${Calc.rateCellClass(row.rate, 'grand-total')}">${Calc.formatRate(row.rate)}</td>
          ${opsCell('')}
        `;
      } else {
        const deptKey = row.department;
        let directorCell = '';
        let managerCell = '';
        if (!directorRendered[deptKey]) {
          directorCell = `<td class="director-cell" rowspan="${row.rowspan}">${row.director}</td>`;
          managerCell = `<td rowspan="${row.rowspan}">${row.manager}</td>`;
          directorRendered[deptKey] = true;
          managerRendered[deptKey] = true;
        }
        const completedDisplay = row.completed ? Calc.formatMoney(row.completed) : '';
        tr.innerHTML = `
          <td>${row.seq || ''}</td>
          ${directorCell}
          ${managerCell}
          <td class="text-left">${row.name}</td>
          <td class="num">${Calc.formatMoney(row.target)}</td>
          <td class="num editable-completed" data-employee-id="${row.employeeId}" title="点击填写，支持 +2 或 618+999">${completedDisplay}</td>
          <td class="num ${Calc.rateCellClass(row.rate, 'employee')}">${Calc.formatRate(row.rate)}</td>
          ${rowOps(row.employeeId)}
        `;
      }
      tbody.appendChild(tr);
    }

    document.getElementById('reportTitleDate').textContent =
      `统计日期：${this.reportDate}  |  2026年618活动业绩报表`;
  },

  onEmployeesChanged() {
    this.populateEmployeeSelect();
    EmployeeSearch.refresh('entryEmployee');
    this.renderReport();
    this.renderStats();
    this.renderLog();
  },

  insertAfter(employeeId) {
    EmployeeManage.openModal('insert', null, employeeId);
  },

  editEmployee(employeeId) {
    EmployeeManage.openModal('edit', employeeId);
  },

  removeEmployee(employeeId) {
    if (Store.deleteEmployee(employeeId)) {
      this.onEmployeesChanged();
      this.toast('已删除');
    }
  },

  renderStats() {
    const employees = Store.getEmployees();
    const { grandTarget, grandCompleted } = Calc.buildReportData(employees, id => Store.getEmployeeCompleted(id));
    const records = Store.getRecords();
    const dayStats = Calc.getDailyStats(records, this.reportDate);

    document.getElementById('statGrandTarget').textContent = Calc.formatMoney(grandTarget) || '0';
    document.getElementById('statGrandCompleted').textContent = Calc.formatMoney(grandCompleted) || '0';
    document.getElementById('statGrandRate').textContent = Calc.formatRate(Calc.rate(grandCompleted, grandTarget));
    document.getElementById('statTodayAmount').textContent = Calc.formatMoney(dayStats.total) || '0';
    document.getElementById('statTodayCount').textContent = dayStats.count + ' 笔';
    document.getElementById('statTotalRecords').textContent = records.length + ' 条';
    const dateLabel = document.getElementById('statReportDateLabel');
    if (dateLabel) dateLabel.textContent = this.reportDate;
  },

  /** 填报记录：最新填入在最上面 */
  sortRecordsNewestFirst(records) {
    return [...records].sort((a, b) => {
      const tb = new Date(b.timestamp).getTime();
      const ta = new Date(a.timestamp).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });
  },

  renderLog() {
    const filterDate = document.getElementById('logFilterDate').value;
    const filterEmp = document.getElementById('logFilterEmployee').value;
    let records = this.sortRecordsNewestFirst(Store.getRecords());

    if (filterDate) records = records.filter(r => BeijingTime.dateKey(r.timestamp) === filterDate);
    if (filterEmp) records = records.filter(r => r.employeeId === filterEmp);

    const employees = Store.getEmployees();
    const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

    const tbody = document.getElementById('logBody');
    tbody.innerHTML = records.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:#999;padding:20px">暂无记录</td></tr>'
      : records.map(r => {
          const emp = empMap[r.employeeId];
          const timeStr = BeijingTime.format(r.timestamp);
          const sourceLabel = {
            manual: '手动填报', api: 'API同步', baseline: '基准数据',
            import: '导入', table: '报表填写'
          }[r.source] || r.source;
          return `<tr>
            <td>${timeStr}</td>
            <td>${emp?.name || r.employeeId}</td>
            <td>${emp?.department || ''}</td>
            <td class="num">${Calc.formatMoney(r.amount)}</td>
            <td>${r.note || ''}</td>
            <td>${sourceLabel}</td>
            <td><button class="btn" style="padding:2px 8px;font-size:11px" onclick="App.deleteRecord('${r.id}')">删除</button></td>
          </tr>`;
        }).join('');
  },

  addRecord() {
    const employeeId = EmployeeSearch.getValue('entryEmployee');
    const amountRaw = document.getElementById('entryAmount').value;
    const note = document.getElementById('entryNote').value;
    const date = document.getElementById('entryDate').value;

    if (!employeeId) { this.toast('请选择员工'); return; }

    const emp = Store.getEmployees().find(e => e.id === employeeId);
    const current = Store.getEmployeeCompleted(employeeId);
    const parsed = Calc.parseEntryAmount(amountRaw, current);

    if (!parsed.ok) {
      this.toast(parsed.message || '请输入有效金额');
      return;
    }
    if (parsed.delta === 0) {
      this.toast('金额无变化');
      return;
    }

    const record = Store.addRecord({
      employeeId,
      amount: parsed.delta,
      note: note || parsed.inputExpr,
      date
    });
    if (!record) { this.toast('保存失败'); return; }

    const completed = Store.getEmployeeCompleted(employeeId);
    const rate = Calc.rate(completed, emp.target);
    const deltaStr = parsed.delta > 0
      ? `+${Calc.formatMoney(parsed.delta)}`
      : Calc.formatMoney(parsed.delta);

    this.toast(`已记录：${emp.name} ${deltaStr}，累计 ${Calc.formatMoney(completed)}（${Calc.formatRate(rate)}）`);

    document.getElementById('entryAmount').value = '';
    document.getElementById('entryNote').value = '';
    document.getElementById('entryDate').value = BeijingTime.dateTimeLocal();
    EmployeeSearch.clear('entryEmployee');

    this.renderReport();
    this.renderStats();

    if (rate >= 100) {
      this.triggerCelebration(emp, completed);
    }
  },

  /** 喜报触发预留接口 */
  triggerCelebration(employee, completed) {
    console.log('[喜报预留]', employee.name, '达成目标!', completed);
    // TODO: 后续接入喜报生成页面
    // window.open(`/celebration?name=${employee.name}&amount=${completed}`, '_blank');
  },

  deleteRecord(id) {
    if (!confirm('确定删除这条记录？')) return;
    Store.deleteRecord(id);
    this.renderReport();
    this.renderStats();
    this.renderLog();
    this.toast('已删除');
  },

  saveSnapshot() {
    const employees = Store.getEmployees();
    const { rows, grandTarget, grandCompleted } = Calc.buildReportData(employees, id => Store.getEmployeeCompleted(id));
    Store.saveDailySnapshot(this.reportDate, { rows, grandTarget, grandCompleted });
    this.toast(`已保存 ${this.reportDate} 日报快照`);
  },

  async exportImage() {
    const area = document.getElementById('exportArea');
    const clone = area.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('export-clone');

    clone.querySelectorAll('.no-export').forEach(el => el.remove());
    clone.querySelectorAll('.row-filter-hidden').forEach(el => el.remove());
    clone.querySelectorAll('.editable-completed').forEach(cell => {
      const input = cell.querySelector('input');
      if (input) {
        const id = cell.dataset.employeeId;
        const val = id ? Store.getEmployeeCompleted(id) : 0;
        cell.textContent = val ? Calc.formatMoney(val) : '';
      }
      cell.classList.remove('editable-completed');
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'export-clone-wrap';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    wrapper.style.width = `${clone.scrollWidth}px`;

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `618业绩报表_${this.reportDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.toast('PNG 已导出');
    } catch (err) {
      this.toast('导出失败: ' + err.message);
    } finally {
      document.body.removeChild(wrapper);
    }
  },

  exportSvg() {
    try {
      ExportSvg.download(this.reportDate);
      this.toast('SVG 已导出');
    } catch (err) {
      this.toast('SVG 导出失败: ' + err.message);
    }
  },

  async exportExcel() {
    try {
      await ExportExcel.download(this.reportDate);
      this.toast('Excel 已导出（与当前报表一致）');
    } catch (err) {
      this.toast('Excel 导出失败: ' + err.message);
    }
  },

  async syncToExcel() {
    try {
      const resp = await fetch('/api/sync-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Store.exportData()
      });
      const result = await resp.json();
      if (!resp.ok || !result.ok) {
        throw new Error(result.error || '同步失败');
      }
      this.toast(`已同步 ${result.updated} 名员工到 Excel${result.inserted ? `（新增 ${result.inserted} 行）` : ''}`);
    } catch (err) {
      this.toast('Excel 同步失败: ' + err.message + '（请用 start.py 启动服务）');
    }
  },

  exportJson() {
    const blob = new Blob([Store.exportData()], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `618业绩数据_${BeijingTime.today()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    this.toast('数据已导出');
  },

  importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        if (await Store.importData(ev.target.result)) {
          this.reportDate = Store.getReportDate();
          this.renderAll();
          this.toast('数据导入成功');
        } else {
          this.toast('导入失败：格式不正确');
        }
      } catch (err) {
        this.toast('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  confirmReset() {
    if (!confirm('确定清除所有填报记录？\n基准业绩(initialCompleted)将保留，合计恢复为基准值。')) return;
    Store.resetRecords();
    this.renderAll();
    this.toast('已重置填报记录');
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
