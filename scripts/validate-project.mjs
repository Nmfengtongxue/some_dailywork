#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const pages = [
  'index.html',
  'regional-statistics.html',
  'checkin-statistics.html',
  'excel_filter.html',
  'image-batch-processing.html',
  'congrats-generator.html',
  'other-tools.html',
  'excel_query_multi_table.html',
  'image-splitter/index.html',
  'photo-watermark/index.html',
  'privacy.html',
];

const scripts = [
  'regional-script.js',
  'checkin-script.js',
  'excel_query_multi_table.js',
  'image-batch-processing/js/script.js',
  'image-splitter/js/script.js',
  'photo-watermark/js/link.js',
  'photo-watermark/js/script.js',
  'congrats-assets/congrats-app.js',
  'assets/design-system.js',
  'assets/home-dashboard.js',
];

const errors = [];
const warnings = [];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

for (const page of pages) {
  const absolutePage = resolve(projectRoot, page);
  if (!(await exists(absolutePage))) {
    errors.push(`${page}: 页面不存在`);
    continue;
  }

  const html = await readFile(absolutePage, 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) {
    errors.push(`${page}: 重复 id（${duplicateIds.join(', ')}）`);
  }

  const refs = [...html.matchAll(/\b(?:src|href)=["']([^"'#?]+)["']/gi)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(ref)) continue;
    const target = resolve(absolutePage, '..', ref);
    if (!(await exists(target))) errors.push(`${page}: 本地资源不存在（${ref}）`);
  }

  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    warnings.push(`${page}: 缺少 viewport 声明`);
  }

  if (!/design-system\.css/i.test(html) || !/design-system\.js/i.test(html)) {
    errors.push(`${page}: 未接入共享设计系统`);
  }

  if (/umami\.cdtools|data-website-id/i.test(html)) {
    errors.push(`${page}: 仍包含未批准的远程统计代码`);
  }

  if (page === 'excel_query_multi_table.html') {
    if (/\son[a-z]+\s*=/i.test(html)) {
      errors.push(`${page}: 安全重构页仍包含内联事件处理器`);
    }
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .filter(match => match[1].trim());
    if (inlineScripts.length) {
      errors.push(`${page}: 安全重构页仍包含内联脚本`);
    }
  }
}

const legacyMenu = await readFile(resolve(projectRoot, 'photo-watermark/js/link.js'), 'utf8');
if (/umami\.cdtools|data-website-id/i.test(legacyMenu)) {
  errors.push('photo-watermark/js/link.js: 仍包含远程统计加载器');
}

for (const script of scripts) {
  const absoluteScript = resolve(projectRoot, script);
  if (!(await exists(absoluteScript))) {
    errors.push(`${script}: 脚本不存在`);
    continue;
  }
  if (extname(script) !== '.js') continue;
  try {
    execFileSync(process.execPath, ['--check', absoluteScript], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`${script}: JavaScript 语法错误\n${error.stderr?.toString().trim() || error.message}`);
  }
}

for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length) {
  console.error(`\n校验失败：${errors.length} 个错误，${warnings.length} 个警告。`);
  process.exit(1);
}

console.log(`校验通过：${pages.length} 个页面、${scripts.length} 个脚本；${warnings.length} 个警告。`);
