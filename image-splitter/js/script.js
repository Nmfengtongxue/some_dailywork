(function () {
  'use strict';

  const ASPECT_RATIOS = { '4:5': 0.8, '3:4': 0.75, '1:1': 1 };
  const MIME_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_DIMENSION = 8192;
  const VALID_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/webp']);

  const FAQ_DATA = [
    { q: 'AI Image Splitter 可以做什么？', a: '它可以将一张图像分割为多个相等的部分，并支持预览后下载。您可以上传 JPG、PNG、WebP 图像，设置分割参数后导出单张文件或 ZIP 打包文件。' },
    { q: '如何一步步完成图像分割？', a: '上传图像后，先选择宽高比和分割模式，再设置行列并调整分割范围选择框。确认预览效果后，下载单张结果或 ZIP 打包文件。' },
    { q: '可以用于 Instagram 网格和轮播帖子吗？', a: '可以。您可以生成适用于网格发布和轮播帖子的分割结果，并按顺序下载后用于发布。' },
    { q: '如何将图像分割为 2、3、4 部分或 3x3、2x3 网格？', a: '选择分割模式后，设置行列数即可生成 2、3、4 或更多部分，也可以使用 3x3、2x3、3x1 等网格布局。' },
    { q: '支持哪些上传与导出格式？', a: '上传支持 JPG、PNG、WebP（最大 50MB，建议尺寸不超过 8192×8192）。导出支持 JPG、PNG、WebP，并支持单张下载或 ZIP 打包下载。' },
    { q: '这款工具真的免费吗？', a: '是的。无需注册、无水印、无隐藏费用，且没有使用次数限制（在支持的格式与大小范围内）。' },
    { q: '图像分割后画质会下降吗？', a: '在原图质量足够的前提下，分割结果通常可保持良好清晰度。建议使用清晰原图，并在导出前先查看预览效果。' },
    { q: '图像会上传到服务器吗？', a: '不会。处理过程在浏览器本地完成，图像不会上传到服务器。' },
    { q: '手机和平板可以使用吗？', a: '可以。页面已适配常见移动设备，您可以在手机或平板上完成上传、设置和下载。' },
    { q: '可以用于 A4 打印或多页排版吗？', a: '可以。您可以通过行列设置将大图拆分为适合 A4 打印或多页排版的多个部分，也可用于 PDF 文档插入。' },
    { q: '如何将图像分割为 4:5？', a: '先选择 4:5 的宽高比预设，再设置分割模式、行和列。确认预览无误后，可下载单张结果或 ZIP 打包文件。' }
  ];

  const state = {
    image: null,
    objectUrl: null,
    sourceFile: null,
    splitImages: [],
    hasEverSplit: false,
    isProcessing: false,
    config: {
      mode: 'grid',
      rows: 3,
      cols: 3,
      gridLineWidth: 2,
      outputFormat: 'jpg',
      aspectRatio: 'default',
      cropRegion: null
    },
    imageDimensions: null,
    autoSplitTimer: null
  };

  const $ = (sel) => document.querySelector(sel);
  const landingView = $('#landingView');
  const toolView = $('#toolView');
  const fileInput = $('#fileInput');
  const toolFileInput = $('#toolFileInput');
  const uploadZone = $('#uploadZone');
  const previewArea = $('#previewArea');
  const splitBtn = $('#splitBtn');
  const downloadAllBtn = $('#downloadAllBtn');
  const rowsInput = $('#rowsInput');
  const colsInput = $('#colsInput');

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function safeDim(n) {
    return !n || n <= 0 ? 1 : n;
  }

  function getAspectRatioValue(ratio) {
    return ratio === 'default' ? null : ASPECT_RATIOS[ratio];
  }

  function calcCropRegion(imgW, imgH, aspectRatio, grid) {
    const ratio = getAspectRatioValue(aspectRatio);
    if (!ratio) return null;
    const rows = safeDim(grid.rows);
    const cols = safeDim(grid.cols);
    const targetRatio = (cols / rows) * ratio;
    let w = imgW;
    let h = w / targetRatio;
    if (h > imgH) {
      h = imgH;
      w = h * targetRatio;
    }
    return { x: (imgW - w) / 2, y: (imgH - h) / 2, width: w, height: h };
  }

  function getGridCounts(config) {
    switch (config.mode) {
      case 'vertical': return { rowCount: 1, colCount: config.cols };
      case 'horizontal': return { rowCount: config.rows, colCount: 1 };
      default: return { rowCount: config.rows, colCount: config.cols };
    }
  }

  function getPreviewGrid(config) {
    return {
      rows: config.mode === 'horizontal' ? config.rows : config.mode === 'vertical' ? 1 : config.rows,
      cols: config.mode === 'horizontal' ? 1 : config.cols
    };
  }

  function calcSegments(total, parts) {
    const count = Math.max(1, Math.floor(parts));
    const size = Math.max(1, total);
    const outputTotal = Math.max(count, Math.round(size));
    const segments = [];
    let used = 0;
    for (let i = 0; i < count; i++) {
      const start = size * i / count;
      const end = size * (i + 1) / count;
      const outEnd = Math.round(outputTotal * (i + 1) / count);
      segments.push({ sourceStart: start, sourceSize: end - start, outputSize: Math.max(1, outEnd - used) });
      used = outEnd;
    }
    return segments;
  }

  function getCropBounds(imgW, imgH, cropRegion) {
    if (cropRegion) {
      return { width: cropRegion.width, height: cropRegion.height, offsetX: cropRegion.x, offsetY: cropRegion.y };
    }
    return { width: imgW, height: imgH, offsetX: 0, offsetY: 0 };
  }

  function getSplitIndex(index, config, colCount) {
    if (config.mode === 'vertical') return { rowIndex: 0, colIndex: index };
    if (config.mode === 'horizontal') return { rowIndex: index, colIndex: 0 };
    return { rowIndex: Math.floor(index / colCount), colIndex: index % colCount };
  }

  async function validateAndLoadFile(file) {
    const type = (file.type || '').toLowerCase();
    if (!VALID_TYPES.has(type)) throw new Error('invalidFileType');
    if (file.size > MAX_FILE_SIZE) throw new Error('fileTooLarge');

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          URL.revokeObjectURL(url);
          reject(new Error('imageTooLarge'));
          return;
        }
        resolve({ image: img, objectUrl: url, file });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('invalidFile'));
      };
      img.src = url;
    });
  }

  function showAlert(key) {
    const messages = {
      invalidFileType: '请选择有效的图像文件（JPG、PNG 或 WebP）',
      fileTooLarge: '文件大小超过 50 MB，请选择更小的图像',
      imageTooLarge: '图像尺寸超过 8192x8192 像素，请选择更小的图像',
      invalidFile: '请选择有效的图像文件',
      downloadFailed: '下载失败，请重试'
    };
    alert(messages[key] || messages.invalidFile);
  }

  function releaseSplitImages() {
    state.splitImages.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    state.splitImages = [];
  }

  function releaseImage() {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.image = null;
    state.objectUrl = null;
    state.sourceFile = null;
    state.imageDimensions = null;
    state.config.cropRegion = null;
    state.hasEverSplit = false;
    releaseSplitImages();
  }

  async function splitOnePart(image, index, config) {
    const bounds = getCropBounds(image.width, image.height, config.cropRegion);
    const { rowCount, colCount } = getGridCounts(config);
    const { rowIndex, colIndex } = getSplitIndex(index, config, colCount);
    const colSeg = calcSegments(bounds.width, colCount)[colIndex];
    const rowSeg = calcSegments(bounds.height, rowCount)[rowIndex];
    if (!colSeg || !rowSeg) throw new Error('split failed');

    const canvas = document.createElement('canvas');
    canvas.width = colSeg.outputSize;
    canvas.height = rowSeg.outputSize;
    canvas.getContext('2d').drawImage(
      image,
      bounds.offsetX + colSeg.sourceStart,
      bounds.offsetY + rowSeg.sourceStart,
      colSeg.sourceSize,
      rowSeg.sourceSize,
      0, 0,
      colSeg.outputSize,
      rowSeg.outputSize
    );

    const mime = MIME_TYPES[config.outputFormat];
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime));
    return {
      id: 'split-' + index,
      blob,
      objectUrl: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height
    };
  }

  async function generateSplits(image, config) {
    const { rowCount, colCount } = getGridCounts(config);
    const count = rowCount * colCount;
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await splitOnePart(image, i, config));
    }
    return results;
  }

  function updateCropRegion() {
    if (!state.image) return;
    state.config.cropRegion = calcCropRegion(
      state.image.width,
      state.image.height,
      state.config.aspectRatio,
      { rows: state.config.rows, cols: state.config.cols }
    );
  }

  function scheduleAutoSplit() {
    if (!state.hasEverSplit || !state.image || state.isProcessing) return;
    clearTimeout(state.autoSplitTimer);
    state.autoSplitTimer = setTimeout(() => performSplit(false), 100);
  }

  async function performSplit(manual) {
    if (!state.image) return;
    state.isProcessing = true;
    splitBtn.disabled = true;
    splitBtn.textContent = '分割中...';

    try {
      const config = { ...state.config, cropRegion: state.config.cropRegion };
      releaseSplitImages();
      state.splitImages = await generateSplits(state.image, config);
      state.hasEverSplit = true;
      downloadAllBtn.disabled = state.splitImages.length === 0;
      renderPreview();
    } catch (e) {
      if (manual) showAlert('invalidFile');
    } finally {
      state.isProcessing = false;
      splitBtn.disabled = false;
      splitBtn.textContent = '分割图像';
    }
  }

  function fitImageSize(containerW, containerH, imgW, imgH) {
    const ratio = imgW / imgH;
    if (ratio > containerW / containerH) {
      return { width: containerW, height: containerW / ratio };
    }
    return { height: containerH, width: containerH * ratio };
  }

  function renderCropOverlay(wrap, displaySize, cropRegion, previewGrid) {
    if (!cropRegion || state.config.aspectRatio === 'default' || state.splitImages.length > 0) return;

    const ratio = getAspectRatioValue(state.config.aspectRatio);
    const scaleX = displaySize.width / state.image.width;
    const scaleY = displaySize.height / state.image.height;

    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.style.left = (cropRegion.x * scaleX) + 'px';
    overlay.style.top = (cropRegion.y * scaleY) + 'px';
    overlay.style.width = (cropRegion.width * scaleX) + 'px';
    overlay.style.height = (cropRegion.height * scaleY) + 'px';

    const guidesV = previewGrid.cols - 1;
    const guidesH = previewGrid.rows - 1;
    for (let i = 1; i <= guidesV; i++) {
      const g = document.createElement('div');
      g.className = 'crop-guide-v';
      g.style.left = (i / previewGrid.cols * 100) + '%';
      overlay.appendChild(g);
    }
    for (let i = 1; i <= guidesH; i++) {
      const g = document.createElement('div');
      g.className = 'crop-guide-h';
      g.style.top = (i / previewGrid.rows * 100) + '%';
      overlay.appendChild(g);
    }

    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const h = document.createElement('div');
      h.className = 'crop-handle ' + pos;
      overlay.appendChild(h);
    });

    wrap.appendChild(overlay);
    initCropDrag(overlay, wrap, displaySize, ratio, previewGrid);
  }

  function initCropDrag(overlay, wrap, displaySize, aspectRatio, previewGrid) {
    const scaleX = state.image.width / displaySize.width;
    const scaleY = state.image.height / displaySize.height;
    let drag = null;

    const toImage = (clientX, clientY) => {
      const rect = wrap.getBoundingClientRect();
      return {
        x: clamp(clientX - rect.left, 0, displaySize.width) * scaleX,
        y: clamp(clientY - rect.top, 0, displaySize.height) * scaleY
      };
    };

    const applyDisplay = (region) => {
      overlay.style.left = (region.x / scaleX) + 'px';
      overlay.style.top = (region.y / scaleY) + 'px';
      overlay.style.width = (region.width / scaleX) + 'px';
      overlay.style.height = (region.height / scaleY) + 'px';
    };

    const normalizeRegion = (region) => {
      let { x, y, width, height } = region;
      if (aspectRatio) {
        let w = width;
        let h = w / aspectRatio;
        if (Math.abs(w / h - aspectRatio) > Math.abs(h * aspectRatio / h - aspectRatio)) {
          h = height;
          w = h * aspectRatio;
        } else {
          h = w / aspectRatio;
        }
        const minW = 60 / scaleX;
        const minH = minW / aspectRatio;
        if (w < minW) { w = minW; h = w / aspectRatio; }
        if (h < minH) { h = minH; w = h * aspectRatio; }
        if (w > state.image.width) { w = state.image.width; h = w / aspectRatio; }
        if (h > state.image.height) { h = state.image.height; w = h * aspectRatio; }
        width = w;
        height = h;
      }
      return {
        x: clamp(x, 0, state.image.width - width),
        y: clamp(y, 0, state.image.height - height),
        width,
        height
      };
    };

    const onMove = (e) => {
      if (!drag) return;
      const pt = toImage(e.clientX, e.clientY);
      if (drag.type === 'move') {
        applyDisplay(normalizeRegion({
          x: drag.startRegion.x + (pt.x - drag.startPt.x),
          y: drag.startRegion.y + (pt.y - drag.startPt.y),
          width: drag.startRegion.width,
          height: drag.startRegion.height
        }));
      } else if (drag.type === 'resize') {
        const anchor = drag.anchor;
        let x = drag.startRegion.x;
        let y = drag.startRegion.y;
        let w = drag.startRegion.width;
        let h = drag.startRegion.height;
        if (drag.handle.includes('e')) w = Math.abs(pt.x - anchor.x);
        if (drag.handle.includes('w')) {
          w = Math.abs(anchor.x - pt.x);
          x = Math.min(pt.x, anchor.x);
        }
        if (drag.handle.includes('s')) h = Math.abs(pt.y - anchor.y);
        if (drag.handle.includes('n')) {
          h = Math.abs(anchor.y - pt.y);
          y = Math.min(pt.y, anchor.y);
        }
        applyDisplay(normalizeRegion({ x, y, width: w, height: h }));
      }
    };

    const onUp = () => {
      if (!drag) return;
      const region = normalizeRegion({
        x: parseFloat(overlay.style.left) * scaleX,
        y: parseFloat(overlay.style.top) * scaleY,
        width: parseFloat(overlay.style.width) * scaleX,
        height: parseFloat(overlay.style.height) * scaleY
      });
      state.config.cropRegion = region;
      drag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      scheduleAutoSplit();
    };

    overlay.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('crop-handle')) {
        const handle = [...e.target.classList].find((c) => ['nw', 'ne', 'sw', 'se'].includes(c));
        const r = state.config.cropRegion;
        const anchors = {
          nw: { x: r.x + r.width, y: r.y + r.height },
          ne: { x: r.x, y: r.y + r.height },
          sw: { x: r.x + r.width, y: r.y },
          se: { x: r.x, y: r.y }
        };
        drag = { type: 'resize', handle, anchor: anchors[handle], startRegion: { ...r } };
      } else {
        drag = {
          type: 'move',
          startPt: toImage(e.clientX, e.clientY),
          startRegion: { ...state.config.cropRegion }
        };
      }
      e.preventDefault();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  function renderPreview() {
    previewArea.innerHTML = '';
    if (!state.image) {
      previewArea.innerHTML = '<p class="preview-placeholder">请先上传图像</p>';
      return;
    }

    const pad = 40;
    const areaW = previewArea.clientWidth - pad;
    const areaH = previewArea.clientHeight - pad;
    const displaySize = fitImageSize(areaW, areaH, state.image.width, state.image.height);
    const previewGrid = getPreviewGrid(state.config);

    if (state.splitImages.length === 0) {
      const wrap = document.createElement('div');
      wrap.className = 'preview-image-wrap';
      wrap.style.width = displaySize.width + 'px';
      wrap.style.height = displaySize.height + 'px';

      const img = document.createElement('img');
      img.src = state.image.src;
      img.alt = '已上传图像预览';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      wrap.appendChild(img);

      if (state.config.cropRegion && state.config.aspectRatio !== 'default') {
        renderCropOverlay(wrap, displaySize, state.config.cropRegion, previewGrid);
      }

      previewArea.appendChild(wrap);
      return;
    }

    const crop = state.config.cropRegion;
    let gridW = displaySize.width;
    let gridH = displaySize.height;
    if (crop && state.config.aspectRatio !== 'default') {
      gridW = crop.width * (displaySize.width / state.image.width);
      gridH = crop.height * (displaySize.height / state.image.height);
    }

    const gap = state.config.gridLineWidth;
    const cellW = (gridW - (previewGrid.cols - 1) * gap) / previewGrid.cols;
    const cellH = (gridH - (previewGrid.rows - 1) * gap) / previewGrid.rows;

    const grid = document.createElement('div');
    grid.className = 'split-grid';
    grid.style.width = gridW + 'px';
    grid.style.height = gridH + 'px';
    grid.style.gap = gap + 'px';
    if (gap > 0) grid.style.background = '#fff';

    for (let r = 0; r < previewGrid.rows; r++) {
      const row = document.createElement('div');
      row.className = 'split-row';
      row.style.gap = gap + 'px';
      row.style.height = cellH + 'px';

      for (let c = 0; c < previewGrid.cols; c++) {
        let idx;
        if (state.config.mode === 'horizontal') idx = r;
        else if (state.config.mode === 'vertical') idx = c;
        else idx = r * previewGrid.cols + c;

        const item = state.splitImages[idx];
        const cell = document.createElement('div');
        cell.className = 'split-cell';
        cell.style.width = cellW + 'px';
        cell.style.height = cellH + 'px';

        if (item) {
          const img = document.createElement('img');
          img.src = item.objectUrl;
          img.alt = '分割结果 ' + (idx + 1);
          cell.appendChild(img);

          const overlay = document.createElement('div');
          overlay.className = 'download-overlay';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = '下载';
          btn.addEventListener('click', () => downloadSingle(item, idx));
          overlay.appendChild(btn);
          cell.appendChild(overlay);
        }
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    previewArea.appendChild(grid);
  }

  function downloadSingle(item, index) {
    const a = document.createElement('a');
    a.download = 'split-image-' + (index + 1) + '.' + state.config.outputFormat;
    a.href = item.objectUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function downloadAll() {
    if (!state.splitImages.length) return;
    if (typeof JSZip === 'undefined') {
      showAlert('downloadFailed');
      return;
    }
    try {
      const zip = new JSZip();
      state.splitImages.forEach((item, i) => {
        zip.file('split-image-' + (i + 1) + '.' + state.config.outputFormat, item.blob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.download = 'split-images.zip';
      a.href = URL.createObjectURL(content);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 100);
    } catch (e) {
      showAlert('downloadFailed');
    }
  }

  function showToolView() {
    landingView.classList.add('hidden');
    toolView.classList.remove('hidden');
    renderPreview();
    updateControls();
  }

  function showLandingView() {
    toolView.classList.add('hidden');
    landingView.classList.remove('hidden');
    releaseImage();
    previewArea.innerHTML = '<p class="preview-placeholder">请先上传图像</p>';
    downloadAllBtn.disabled = true;
  }

  async function handleFile(file) {
    try {
      releaseImage();
      const { image, objectUrl, file: srcFile } = await validateAndLoadFile(file);
      state.image = image;
      state.objectUrl = objectUrl;
      state.sourceFile = srcFile;
      state.imageDimensions = { width: image.width, height: image.height };
      updateCropRegion();
      showToolView();
    } catch (e) {
      showAlert(e.message || 'invalidFile');
    }
  }

  function updateControls() {
    const { mode } = state.config;
    rowsInput.disabled = mode === 'vertical';
    colsInput.disabled = mode === 'horizontal';
    rowsInput.value = mode === 'vertical' ? 0 : state.config.rows;
    colsInput.value = mode === 'horizontal' ? 0 : state.config.cols;
    $('#gridLineWidthVal').textContent = state.config.gridLineWidth;
    $('#gridLineWidth').value = state.config.gridLineWidth;
    $('#outputFormat').value = state.config.outputFormat;

    document.querySelectorAll('#aspectRatioBtns .option-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.ratio === state.config.aspectRatio);
    });
    document.querySelectorAll('#modeBtns .option-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === state.config.mode);
    });
  }

  function onConfigChange(partial) {
    Object.assign(state.config, partial);
    if (partial.aspectRatio !== undefined) {
      updateCropRegion();
      state.hasEverSplit = false;
      releaseSplitImages();
      downloadAllBtn.disabled = true;
    }
    if (partial.rows !== undefined || partial.cols !== undefined || partial.mode !== undefined) {
      updateCropRegion();
    }
    updateControls();
    renderPreview();
    scheduleAutoSplit();
  }

  function initFAQ() {
    const list = $('#faqList');
    FAQ_DATA.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'faq-item';
      el.innerHTML =
        '<button type="button" class="faq-question" aria-expanded="false">' +
        '<span>' + item.q + '</span>' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="faq-answer"><p>' + item.a + '</p></div>';
      el.querySelector('.faq-question').addEventListener('click', () => {
        el.classList.toggle('open');
      });
      list.appendChild(el);
    });
  }

  function initNavigation() {
    document.querySelectorAll('[data-scroll]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-scroll');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        $('#mobileNav').classList.add('hidden');
      });
    });

    $('#logoHome').addEventListener('click', (e) => {
      e.preventDefault();
      showLandingView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('#menuToggle').addEventListener('click', () => {
      $('#mobileNav').classList.toggle('hidden');
    });
  }

  function initUpload() {
    const openPicker = () => fileInput.click();
    uploadZone.addEventListener('click', openPicker);
    $('#chooseBtn').addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
      e.target.value = '';
    });

    toolFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
      e.target.value = '';
    });

    $('#reuploadBtn').addEventListener('click', () => toolFileInput.click());
  }

  function initControls() {
    document.querySelectorAll('#aspectRatioBtns .option-btn').forEach((btn) => {
      btn.addEventListener('click', () => onConfigChange({ aspectRatio: btn.dataset.ratio }));
    });

    document.querySelectorAll('#modeBtns .option-btn').forEach((btn) => {
      btn.addEventListener('click', () => onConfigChange({ mode: btn.dataset.mode }));
    });

    $('#rowsMinus').addEventListener('click', () => onConfigChange({ rows: clamp(state.config.rows - 1, 1, 10) }));
    $('#rowsPlus').addEventListener('click', () => onConfigChange({ rows: clamp(state.config.rows + 1, 1, 10) }));
    $('#colsMinus').addEventListener('click', () => onConfigChange({ cols: clamp(state.config.cols - 1, 1, 10) }));
    $('#colsPlus').addEventListener('click', () => onConfigChange({ cols: clamp(state.config.cols + 1, 1, 10) }));

    rowsInput.addEventListener('change', () => {
      onConfigChange({ rows: clamp(parseInt(rowsInput.value, 10) || 1, 1, 10) });
    });
    colsInput.addEventListener('change', () => {
      onConfigChange({ cols: clamp(parseInt(colsInput.value, 10) || 1, 1, 10) });
    });

    $('#gridLineWidth').addEventListener('input', (e) => {
      state.config.gridLineWidth = parseInt(e.target.value, 10);
      $('#gridLineWidthVal').textContent = state.config.gridLineWidth;
      renderPreview();
    });

    $('#outputFormat').addEventListener('change', (e) => {
      onConfigChange({ outputFormat: e.target.value });
    });

    splitBtn.addEventListener('click', () => performSplit(true));
    downloadAllBtn.addEventListener('click', downloadAll);

    window.addEventListener('resize', () => {
      if (state.image) renderPreview();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFAQ();
    initNavigation();
    initUpload();
    initControls();
    updateControls();
  });
})();
