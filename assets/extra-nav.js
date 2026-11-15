'use strict';

(() => {
  const extra = {
    path: 'front-addon-summary.html',
    name: '前台加项汇总',
    shortName: '前台加项',
    code: '13',
    description: '上传结账付款统计表，生成当日加项汇总和千爱登记'
  };
  const inSub = /\/(?:image-splitter|image-cutout|photo-watermark|activity-report|double11-campaign)\//.test(location.pathname);
  const href = `${inSub ? '../' : ''}${extra.path}`;
  const nav = document.querySelector('.app-rail__nav');
  if (!nav) return;
  const heading = [...nav.querySelectorAll('h2')].find((node) => node.textContent.trim() === '数据整理');
  const list = heading?.parentElement?.querySelector('ul');
  if (!list || list.querySelector(`[href$="${extra.path}"]`)) return;
  const item = document.createElement('li');
  const link = document.createElement('a');
  const sibling = list.querySelector('a');
  if (sibling) link.className = sibling.className;
  link.href = href;
  link.title = extra.description;
  if (location.pathname.endsWith(extra.path)) link.setAttribute('aria-current', 'page');
  link.innerHTML = `<span class="app-rail__index">${extra.code}</span><span class="app-rail__link-label">${extra.shortName}</span>`;
  item.append(link);
  list.append(item);
})();
