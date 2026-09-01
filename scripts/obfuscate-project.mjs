#!/usr/bin/env node

import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const projectRoot = resolve(import.meta.dirname, '..');
const backupRoot = join(projectRoot, '.source-backup');

const jsTargets = [
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

const htmlInlineTargets = ['excel_filter.html'];

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function obfuscateCode(source, fileLabel) {
  const result = JavaScriptObfuscator.obfuscate(source, obfuscatorOptions);
  const code = result.getObfuscatedCode();
  console.log(`  OK  ${fileLabel} (${source.length} -> ${code.length} bytes)`);
  return code;
}

async function backupFile(relativePath) {
  const source = join(projectRoot, relativePath);
  const target = join(backupRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}

async function obfuscateJsFile(relativePath) {
  const absolutePath = join(projectRoot, relativePath);
  if (!(await exists(absolutePath))) {
    console.warn(`  SKIP ${relativePath} (missing)`);
    return;
  }
  await backupFile(relativePath);
  const source = await readFile(absolutePath, 'utf8');
  const obfuscated = obfuscateCode(source, relativePath);
  await writeFile(absolutePath, obfuscated, 'utf8');
}

async function obfuscateInlineHtml(relativePath) {
  const absolutePath = join(projectRoot, relativePath);
  if (!(await exists(absolutePath))) {
    console.warn(`  SKIP ${relativePath} (missing)`);
    return;
  }
  await backupFile(relativePath);
  const html = await readFile(absolutePath, 'utf8');
  let count = 0;
  const next = html.replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
    const trimmed = body.trim();
    if (!trimmed) return full;
    count += 1;
    const obfuscated = obfuscateCode(trimmed, `${relativePath}#inline-${count}`);
    return `<script${attrs}>${obfuscated}</script>`;
  });
  if (!count) {
    console.warn(`  SKIP ${relativePath} (no inline script)`);
    return;
  }
  await writeFile(absolutePath, next, 'utf8');
}

console.log('备份源码到 .source-backup/ …');
for (const file of [...jsTargets, ...htmlInlineTargets]) {
  const absolutePath = join(projectRoot, file);
  if (await exists(absolutePath)) {
    await backupFile(file);
  }
}

console.log('混淆 JavaScript …');
for (const file of jsTargets) {
  await obfuscateJsFile(file);
}

console.log('混淆 HTML 内联脚本 …');
for (const file of htmlInlineTargets) {
  await obfuscateInlineHtml(file);
}

console.log('\n混淆完成。可执行 node scripts/validate-project.mjs 进行校验。');
