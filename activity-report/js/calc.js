/**
 * 业绩计算逻辑 — 与 Excel 表一致
 * 完成率 = 已完成额度 / 目标总额 × 100%
 * 部门合计 = 该部门所有员工之和
 * 总合计 = 所有部门之和
 */

const Calc = {
  rate(completed, target) {
    if (!target || target === 0) return 0;
    return (completed / target) * 100;
  },

  formatRate(rate) {
    return rate.toFixed(2) + '%';
  },

  /** 完成率档位：0 / 20 / 50 / 80 / 100 */
  getRateTier(rate) {
    if (rate >= 100) return 100;
    if (rate >= 80) return 80;
    if (rate >= 50) return 50;
    if (rate >= 20) return 20;
    return 0;
  },

  /** 完成率单元格 CSS 类（员工 / 部门合计 / 总合计 区分样式） */
  rateCellClass(rate, rowType) {
    const tier = this.getRateTier(rate);
    if (rowType === 'grand-total') return `col-rate rate-grand rate-tier-${tier}`;
    if (rowType === 'dept-summary') return `col-rate rate-dept rate-tier-${tier}`;
    return `col-rate rate-tier-${tier}`;
  },

  formatMoney(n) {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  },

  /** 解析填报金额（与报表单元格相同规则） */
  parseEntryAmount(raw, currentTotal) {
    const input = String(raw).trim();
    if (/^[+-]/.test(input) || /[+\-]/.test(input.slice(1))) {
      return this.parseCellInput(input, currentTotal);
    }
    const num = Number(input.replace(/,/g, ''));
    if (isNaN(num) || num === 0) return { ok: false, message: '请输入有效金额' };
    return { ok: true, delta: num, newTotal: currentTotal + num, inputExpr: input, mode: 'increment' };
  },

  /** 安全计算仅含数字与 + - 的表达式 */
  _evalExpr(expr) {
    const s = String(expr).replace(/\s/g, '').replace(/,/g, '');
    if (!s || !/^[\d+\-\.]+$/.test(s)) return null;
    try {
      const result = Function('"use strict";return (' + s + ')')();
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  },

  /**
   * 解析报表单元格输入
   * - "+2" / "-1"     → 在当前值上增减，记录增减量
   * - "1+2" / "618+999" → 算式结果为新总额，记录差额
   * - "3"             → 设为绝对值，记录与当前值的差额
   */
  parseCellInput(raw, currentTotal) {
    const input = String(raw).trim().replace(/,/g, '');
    if (!input) return { ok: false, cancel: true };

    if (!/^[\d+\-\.\s,]+$/.test(input)) {
      return { ok: false, message: '仅支持数字和 + - 运算' };
    }

    const current = Number(currentTotal) || 0;

    // 以 + 或 - 开头：增量模式（记录的就是填入的增减量）
    if (/^[+-]/.test(input)) {
      const delta = this._evalExpr(input);
      if (delta === null) return { ok: false, message: '无效表达式' };
      const newTotal = Math.max(0, current + delta);
      const actualDelta = newTotal - current;
      return { ok: true, delta: actualDelta, newTotal, inputExpr: input, mode: 'increment' };
    }

    // 含运算符：算式结果作为新总额
    if (/[+\-]/.test(input.slice(1))) {
      const evaluated = this._evalExpr(input);
      if (evaluated === null) return { ok: false, message: '无效表达式' };
      const newTotal = Math.max(0, evaluated);
      const delta = newTotal - current;
      return { ok: true, delta, newTotal, inputExpr: input, mode: 'expression' };
    }

    // 纯数字：设为绝对总额
    const num = Number(input);
    if (isNaN(num)) return { ok: false, message: '无效金额' };
    const newTotal = Math.max(0, num);
    return { ok: true, delta: newTotal - current, newTotal, inputExpr: input, mode: 'absolute' };
  },

  /** 按部门分组并计算 */
  buildReportData(employees, getCompleted) {
    const deptOrder = ['销售部', '行政部', '医疗中心'];
    const deptDirectors = { '销售部': '陈炳森', '行政部': '范宏云', '医疗中心': '张静' };
    const deptManagers = { '销售部': '', '行政部': '范宏云', '医疗中心': '张静' };

    const rows = [];
    let grandTarget = 0;
    let grandCompleted = 0;

    for (const dept of deptOrder) {
      const deptEmps = employees
        .map((e, i) => ({ e, i }))
        .filter(x => x.e.department === dept)
        .sort((a, b) => a.i - b.i)
        .map(x => x.e);
      if (deptEmps.length === 0) continue;

      let deptTarget = 0;
      let deptCompleted = 0;

      for (const emp of deptEmps) {
        const completed = getCompleted(emp.id);
        deptTarget += emp.target;
        deptCompleted += completed;
      }

      // 部门合计行
      rows.push({
        type: 'dept-summary',
        name: dept + '合计',
        target: deptTarget,
        completed: deptCompleted,
        rate: this.rate(deptCompleted, deptTarget),
        director: deptDirectors[dept],
        manager: deptManagers[dept],
        department: dept
      });

      // 员工行
      let isFirstInDept = true;
      for (const emp of deptEmps) {
        const completed = getCompleted(emp.id);
        rows.push({
          type: 'employee',
          seq: emp.seq,
          name: emp.name,
          target: emp.target,
          completed,
          rate: this.rate(completed, emp.target),
          director: isFirstInDept ? deptDirectors[dept] : '',
          manager: isFirstInDept ? deptManagers[dept] : '',
          department: dept,
          employeeId: emp.id,
          rowspan: isFirstInDept ? deptEmps.length : 0
        });
        isFirstInDept = false;
      }

      grandTarget += deptTarget;
      grandCompleted += deptCompleted;
    }

    rows.push({
      type: 'grand-total',
      name: '小计',
      target: grandTarget,
      completed: grandCompleted,
      rate: this.rate(grandCompleted, grandTarget)
    });

    return { rows, grandTarget, grandCompleted };
  },

  /** 今日新增业绩 */
  getTodayRecords(records) {
    const today = BeijingTime.today();
    return records.filter(r => BeijingTime.dateKey(r.timestamp) === today);
  },

  /** 按日期统计（dateStr 为北京时间日期） */
  getDailyStats(records, dateStr) {
    const dayRecords = records.filter(r => BeijingTime.dateKey(r.timestamp) === dateStr);
    const total = dayRecords.reduce((s, r) => s + r.amount, 0);
    const byEmployee = {};
    dayRecords.forEach(r => {
      byEmployee[r.employeeId] = (byEmployee[r.employeeId] || 0) + r.amount;
    });
    return { total, count: dayRecords.length, byEmployee, records: dayRecords };
  }
};
