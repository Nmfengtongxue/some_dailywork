#!/usr/bin/env node
/**
 * 618 活动业绩统计 — 本地服务
 * 提供静态文件服务 + REST API（可选，用于后续网站监测接入）
 *
 * 启动: node server/server.js
 * 访问: http://localhost:8765
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = 8765;

function beijingNowISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const pick = type => parts.find(part => part.type === type).value;
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}+08:00`;
}

const app = express();
app.use(express.json());
app.use(express.static(WEB_DIR));

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  const base = JSON.parse(fs.readFileSync(path.join(WEB_DIR, 'data/employees.json'), 'utf-8'));
  return { ...base, records: [], dailySnapshots: {} };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET 全部数据
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

// POST 新增业绩记录（供 API 监测接入）
app.post('/api/records', (req, res) => {
  const { employeeId, amount, note, timestamp, source } = req.body;
  if (!employeeId || !amount) {
    return res.status(400).json({ error: '缺少 employeeId 或 amount' });
  }
  const data = loadData();
  const record = {
    id: `rec_${Date.now()}`,
    employeeId,
    amount: Number(amount),
    note: note || '',
    timestamp: timestamp || beijingNowISO(),
    source: source || 'api'
  };
  data.records.push(record);
  saveData(data);
  res.json({ ok: true, record });
});

// POST 批量同步（网站监测批量推送）
app.post('/api/sync', (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'orders 必须是数组' });
  }
  const data = loadData();
  let synced = 0;
  for (const order of orders) {
    if (!order.employeeId || !order.amount) continue;
    data.records.push({
      id: `rec_${Date.now()}_${synced}`,
      employeeId: order.employeeId,
      amount: Number(order.amount),
      note: order.note || '',
      timestamp: order.timestamp || beijingNowISO(),
      source: 'api'
    });
    synced++;
  }
  saveData(data);
  res.json({ ok: true, synced });
});

// GET 报表统计
app.get('/api/report', (req, res) => {
  const data = loadData();
  const empMap = Object.fromEntries(data.employees.map(e => [e.id, e]));
  const completed = {};
  for (const emp of data.employees) {
    completed[emp.id] = (emp.initialCompleted || 0) +
      data.records.filter(r => r.employeeId === emp.id).reduce((s, r) => s + r.amount, 0);
  }
  res.json({ employees: data.employees, completed, records: data.records });
});

app.listen(PORT, () => {
  console.log(`618业绩统计服务已启动: http://localhost:${PORT}`);
  console.log(`API 接口:`);
  console.log(`  GET  /api/data       — 获取全部数据`);
  console.log(`  POST /api/records    — 新增单条业绩`);
  console.log(`  POST /api/sync       — 批量同步订单`);
  console.log(`  GET  /api/report     — 获取报表统计`);
});
