/**
 * 业务时间统一为北京时间（Asia/Shanghai，UTC+8）。
 * 不跟电脑时区、服务器时区走。带 Z 的旧记录按 UTC 换算后再显示。
 */
const BeijingTime = {
  ZONE: 'Asia/Shanghai',

  _parts(date) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map(part => [part.type, part.value]));
    if (parts.hour === '24') parts.hour = '00';
    return parts;
  },

  today(date = new Date()) {
    const p = this._parts(date);
    return `${p.year}-${p.month}-${p.day}`;
  },

  dateTimeLocal(date = new Date()) {
    const p = this._parts(date);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  },

  nowISO(date = new Date()) {
    const p = this._parts(date);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
  },

  /** datetime-local 的值按北京时间理解，存成带 +08:00 的时间 */
  fromDateTimeLocal(value) {
    const text = String(value || '').trim();
    if (!text) return this.nowISO();
    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T12:00:00+08:00`;
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
    if (match) return `${match[1]}T${match[2]}:${match[3] || '00'}+08:00`;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? this.nowISO() : this.nowISO(parsed);
  },

  /** 记录落在北京时间的哪一天，供筛选和“当日新增” */
  dateKey(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(text);
    if (!hasZone && /^\d{4}-\d{2}-\d{2}[T ]/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return text.slice(0, 10);
    return this.today(parsed);
  },

  format(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const parsed = new Date(hasExplicitZone(text) ? text : this.fromDateTimeLocal(text));
    if (Number.isNaN(parsed.getTime())) return text;
    const p = this._parts(parsed);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  },

  clockText(date = new Date()) {
    const p = this._parts(date);
    return `北京时间 ${p.hour}:${p.minute}:${p.second}`;
  }
};

function hasExplicitZone(text) {
  return /[zZ]$|[+-]\d{2}:\d{2}$/.test(text);
}
