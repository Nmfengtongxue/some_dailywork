/**
 * 浏览器端导出 Excel — 直接读取当前报表数据（与页面表格一致）
 */
const ExportExcel = {
  _border() {
    const c = { argb: 'FFCCCCCC' };
    return {
      top: { style: 'thin', color: c },
      left: { style: 'thin', color: c },
      bottom: { style: 'thin', color: c },
      right: { style: 'thin', color: c }
    };
  },

  _argb(hex) {
    return 'FF' + String(hex || '#ffffff').replace('#', '').toUpperCase();
  },

  /** 与网页一致：已完成 0 显示空白；目标始终保留 */
  _completedVal(n) {
    const num = Number(n);
    return num ? num : null;
  },

  _targetVal(n) {
    const num = Number(n);
    return num || 0;
  },

  _fillCell(cell, bg, opts = {}) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this._argb(bg) } };
    cell.border = this._border();
    cell.alignment = { vertical: 'middle', ...(opts.align || { horizontal: 'center' }) };
    if (opts.font) cell.font = { name: 'Microsoft YaHei', ...opts.font };
    if (opts.numFmt && cell.value != null) cell.numFmt = opts.numFmt;
  },

  _rateCell(cell, rate, rowType) {
    const st = ExportReport.getRateStyle(rate, rowType);
    cell.value = Calc.formatRate(rate);
    this._fillCell(cell, st.bg, {
      align: { horizontal: 'center' },
      font: { bold: true, size: st.size || 12, color: { argb: this._argb(st.color) } }
    });
  },

  async download(reportDate) {
    if (typeof ExcelJS === 'undefined') {
      throw new Error('Excel 组件未加载，请检查网络');
    }

    const rows = ExportReport.buildRows();
    if (!rows.length) throw new Error('当前报表无数据');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('2026年618活动');

    ws.mergeCells(1, 1, 1, 7);
    const title = ws.getCell(1, 1);
    title.value = ExportReport.titleText(reportDate);
    title.alignment = { horizontal: 'right', vertical: 'middle' };
    title.font = { name: 'Microsoft YaHei', size: 11, color: { argb: 'FF666666' } };

    const headers = [
      '序号', '总监', '经理组', '姓名',
      '部门/个人6·18\n已完成业绩总额',
      '6·18任务已完成额度（6月）',
      '任务额完成率%'
    ];
    headers.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h;
      this._fillCell(cell, ExportReport.HEADER_BG, {
        align: { horizontal: 'center', wrapText: true },
        font: { bold: true, size: 11, color: { argb: 'FF000000' } }
      });
    });
    ws.getRow(2).height = 36;
    [6, 12, 10, 14, 22, 22, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    let r = 3;
    const merges = [];

    for (const row of rows) {
      const bg = ExportReport.rowBg(row.type);
      const bold = ExportReport.isBoldRow(row.type);

      if (row.type === 'dept-summary') {
        for (let c = 1; c <= 7; c++) {
          this._fillCell(ws.getCell(r, c), bg, { font: bold ? { bold: true } : {} });
        }
        ws.getCell(r, 2).value = row.director || '';
        ws.getCell(r, 3).value = row.manager || '';
        ws.getCell(r, 4).value = row.name;
        ws.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getCell(r, 5).value = this._targetVal(row.target);
        ws.getCell(r, 5).numFmt = '#,##0';
        ws.getCell(r, 6).value = this._completedVal(row.completed);
        if (ws.getCell(r, 6).value != null) ws.getCell(r, 6).numFmt = '#,##0';
        this._rateCell(ws.getCell(r, 7), row.rate, row.type);
      } else if (row.type === 'grand-total') {
        merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
        for (let c = 1; c <= 7; c++) {
          this._fillCell(ws.getCell(r, c), bg, { font: { bold: true } });
        }
        ws.getCell(r, 1).value = '合计';
        ws.getCell(r, 4).value = '小计';
        ws.getCell(r, 5).value = this._targetVal(row.target);
        ws.getCell(r, 5).numFmt = '#,##0';
        ws.getCell(r, 6).value = this._completedVal(row.completed);
        if (ws.getCell(r, 6).value != null) ws.getCell(r, 6).numFmt = '#,##0';
        this._rateCell(ws.getCell(r, 7), row.rate, row.type);
      } else {
        for (let c = 1; c <= 7; c++) this._fillCell(ws.getCell(r, c), bg);
        ws.getCell(r, 1).value = row.seq ?? '';
        if (row.rowspan) {
          merges.push({ s: { r, c: 2 }, e: { r: r + row.rowspan - 1, c: 2 } });
          merges.push({ s: { r, c: 3 }, e: { r: r + row.rowspan - 1, c: 3 } });
          ws.getCell(r, 2).value = row.director || '';
          ws.getCell(r, 3).value = row.manager || '';
        }
        ws.getCell(r, 4).value = row.name;
        ws.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getCell(r, 5).value = this._targetVal(row.target);
        ws.getCell(r, 5).numFmt = '#,##0';
        ws.getCell(r, 6).value = this._completedVal(row.completed);
        if (ws.getCell(r, 6).value != null) ws.getCell(r, 6).numFmt = '#,##0';
        this._rateCell(ws.getCell(r, 7), row.rate, row.type);
      }
      ws.getRow(r).height = 22;
      r++;
    }

    merges.forEach(m => ws.mergeCells(m.s.r, m.s.c, m.e.r, m.e.c));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const link = document.createElement('a');
    link.download = `618业绩报表_${reportDate}.xlsx`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
