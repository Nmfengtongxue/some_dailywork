(() => {
  const TITLE = '甘青区域外宣发布明细表（试行）';
  const HEADER_BG = '#B4C6E8';
  const TOTAL_BG = '#FFFFFF';
  const BORDER = 'FF000000';
  const FONT = 'Microsoft YaHei';
  const RANK_COLORS_10 = [
    '#F2B383',
    '#F9CAAA',
    '#FAE4D2',
    '#FFFFFF',
    '#FFFFFF',
    '#FFFFFF',
    '#FFFFFF',
    '#FADADF',
    '#F4B7BE',
    '#EF939D'
  ];

  function lerpChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function hexToRgb(hex) {
    const raw = String(hex || '').replace('#', '');
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ];
  }

  function rgbToHex(rgb) {
    return (
      '#' +
      rgb
        .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
        .join('')
    ).toUpperCase();
  }

  function lerpHex(a, b, t) {
    const left = hexToRgb(a);
    const right = hexToRgb(b);
    return rgbToHex([0, 1, 2].map((i) => lerpChannel(left[i], right[i], t)));
  }

  function parseRank(value) {
    const match = String(value ?? '').match(/\d+/);
    const n = match ? parseInt(match[0], 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function parseNum(value) {
    const n = parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function colLetter(index) {
    let n = index;
    let out = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  }

  window.getWpsRankColor = function getWpsRankColor(rankOrIndex, total) {
    const rank = parseRank(rankOrIndex) || (Number(rankOrIndex) + 1);
    if (RANK_COLORS_10[rank - 1]) return RANK_COLORS_10[rank - 1];
    const count = Math.max(11, Number(total) || 11);
    const t = (Math.max(1, rank) - 1) / (count - 1);
    if (t <= 0.3) return lerpHex('#F2B383', TOTAL_BG, t / 0.3);
    if (t < 0.7) return TOTAL_BG;
    return lerpHex(TOTAL_BG, '#EF939D', Math.min(1, (t - 0.7) / 0.3));
  };

  function uniqueRankColors(total) {
    const count = Math.max(1, Number(total) || 1);
    const map = new Map();
    for (let rank = 1; rank <= Math.max(count, 10); rank += 1) {
      map.set(rank, window.getWpsRankColor(rank, count));
    }
    return map;
  }

  function argb(hex) {
    return 'FF' + String(hex || '#FFFFFF').replace('#', '').toUpperCase();
  }

  function thinBorder() {
    const color = { argb: BORDER };
    return {
      top: { style: 'thin', color },
      left: { style: 'thin', color },
      bottom: { style: 'thin', color },
      right: { style: 'thin', color }
    };
  }

  function styleFill(hex) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } };
  }

  function baseAlign() {
    return { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  function headerSubs() {
    const depts = Array.isArray(window.fixedDepartments)
      ? window.fixedDepartments
      : ['销售部', '医疗部', '行政部'];
    const labels = [];
    depts.forEach((dept) => {
      labels.push(dept, '转发（条）');
    });
    labels.push('合计(人)');
    return labels;
  }

  function formulaValue(formula, result) {
    return { formula, result };
  }

  function personCols() {
    return [3, 5, 7];
  }

  function forwardCols() {
    return [4, 6, 8];
  }

  function buildExportModel() {
    const collected =
      typeof window.collectForwardTableRows === 'function'
        ? window.collectForwardTableRows()
        : { dataRows: [], sumRow: null };
    const dataRows = collected.dataRows || [];
    const dateText =
      typeof window.formatWpsExportDate === 'function'
        ? window.formatWpsExportDate()
        : new Date().toLocaleDateString('zh-CN');
    const startRow = 5;
    const endRow = dataRows.length ? startRow + dataRows.length - 1 : startRow - 1;
    const sumRow = dataRows.length ? endRow + 1 : startRow;
    const colCount = 10;
    return { dataRows, dateText, startRow, endRow, sumRow, colCount };
  }

  function rowFormulas(excelRow) {
    const persons = personCols()
      .map((c) => `${colLetter(c)}${excelRow}`)
      .join('+');
    const forwards = forwardCols()
      .map((c) => `${colLetter(c)}${excelRow}`)
      .join('+');
    return { persons, forwards };
  }

  function colSumFormula(col, startRow, endRow) {
    const letter = colLetter(col);
    return `SUM(${letter}${startRow}:${letter}${endRow})`;
  }

  function cellStyleHtml(bg, extra) {
    return (
      'border:1px solid #000;text-align:center;vertical-align:middle;font-family:\'Microsoft YaHei\',SimSun,sans-serif;font-size:12pt;padding:4px 6px;background:' +
      bg +
      ';' +
      (extra || '')
    );
  }

  window.buildWpsStyledTableHtml = function buildWpsStyledTableHtml() {
    const { dataRows, dateText, startRow, endRow, sumRow } = buildExportModel();
    if (!dataRows.length) return null;
    const subs = headerSubs();
    const colors = uniqueRankColors(dataRows.length);
    let html = '<table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse">\n';
    html +=
      '<tr><td colspan="10" style="' +
      cellStyleHtml('transparent', 'border:none;font-size:18pt;font-weight:700;') +
      '">' +
      TITLE +
      '</td></tr>\n';
    html +=
      '<tr><td colspan="9" style="border:none"></td><td style="' +
      cellStyleHtml('transparent', 'border:none;text-align:right;') +
      '">' +
      dateText +
      '</td></tr>\n';
    const head = cellStyleHtml(HEADER_BG, 'font-weight:700;');
    html += '<tr>';
    html += '<td rowspan="2" style="' + head + '">排名</td>';
    html += '<td rowspan="2" style="' + head + '">公司</td>';
    html += '<td colspan="7" style="' + head + '">在册人数</td>';
    html += '<td rowspan="2" style="' + head + '">宣发总量（条）</td>';
    html += '</tr>\n<tr>';
    subs.forEach((label) => {
      html += '<td style="' + head + '">' + label + '</td>';
    });
    html += '</tr>\n';

    dataRows.forEach((row, index) => {
      const excelRow = startRow + index;
      const rank = parseRank(row.rank) || index + 1;
      const bg = colors.get(rank) || window.getWpsRankColor(rank, dataRows.length);
      const values = row.values || [];
      const { persons, forwards } = rowFormulas(excelRow);
      const personResult = parseNum(values[6]);
      const forwardResult = parseNum(values[7]);
      html += '<tr>';
      html += '<td style="' + cellStyleHtml(bg, 'font-weight:700;') + '">' + rank + '</td>';
      html += '<td style="' + cellStyleHtml(bg, 'font-weight:700;') + '">' + (row.company || '') + '</td>';
      for (let i = 0; i < 6; i += 1) {
        html += '<td style="' + cellStyleHtml(bg) + '">' + (values[i] ?? '') + '</td>';
      }
      html +=
        '<td style="' +
        cellStyleHtml(bg) +
        '" x:fmla="=' +
        persons +
        '">=' +
        persons +
        '</td>';
      html +=
        '<td style="' +
        cellStyleHtml(bg) +
        '" x:fmla="=' +
        forwards +
        '">=' +
        forwards +
        '</td>';
      html += '</tr>\n';
      void personResult;
      void forwardResult;
    });

    if (endRow >= startRow) {
      const total = cellStyleHtml(TOTAL_BG, 'font-weight:700;');
      html += '<tr>';
      html += '<td style="' + total + '"></td>';
      html += '<td style="' + total + '">合计</td>';
      for (let col = 3; col <= 10; col += 1) {
        const formula = colSumFormula(col, startRow, endRow);
        html += '<td style="' + total + '" x:fmla="=' + formula + '">=' + formula + '</td>';
      }
      html += '</tr>\n';
    }
    html += '</table>';
    return html;
  };

  window.buildWpsExcelDocument = function buildWpsExcelDocument() {
    const table = window.buildWpsStyledTableHtml();
    if (!table) return null;
    return (
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>' +
      table +
      '</body></html>'
    );
  };

  function paintCell(cell, bg, opts = {}) {
    cell.fill = styleFill(bg);
    cell.border = thinBorder();
    cell.alignment = baseAlign();
    cell.font = {
      name: FONT,
      size: 12,
      bold: !!opts.bold,
      color: { argb: 'FF000000' }
    };
  }

  async function downloadXlsx() {
    const { dataRows, dateText, startRow, endRow, sumRow, colCount } = buildExportModel();
    if (!dataRows.length) {
      alert('请先完成填入和排序，再导出明细表。');
      return;
    }
    if (typeof ExcelJS === 'undefined') {
      fallbackDownload();
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = '区域宣发统计';
    const ws = wb.addWorksheet('宣发明细', {
      views: [{ showGridLines: false }]
    });
    const lastCol = colLetter(colCount);
    const subs = headerSubs();

    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = TITLE;
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('A1').font = { name: FONT, size: 18, bold: true };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:I2');
    ws.getCell('J2').value = dateText;
    ws.getCell('J2').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('J2').font = { name: FONT, size: 11 };

    ws.mergeCells('A3:A4');
    ws.mergeCells('B3:B4');
    ws.mergeCells('C3:I3');
    ws.mergeCells('J3:J4');
    const headers = [
      [1, '排名'],
      [2, '公司'],
      [3, '在册人数'],
      [10, '宣发总量（条）']
    ];
    headers.forEach(([col, text]) => {
      const cell = ws.getCell(3, col);
      cell.value = text;
      paintCell(cell, HEADER_BG, { bold: true });
    });
    paintCell(ws.getCell(4, 1), HEADER_BG, { bold: true });
    paintCell(ws.getCell(4, 2), HEADER_BG, { bold: true });
    paintCell(ws.getCell(4, 10), HEADER_BG, { bold: true });
    subs.forEach((label, i) => {
      const cell = ws.getCell(4, i + 3);
      cell.value = label;
      paintCell(cell, HEADER_BG, { bold: true });
    });
    for (let c = 3; c <= 9; c += 1) paintCell(ws.getCell(3, c), HEADER_BG, { bold: true });

    dataRows.forEach((row, index) => {
      const excelRow = startRow + index;
      const rank = parseRank(row.rank) || index + 1;
      const bg = window.getWpsRankColor(rank, dataRows.length === 10 ? 10 : dataRows.length);
      const values = row.values || [];
      const { persons, forwards } = rowFormulas(excelRow);
      for (let c = 1; c <= colCount; c += 1) paintCell(ws.getCell(excelRow, c), bg, { bold: c <= 2 });
      ws.getCell(excelRow, 1).value = rank;
      ws.getCell(excelRow, 2).value = row.company || '';
      for (let i = 0; i < 6; i += 1) {
        ws.getCell(excelRow, i + 3).value = parseNum(values[i]);
      }
      ws.getCell(excelRow, 9).value = formulaValue(persons, parseNum(values[6]));
      ws.getCell(excelRow, 10).value = formulaValue(forwards, parseNum(values[7]));
      ws.getRow(excelRow).height = 22;
    });

    if (endRow >= startRow) {
      for (let c = 1; c <= colCount; c += 1) paintCell(ws.getCell(sumRow, c), TOTAL_BG, { bold: true });
      ws.getCell(sumRow, 2).value = '合计';
      for (let c = 3; c <= colCount; c += 1) {
        const cached = dataRows.reduce((sum, row) => sum + parseNum((row.values || [])[c - 3]), 0);
        ws.getCell(sumRow, c).value = formulaValue(colSumFormula(c, startRow, endRow), cached);
      }
      ws.getRow(sumRow).height = 22;
    }

    const widths = [8, 12, 12, 12, 12, 12, 12, 12, 12, 16];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    const dataRange = `A${startRow}:${lastCol}${endRow}`;
    const rankCount = Math.max(dataRows.length, 10);
    const rules = [];
    for (let rank = 1; rank <= rankCount; rank += 1) {
      const color = window.getWpsRankColor(rank, dataRows.length === 10 ? 10 : rankCount);
      rules.push({
        type: 'expression',
        formulae: [`$A${startRow}=${rank}`],
        priority: rank,
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: argb(color) },
            fgColor: { argb: argb(color) }
          },
          font: { name: FONT, size: 12, color: { argb: 'FF000000' }, bold: true }
        }
      });
    }
    ws.addConditionalFormatting({ ref: dataRange, rules });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const stamp = String(dateText).replace(/\//g, '-');
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `甘青区域外宣发布明细表-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function fallbackDownload() {
    const html = window.buildWpsExcelDocument();
    if (!html) {
      alert('请先完成填入和排序，再导出明细表。');
      return;
    }
    const dateText =
      typeof window.formatWpsExportDate === 'function' ? window.formatWpsExportDate() : '';
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `甘青区域外宣发布明细表-${String(dateText).replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.downloadWpsStyledExcel = function downloadWpsStyledExcel() {
    return downloadXlsx().catch((error) => {
      console.error(error);
      fallbackDownload();
    });
  };

  window.exportToExcel = function exportToExcel() {
    return window.downloadWpsStyledExcel();
  };
})();
