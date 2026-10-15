/**
 * 将业绩报表导出为 SVG（与 PNG 导出区样式一致）
 */
const ExportSvg = {
  generate(reportDate) {
    const rows = ExportReport.buildRows();
    const cols = ExportReport.COLS;
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const headerH = 44;
    const rowH = 28;
    const titleH = 28;
    const tableH = headerH + rows.length * rowH;
    const totalH = titleH + tableH;
    const totalW = tableW + 24;
    const x0 = 12;
    const font = 'Microsoft YaHei,PingFang SC,SimSun,sans-serif';

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">\n`;
    svg += `<rect width="100%" height="100%" fill="#ffffff"/>\n`;
    svg += `<text x="${totalW - 12}" y="20" text-anchor="end" font-family="${font}" font-size="11" fill="#666">${ExportReport.esc(ExportReport.titleText(reportDate))}</text>\n`;

    let y = titleH;

    // 表头
    let x = x0;
    for (const col of cols) {
      const lines = col.label.split('\n');
      svg += `<rect x="${x}" y="${y}" width="${col.w}" height="${headerH}" fill="${ExportReport.HEADER_BG}" stroke="${ExportReport.HEADER_BORDER}" stroke-width="1"/>\n`;
      lines.forEach((line, i) => {
        svg += `<text x="${x + col.w / 2}" y="${y + 16 + i * 14}" text-anchor="middle" font-family="${font}" font-size="11" font-weight="bold" fill="#000">${ExportReport.esc(line)}</text>\n`;
      });
      x += col.w;
    }
    y += headerH;

    let directorRendered = {};

    const cellText = (cx, cy, w, text, { anchor = 'middle', fill = '#333', weight = 'normal', size = 12, px = 0 } = {}) => {
      const tx = anchor === 'start' ? cx + px : cx + w / 2;
      const fw = weight === 'bold' ? ' font-weight="bold"' : weight === 600 ? ' font-weight="600"' : '';
      svg += `<text x="${tx}" y="${cy}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" fill="${fill}"${fw}>${ExportReport.esc(text)}</text>\n`;
    };

    const drawCell = (cx, cy, w, h, bg, stroke = ExportReport.BORDER) => {
      svg += `<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${bg}" stroke="${stroke}" stroke-width="1"/>\n`;
    };

    for (const row of rows) {
      x = x0;
      const bg = ExportReport.rowBg(row.type);
      const bold = ExportReport.isBoldRow(row.type);

      if (row.type === 'dept-summary') {
        const cells = [
          { v: '', anchor: 'middle' },
          { v: row.director || '', anchor: 'middle' },
          { v: row.manager || '', anchor: 'middle' },
          { v: row.name, anchor: 'start', px: 8, strong: true },
          { v: Calc.formatMoney(row.target), anchor: 'middle' },
          { v: Calc.formatMoney(row.completed), anchor: 'middle' },
          { v: Calc.formatRate(row.rate), anchor: 'middle', rate: true }
        ];
        cells.forEach((c, i) => {
          const rateStyle = c.rate ? ExportReport.getRateStyle(row.rate, row.type) : null;
          const fill = rateStyle ? rateStyle.bg : bg;
          drawCell(x, y, cols[i].w, rowH, fill);
          const tc = rateStyle ? rateStyle.color : '#000';
          const wt = c.strong || bold ? 'bold' : 'normal';
          cellText(x, y + 18, cols[i].w, c.v, { anchor: c.anchor, fill: tc, weight: wt, px: c.px || 0 });
          x += cols[i].w;
        });
      } else if (row.type === 'grand-total') {
        const labelW = cols[0].w + cols[1].w + cols[2].w;
        drawCell(x, y, labelW, rowH, bg);
        cellText(x, y + 18, labelW, '合计', { fill: '#000', weight: 'bold' });
        x += labelW;
        drawCell(x, y, cols[3].w, rowH, bg);
        cellText(x, y + 18, cols[3].w, '小计', { fill: '#000', weight: 'bold' });
        x += cols[3].w;
        const rest = [Calc.formatMoney(row.target), Calc.formatMoney(row.completed), Calc.formatRate(row.rate)];
        for (let i = 0; i < 3; i++) {
          const colI = i + 4;
          const isRate = colI === 6;
          const rateStyle = isRate ? ExportReport.getRateStyle(row.rate, row.type) : null;
          const fill = rateStyle ? rateStyle.bg : bg;
          drawCell(x, y, cols[colI].w, rowH, fill);
          const tc = rateStyle ? rateStyle.color : '#000';
          const sz = rateStyle?.size || 12;
          cellText(x, y + 18, cols[colI].w, rest[i], { fill: tc, weight: 'bold', size: sz });
          x += cols[colI].w;
        }
      } else {
        drawCell(x, y, cols[0].w, rowH, bg);
        cellText(x, y + 18, cols[0].w, row.seq || '', { fill: '#333' });
        x += cols[0].w;

        const deptKey = row.department;
        if (!directorRendered[deptKey]) {
          const spanH = row.rowspan * rowH;
          drawCell(x, y, cols[1].w, spanH, '#ffffff');
          cellText(x, y + 18, cols[1].w, row.director, { fill: '#333' });
          drawCell(x + cols[1].w, y, cols[2].w, spanH, '#ffffff');
          cellText(x + cols[1].w, y + 18, cols[2].w, row.manager, { fill: '#333' });
          directorRendered[deptKey] = true;
        }
        x += cols[1].w + cols[2].w;

        const completedDisplay = row.completed ? Calc.formatMoney(row.completed) : '';
        const rateStyle = ExportReport.getRateStyle(row.rate, row.type);
        const items = [
          { v: row.name, anchor: 'start', px: 8 },
          { v: Calc.formatMoney(row.target), anchor: 'middle' },
          { v: completedDisplay, anchor: 'middle' },
          { v: Calc.formatRate(row.rate), anchor: 'middle', rate: true }
        ];
        const widths = [cols[3].w, cols[4].w, cols[5].w, cols[6].w];
        items.forEach((c, i) => {
          const rs = c.rate ? rateStyle : null;
          drawCell(x, y, widths[i], rowH, rs ? rs.bg : bg);
          cellText(x, y + 18, widths[i], c.v, {
            anchor: c.anchor,
            fill: rs ? rs.color : '#333',
            weight: rs ? rs.weight : 'normal',
            px: c.px || 0
          });
          x += widths[i];
        });
      }
      y += rowH;
    }

    svg += `</svg>`;
    return svg;
  },

  download(reportDate) {
    const svg = this.generate(reportDate);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `618业绩报表_${reportDate}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
