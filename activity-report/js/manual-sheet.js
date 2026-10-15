/**
 * 手动填报表 — 独立空白表格，初始累计均为 0，逐行提交
 */
const ManualSheet = {
  _rowSeq: 0,
  DEFAULT_ROWS: 10,

  init() {
    document.getElementById('btnManualAddRow')?.addEventListener('click', () => this.addRows(1));
    document.getElementById('btnManualAddRows5')?.addEventListener('click', () => this.addRows(5));
    document.getElementById('btnManualClearDraft')?.addEventListener('click', () => this.resetDraft());
    document.getElementById('btnManualZeroAll')?.addEventListener('click', () => this.zeroAll());
    this.resetDraft();
  },

  zeroAll() {
    if (!confirm('确定清零全部业绩？\n将删除所有填报记录，并将全员基准归零。')) return;
    Store.resetAllToZero();
    this.resetDraft();
    App.renderReport();
    App.renderStats();
    App.renderLog();
    App.toast('已清零，可从头手动填写');
  },

  employeeOptionsHtml() {
    const emps = Store.getEmployees();
    return emps.map(e =>
      `<option value="${e.name}">${e.name}（${e.department}）</option>`
    ).join('');
  },

  nowLocal() {
    return BeijingTime.dateTimeLocal();
  },

  nextRowId() {
    this._rowSeq += 1;
    return `manual_${this._rowSeq}`;
  },

  rowHtml(rowId) {
    const now = this.nowLocal();
    return `
      <tr data-row-id="${rowId}">
        <td class="manual-row-no"></td>
        <td>
          <input type="text" class="manual-name" list="manualEmployeeList" placeholder="输入姓名" autocomplete="off" />
        </td>
        <td><input type="text" class="manual-amount" inputmode="decimal" placeholder="618 或 +618" /></td>
        <td><input type="datetime-local" class="manual-date" value="${now}" /></td>
        <td><input type="text" class="manual-note" placeholder="选填" /></td>
        <td class="manual-current num">0</td>
        <td class="manual-actions">
          <button type="button" class="btn btn-primary btn-xs manual-submit">提交</button>
          <button type="button" class="btn btn-xs manual-remove">删行</button>
        </td>
      </tr>`;
  },

  resetDraft() {
    this._rowSeq = 0;
    const tbody = document.getElementById('manualSheetBody');
    const datalist = document.getElementById('manualEmployeeList');
    if (!tbody) return;
    if (datalist) datalist.innerHTML = this.employeeOptionsHtml();
    tbody.innerHTML = '';
    for (let i = 0; i < this.DEFAULT_ROWS; i++) {
      tbody.insertAdjacentHTML('beforeend', this.rowHtml(this.nextRowId()));
    }
    this.renumber();
    this.bindRows();
    this.refreshCurrentTotals();
  },

  addRows(n = 1) {
    const tbody = document.getElementById('manualSheetBody');
    for (let i = 0; i < n; i++) {
      tbody.insertAdjacentHTML('beforeend', this.rowHtml(this.nextRowId()));
    }
    this.renumber();
    this.bindRows();
  },

  renumber() {
    document.querySelectorAll('#manualSheetBody tr').forEach((tr, i) => {
      tr.querySelector('.manual-row-no').textContent = i + 1;
    });
  },

  bindRows() {
    const tbody = document.getElementById('manualSheetBody');
    tbody.querySelectorAll('.manual-submit').forEach(btn => {
      btn.onclick = (e) => this.submitRow(e.target.closest('tr'));
    });
    tbody.querySelectorAll('.manual-remove').forEach(btn => {
      btn.onclick = (e) => {
        const tr = e.target.closest('tr');
        if (document.querySelectorAll('#manualSheetBody tr').length <= 1) {
          App.toast('至少保留一行');
          return;
        }
        tr.remove();
        this.renumber();
      };
    });
    tbody.querySelectorAll('.manual-name').forEach(inp => {
      inp.onchange = () => this.updateRowCurrent(inp.closest('tr'));
      inp.onblur = () => this.updateRowCurrent(inp.closest('tr'));
    });
  },

  resolveEmployee(nameRaw) {
    const q = (nameRaw || '').trim();
    if (!q) return null;
    const emps = Store.getEmployees();
    return emps.find(e => e.name === q)
      || emps.find(e => q.includes(e.name))
      || emps.find(e => EmployeeSearch.matches(e, q));
  },

  updateRowCurrent(tr) {
    const cell = tr.querySelector('.manual-current');
    const emp = this.resolveEmployee(tr.querySelector('.manual-name')?.value);
    cell.textContent = emp ? Calc.formatMoney(Store.getEmployeeCompleted(emp.id)) || '0' : '0';
  },

  refreshCurrentTotals() {
    document.querySelectorAll('#manualSheetBody tr').forEach(tr => this.updateRowCurrent(tr));
  },

  submitRow(tr) {
    const nameRaw = tr.querySelector('.manual-name')?.value;
    const amountRaw = tr.querySelector('.manual-amount')?.value;
    const date = tr.querySelector('.manual-date')?.value;
    const note = tr.querySelector('.manual-note')?.value?.trim() || '';

    const emp = this.resolveEmployee(nameRaw);
    if (!emp) { App.toast('请选择或输入有效姓名'); return; }

    const current = Store.getEmployeeCompleted(emp.id);
    const parsed = Calc.parseEntryAmount(amountRaw, current);
    if (!parsed.ok) { App.toast(parsed.message || '金额无效'); return; }
    if (parsed.delta === 0) { App.toast('金额无变化'); return; }

    const record = Store.addRecord({
      employeeId: emp.id,
      amount: parsed.delta,
      note: note || parsed.inputExpr,
      date,
      source: 'manual'
    });
    if (!record) { App.toast('保存失败'); return; }

    const completed = Store.getEmployeeCompleted(emp.id);
    App.toast(`${emp.name} 已提交 ${parsed.delta > 0 ? '+' : ''}${Calc.formatMoney(parsed.delta)} → 累计 ${Calc.formatMoney(completed)}`);

    tr.querySelector('.manual-amount').value = '';
    tr.querySelector('.manual-note').value = '';
    tr.querySelector('.manual-date').value = this.nowLocal();
    this.updateRowCurrent(tr);

    App.renderReport();
    App.renderStats();
    if (App.currentTab === 'log') App.renderLog();
  },

  onTabShow() {
    const datalist = document.getElementById('manualEmployeeList');
    if (datalist) datalist.innerHTML = this.employeeOptionsHtml();
    this.refreshCurrentTotals();
  }
};
