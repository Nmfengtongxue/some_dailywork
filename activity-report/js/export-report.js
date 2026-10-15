/**
 * 报表导出共享层 — PNG / SVG / Excel 共用布局与配色（与 report.css 一致）
 */
const ExportReport = {
  COLS: [
    { key: 'seq', w: 40, label: '序号' },
    { key: 'director', w: 80, label: '总监' },
    { key: 'manager', w: 70, label: '经理组' },
    { key: 'name', w: 90, label: '姓名' },
    { key: 'target', w: 130, label: '部门/个人6·18\n已完成业绩总额' },
    { key: 'completed', w: 120, label: '6·18任务已完成额度（6月）' },
    { key: 'rate', w: 90, label: '任务额完成率%' }
  ],

  HEADER_BG: '#ff9933',
  DEPT_BG: '#ffff00',
  GRAND_BG: '#ff9933',
  BORDER: '#cccccc',
  HEADER_BORDER: '#999999',

  RATE_STYLES: {
    employee: {
      0: { bg: '#ffcdd2', color: '#b71c1c', weight: 600 },
      20: { bg: '#ffe0b2', color: '#e65100', weight: 600 },
      50: { bg: '#fff59d', color: '#f57f17', weight: 600 },
      80: { bg: '#c8e6c9', color: '#2e7d32', weight: 600 },
      100: { bg: '#66bb6a', color: '#ffffff', weight: 'bold' }
    },
    dept: {
      0: { bg: '#ef5350', color: '#ffffff', weight: 'bold' },
      20: { bg: '#ff9800', color: '#ffffff', weight: 'bold' },
      50: { bg: '#fbc02d', color: '#333333', weight: 'bold' },
      80: { bg: '#43a047', color: '#ffffff', weight: 'bold' },
      100: { bg: '#2e7d32', color: '#ffffff', weight: 'bold' }
    },
    grand: {
      0: { bg: '#c62828', color: '#ffffff', weight: 'bold', size: 14 },
      20: { bg: '#ef6c00', color: '#ffffff', weight: 'bold', size: 14 },
      50: { bg: '#f9a825', color: '#212121', weight: 'bold', size: 14 },
      80: { bg: '#388e3c', color: '#ffffff', weight: 'bold', size: 14 },
      100: { bg: '#1b5e20', color: '#ffffff', weight: 'bold', size: 15 }
    }
  },

  rowTypeKey(rowType) {
    if (rowType === 'dept-summary') return 'dept';
    if (rowType === 'grand-total') return 'grand';
    return 'employee';
  },

  getRateStyle(rate, rowType) {
    const tier = Calc.getRateTier(rate);
    const key = this.rowTypeKey(rowType);
    return this.RATE_STYLES[key][tier] || this.RATE_STYLES[key][0];
  },

  rowBg(rowType) {
    if (rowType === 'dept-summary') return this.DEPT_BG;
    if (rowType === 'grand-total') return this.GRAND_BG;
    return '#ffffff';
  },

  isBoldRow(rowType) {
    return rowType === 'dept-summary' || rowType === 'grand-total';
  },

  titleText(reportDate) {
    return `统计日期：${reportDate}  |  2026年618活动业绩报表`;
  },

  buildRows() {
    const employees = Store.getEmployees();
    return Calc.buildReportData(employees, id => Store.getEmployeeCompleted(id)).rows;
  },

  esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
