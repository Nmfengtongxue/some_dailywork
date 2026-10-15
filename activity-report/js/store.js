/**
 * 数据存储层 — 当前使用 localStorage，预留 API 接口供后续网站监测接入
 */
const STORAGE_KEY = '618_campaign_v2';
const SNAPSHOT_URL = './data/latest.json';

const Store = {
  _data: null,

  _normalizeEmployees(employees) {
    for (const emp of employees) {
      if (emp.initialCompleted == null && emp.snapshotCompleted != null) {
        emp.initialCompleted = emp.snapshotCompleted;
      }
      emp.initialCompleted = Number(emp.initialCompleted) || 0;
      delete emp.snapshotCompleted;
    }
  },

  _mergeRecords(a, b) {
    const map = new Map();
    for (const r of [...(a || []), ...(b || [])]) {
      if (r?.id) map.set(r.id, r);
    }
    return [...map.values()].sort((x, y) =>
      String(x.timestamp || '').localeCompare(String(y.timestamp || ''))
    );
  },

  async init() {
    const resp = await fetch(SNAPSHOT_URL);
    const base = await resp.json();
    this._normalizeEmployees(base.employees);
    const pinyinMap = Object.fromEntries(
      base.employees.map(e => [e.id, { pinyin: e.pinyin, initials: e.initials }])
    );

    const saved = localStorage.getItem(STORAGE_KEY);
    const snapshotVersion = base._snapshotVersion || base.syncedAt || base.reportDate || '1';

    if (saved) {
      const parsed = JSON.parse(saved);
      const savedVersion = parsed._snapshotVersion || parsed.syncedAt || parsed.reportDate || '0';
      if (savedVersion === snapshotVersion) {
        this._data = parsed;
        this._normalizeEmployees(this._data.employees);
        this._enrichPinyin(pinyinMap);
        return this._data;
      }

      // 版本变更时：合并员工名册（以服务端为准）+ 保留/合并填报记录，避免被清空
      const mergedRecords = this._mergeRecords(parsed.records, base.records);
      const mergedSnapshots = { ...(base.dailySnapshots || {}), ...(parsed.dailySnapshots || {}) };
      this._data = {
        ...base,
        records: mergedRecords,
        dailySnapshots: mergedSnapshots,
        _snapshotVersion: snapshotVersion,
        baselineBySeq: base.baselineBySeq || null
      };
      this._normalizeEmployees(this._data.employees);
      this._enrichPinyin(pinyinMap);
      this._save();
      console.info(`[618] 已合并 ${mergedRecords.length} 条填报记录（版本 ${savedVersion} → ${snapshotVersion}）`);
      return this._data;
    }
    this._data = {
      ...base,
      records: base.records || [],
      dailySnapshots: base.dailySnapshots || {},
      _snapshotVersion: snapshotVersion,
      baselineBySeq: base.baselineBySeq || null
    };
    this._normalizeEmployees(this._data.employees);
    this._enrichPinyin(pinyinMap);
    const check = this.validateBaseline(base.baselineBySeq);
    if (!check.ok) {
      console.warn('[618] 基准数据与 PNG 不一致:', check.errors);
    }
    this._save();
    return this._data;
  },

  _enrichPinyin(pinyinMap) {
    for (const emp of this._data.employees) {
      const py = pinyinMap[emp.id];
      if (py) {
        emp.pinyin = py.pinyin;
        emp.initials = py.initials;
      }
    }
  },

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
  },

  getEmployees() {
    return this._data?.employees || [];
  },

  getDepartments() {
    return this._data?.departments || [];
  },

  getRecords() {
    return this._data?.records || [];
  },

  /** 校验基准是否与 PNG 快照一致（仅无填报记录时） */
  validateBaseline(expectedBySeq) {
    if (!expectedBySeq || this.getRecords().length > 0) return { ok: true, errors: [] };
    const errors = [];
    for (const emp of this._data.employees) {
      const exp = expectedBySeq[emp.seq] ?? expectedBySeq[String(emp.seq)];
      if (exp == null) continue;
      const baseline = Number(emp.initialCompleted) || 0;
      if (baseline !== exp) {
        errors.push(`${emp.name}(序号${emp.seq}): PNG基准 ${exp}，当前 ${baseline}`);
      }
    }
    return { ok: errors.length === 0, errors };
  },

  /** 累计已完成 = 基准业绩(initialCompleted) + 填报记录之和，不低于 0 */
  getEmployeeCompleted(employeeId) {
    const emp = this._data.employees.find(e => e.id === employeeId);
    if (!emp) return 0;
    const initial = Number(emp.initialCompleted) || 0;
    const delta = this._data.records
      .filter(r => r.employeeId === employeeId)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return Math.max(0, initial + delta);
  },

  /** 仅统计填报记录产生的增减（不含基准） */
  getEmployeeRecordSum(employeeId) {
    return this._data.records
      .filter(r => r.employeeId === employeeId)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  },

  getReportDate() {
    return this._data?.reportDate || BeijingTime.today();
  },

  getBaselineLabel() {
    const d = this._data?.reportDate || this._data?.syncedFrom || '';
    return d ? `基准(${String(d).slice(0, 10)})` : '基准业绩';
  },

  /** 按部门顺序排列员工 */
  getEmployeesSorted() {
    const order = ['销售部', '行政部', '医疗中心'];
    return [...this.getEmployees()].sort((a, b) => {
      const di = order.indexOf(a.department) - order.indexOf(b.department);
      if (di !== 0) return di;
      return (a.seq || 9999) - (b.seq || 9999);
    });
  },

  _nextSeq() {
    const seqs = this.getEmployees().map(e => e.seq || 0);
    return Math.max(0, ...seqs) + 1;
  },

  _applyPinyin(emp) {
    if (!emp.pinyin || emp.pinyin === emp.name) {
      const py = EmployeeManage?.guessPinyin(emp.name) || { pinyin: emp.name, initials: '' };
      emp.pinyin = py.pinyin;
      emp.initials = py.initials;
    }
  },

  /** 新增员工（追加到部门末尾） */
  addEmployee({ name, department, target, initialCompleted = 0, director, manager }) {
    if (this.getEmployees().some(e => e.name === name)) {
      throw new Error(`姓名「${name}」已存在`);
    }
    const emp = {
      id: name,
      seq: this._nextSeq(),
      name,
      department,
      director: director || this._deptDirector(department),
      manager: manager ?? this._deptManager(department),
      target: Number(target),
      initialCompleted: Number(initialCompleted) || 0
    };
    this._applyPinyin(emp);
    this._data.employees.push(emp);
    this._bumpVersion();
    this._save();
    return emp;
  },

  /** 在指定员工下方插入 */
  insertEmployeeAfter(afterEmployeeId, data) {
    const list = this._data.employees;
    const idx = list.findIndex(e => e.id === afterEmployeeId);
    if (idx < 0) throw new Error('未找到参照员工');
    if (list.some(e => e.name === data.name)) throw new Error(`姓名「${data.name}」已存在`);

    const after = list[idx];
    const newSeq = this._seqBetween(after.seq, list[idx + 1]?.seq);
    const emp = {
      id: data.name,
      seq: newSeq,
      name: data.name,
      department: data.department || after.department,
      director: data.director || after.director,
      manager: data.manager ?? after.manager,
      target: Number(data.target),
      initialCompleted: Number(data.initialCompleted) || 0
    };
    this._applyPinyin(emp);
    list.splice(idx + 1, 0, emp);
    this._bumpVersion();
    this._save();
    return emp;
  },

  _seqBetween(a, b) {
    if (b == null || b === undefined) return (a || 0) + 1;
    if (a == null) return b - 1;
    if (b - a > 1) return a + 1;
    this._renumberSeq();
    return a + 1;
  },

  _renumberSeq() {
    const order = ['销售部', '行政部', '医疗中心'];
    let n = 1;
    for (const dept of order) {
      const emps = this._data.employees
        .filter(e => e.department === dept)
        .sort((a, b) => (a.seq || 0) - (b.seq || 0));
      for (const e of emps) e.seq = n++;
    }
  },

  _deptDirector(dept) {
    return { '销售部': '陈炳森', '行政部': '范宏云', '医疗中心': '张静' }[dept] || '';
  },

  _deptManager(dept) {
    return { '销售部': '', '行政部': '范宏云', '医疗中心': '张静' }[dept] || '';
  },

  updateEmployee(id, { name, department, target, initialCompleted, director, manager }) {
    const emp = this._data.employees.find(e => e.id === id);
    if (!emp) throw new Error('员工不存在');
    if (name !== emp.name && this._data.employees.some(e => e.name === name && e.id !== id)) {
      throw new Error(`姓名「${name}」已存在`);
    }
    const oldId = emp.id;
    emp.name = name;
    emp.id = name;
    emp.department = department;
    emp.target = Number(target);
    emp.initialCompleted = Number(initialCompleted) || 0;
    emp.director = director;
    emp.manager = manager;
    this._applyPinyin(emp);

    if (oldId !== name) {
      this._data.records.forEach(r => {
        if (r.employeeId === oldId) r.employeeId = name;
      });
    }
    this._bumpVersion();
    this._save();
    return emp;
  },

  deleteEmployee(id) {
    const emp = this._data.employees.find(e => e.id === id);
    if (!emp) throw new Error('员工不存在');
    if (!confirm(`确定删除「${emp.name}」？相关填报记录也将删除。`)) return false;
    this._data.employees = this._data.employees.filter(e => e.id !== id);
    this._data.records = this._data.records.filter(r => r.employeeId !== id);
    this._bumpVersion();
    this._save();
    return true;
  },

  _bumpVersion() {
    this._data._snapshotVersion = `emp_${Date.now()}`;
  },

  /** 获取某员工所有业绩记录（含基准，供审计） */
  getEmployeeHistory(employeeId) {
    const emp = this._data.employees.find(e => e.id === employeeId);
    const history = [];
    const baseline = Number(emp?.initialCompleted) || 0;
    if (baseline > 0) {
      history.push({
        id: 'baseline',
        employeeId,
        amount: baseline,
        note: this.getBaselineLabel(),
        timestamp: this._data?.syncedAt || this._data?.reportDate || '2026-06-01T00:00:00',
        source: 'baseline'
      });
    }
    const records = this._data.records
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return [...history, ...records];
  },

  /** 新增业绩填报（指定增减量，用于算式输入） */
  addDelta({ employeeId, delta, note, date, source = 'table' }) {
    const amount = Number(delta);
    if (isNaN(amount) || amount === 0) return null;
    return this.addRecord({ employeeId, amount, note, date, source });
  },

  /** 将员工累计业绩设为指定总额（自动计算差额并记录） */
  setEmployeeTotal(employeeId, newTotal, { note, date, source = 'table' } = {}) {
    const total = Math.max(0, Number(newTotal) || 0);
    const current = this.getEmployeeCompleted(employeeId);
    const delta = total - current;
    if (delta === 0) return null;
    return this.addRecord({
      employeeId,
      amount: delta,
      note: note || (delta > 0 ? '报表直接填报' : '报表调减'),
      date,
      source
    });
  },

  /** 新增业绩填报 */
  addRecord({ employeeId, amount, note, date, source = 'manual' }) {
    const emp = this._data.employees.find(e => e.id === employeeId);
    if (!emp) return null;
    const num = Number(amount);
    if (isNaN(num) || num === 0) return null;
    const record = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      employeeId,
      amount: num,
      note: note || '',
      timestamp: date ? BeijingTime.fromDateTimeLocal(date) : BeijingTime.nowISO(),
      source
    };
    this._data.records.push(record);
    this._save();
    return record;
  },

  /** 删除记录 */
  deleteRecord(recordId) {
    this._data.records = this._data.records.filter(r => r.id !== recordId);
    this._save();
  },

  /** 保存每日快照 */
  saveDailySnapshot(dateStr, stats) {
    this._data.dailySnapshots[dateStr] = {
      date: dateStr,
      stats,
      savedAt: BeijingTime.nowISO()
    };
    this._save();
  },

  getDailySnapshots() {
    return this._data.dailySnapshots || {};
  },

  /** 重置填报记录（保留基准 initialCompleted） */
  resetRecords() {
    this._data.records = [];
    this._data.dailySnapshots = {};
    this._save();
  },

  /** 重置填报记录 + 基准业绩归零（手动填表从零开始） */
  resetAllToZero() {
    for (const emp of this._data.employees) {
      emp.initialCompleted = 0;
    }
    this._data.records = [];
    this._data.dailySnapshots = {};
    this._bumpVersion();
    this._save();
  },

  /** 导出全部数据（JSON，供备份与 Excel 同步） */
  exportData() {
    const { employees, records, dailySnapshots, campaign, departments, reportDate, syncedAt, syncedFrom } = this._data;
    return JSON.stringify({
      campaign,
      departments,
      employees,
      records,
      dailySnapshots,
      reportDate,
      syncedAt,
      syncedFrom,
      _snapshotVersion: this._data._snapshotVersion
    }, null, 2);
  },

  /** 导入数据 */
  async importData(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.employees || parsed.records === undefined) return false;

    const resp = await fetch(SNAPSHOT_URL);
    const base = await resp.json();
    const pinyinMap = Object.fromEntries(
      base.employees.map(e => [e.id, { pinyin: e.pinyin, initials: e.initials }])
    );

    this._data = parsed;
    this._normalizeEmployees(this._data.employees);
    this._enrichPinyin(pinyinMap);
    if (!this._data._snapshotVersion) {
      this._data._snapshotVersion = parsed.syncedAt || parsed.reportDate || Date.now().toString();
    }
    this._save();
    return true;
  },

  // ===== 预留 API 接口（后续网站监测接入） =====
  async syncFromAPI(apiUrl, token) {
    // TODO: 后续接入网站数据监测
    // const resp = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
    // const orders = await resp.json();
    // orders.forEach(order => this.addRecord({ ...order, source: 'api' }));
    console.log('[Store] API sync placeholder — 待接入网站监测', apiUrl);
    return { synced: 0, message: 'API 接口预留，待后续接入' };
  }
};
