/* 把口语业绩句整理成批量喜报的标准行。 */
(function () {
  const SAMPLE_LINES = new Set([
    '王莉莉+签约团检1单 金额：20000元',
    '陈炳森+开门红套餐下单 金额：15800元',
    '白金玉+618活动套餐下单 金额：9800元',
    '刘倩倩+"双11"活动套餐下单 金额：12800元'
  ]);

  const ORDER_HINT = /^(?:签约|签订|开门红|团检|套餐|下单|618|双11|双十一|["“「])/;

  function cnToInt(raw) {
    const s = String(raw || '').replace(/两|俩/g, '二');
    const digit = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (!s) return null;
    if (s === '十') return 10;
    if (s.startsWith('十')) {
      const lo = digit[s[1]];
      return lo == null ? null : 10 + lo;
    }
    const ten = s.indexOf('十');
    if (ten === 1) {
      const hi = digit[s[0]];
      if (hi == null) return null;
      if (!s[2]) return hi * 10;
      const lo = digit[s[2]];
      return lo == null ? null : hi * 10 + lo;
    }
    if (s.length === 1 && digit[s] != null) return digit[s];
    return null;
  }

  function convertOrderCounts(order) {
    return order.replace(/([零〇一二两三俩四五六七八九十]+)(?=单)/g, function (token) {
      const n = cnToInt(token);
      return n == null ? token : String(n);
    });
  }

  function toAsciiDigits(text) {
    return String(text || '').replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 48);
    }).replace(/(\d)[,，](?=\d{3}(?!\d))/g, '$1');
  }

  function polishStandard(line) {
    const match = line.trim().match(/^(.+?)\+(.+?)\s*金额\s*[：:]\s*([0-9]+(?:\.[0-9]+)?)\s*元?\s*$/);
    if (!match) return null;
    const order = convertOrderCounts(match[2].trim().replace(/\s+/g, ''));
    if (!order) return null;
    return `${match[1].trim()}+${order} 金额：${match[3]}元`;
  }

  function personnelNames() {
    if (typeof document === 'undefined') return [];
    return [...document.querySelectorAll('#batchNameFilter option')]
      .map(function (option) { return (option.value || '').trim(); })
      .filter(Boolean)
      .sort(function (a, b) { return b.length - a.length; });
  }

  function matchName(slice, names) {
    const hit = names.find(function (name) { return slice.startsWith(name); });
    if (hit) return hit;
    const match = slice.match(/^([\u4e00-\u9fff·]{2,4})(?=签约|签订|开门红|团检|套餐|下单|618|双11|双十一|["“「])/);
    return match ? match[1] : null;
  }

  function formatAmount(numberText, wan) {
    let amount = Number(numberText);
    if (!Number.isFinite(amount)) return null;
    if (wan) amount *= 10000;
    amount = Math.round(amount * 100) / 100;
    return Number.isInteger(amount) ? String(amount) : String(amount);
  }

  function parseInformalChunk(text, names) {
    const records = [];
    let i = 0;
    while (i < text.length) {
      while (i < text.length && /[\s,，;；、。“”"「」『』]/.test(text[i])) i += 1;
      if (i >= text.length) break;
      const name = matchName(text.slice(i), names);
      if (!name) return null;
      let end = text.length;
      names.forEach(function (candidate) {
        const idx = text.indexOf(candidate, i + name.length);
        if (idx !== -1 && idx < end) end = idx;
      });
      const segment = text.slice(i + name.length, end);
      const amountMatch = segment.match(/(\d+(?:\.\d+)?)\s*(万)?\s*(?:元|块)?\s*[，,;；、。“”"」』]*\s*$/);
      if (!amountMatch) return null;
      let order = segment.slice(0, amountMatch.index).replace(/^[\s+:：,，]+/, '').replace(/[\s+:：,，]+$/, '');
      order = convertOrderCounts(order.replace(/\s+/g, ''));
      order = order.replace(/(?:金额|共计|合计|总共|一共)+$/g, '');
      if (!order || ORDER_HINT.test(order) === false && !/单|套餐|下单|签约|签订|618/.test(order)) return null;
      const amount = formatAmount(amountMatch[1], amountMatch[2]);
      if (amount == null) return null;
      records.push(`${name}+${order} 金额：${amount}元`);
      i += name.length + amountMatch.index + amountMatch[0].length;
    }
    return records.length ? records : null;
  }

  function normalizeCongratsBatchText(text, names) {
    const source = toAsciiDigits(text);
    const originalLines = new Set(source.split('\n').map(function (line) { return line.trim(); }));
    const nameList = names && names.length ? names.slice().sort(function (a, b) { return b.length - a.length; }) : personnelNames();
    let converted = false;
    const output = [];
    source.split('\n').forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        output.push(line);
        return;
      }
      const standard = polishStandard(trimmed);
      if (standard && standard === trimmed) {
        output.push(line);
        return;
      }
      if (standard && standard !== trimmed) {
        converted = true;
        output.push(standard);
        return;
      }
      const records = parseInformalChunk(trimmed, nameList);
      if (!records) {
        output.push(line);
        return;
      }
      converted = true;
      records.forEach(function (record) { output.push(record); });
    });
    if (!converted) return source === text ? text : source;
    return output.filter(function (line) {
      const trimmed = line.trim();
      return !(SAMPLE_LINES.has(trimmed) && originalLines.has(trimmed));
    }).join('\n');
  }

  function applyToTextarea(textarea) {
    if (!textarea) return false;
    const next = normalizeCongratsBatchText(textarea.value);
    if (next === textarea.value) return false;
    const atEnd = textarea.selectionStart === textarea.value.length && textarea.selectionEnd === textarea.value.length;
    textarea.value = next;
    const caret = atEnd ? next.length : Math.min(textarea.selectionStart || next.length, next.length);
    textarea.setSelectionRange(caret, caret);
    return true;
  }

  function bind() {
    const textarea = document.getElementById('batchInput');
    if (!textarea || textarea.dataset.batchNormalizeBound === '1') return;
    textarea.dataset.batchNormalizeBound = '1';
    textarea.addEventListener('input', function () {
      applyToTextarea(textarea);
    });
  }

  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  root.normalizeCongratsBatchText = normalizeCongratsBatchText;

  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
