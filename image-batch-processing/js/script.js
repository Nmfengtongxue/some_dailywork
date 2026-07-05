let overlayImage = null;
let backgroundFiles = [];
let processedCanvases = [];
let currentTemplateId = 'morning';

const TEMPLATES = {
  morning: {
    id: 'morning',
    name: '早安图文',
    src: 'https://raw.githubusercontent.com/Nmfengtongxue/daily_imgs/main/日常图文模板.png',
    crossOrigin: 'Anonymous',
    mode: 'original'
  },
  promotion: {
    id: 'promotion',
    name: '推广海报',
    src: 'image-batch-processing/assets/promotion-footer.png',
    mode: 'promotion',
    footerViewBox: { width: 621, height: 162 }
  }
};

function getPromotionFooterHeight(imageWidth, config) {
  const { width, height } = config.footerViewBox;
  return Math.round(height * (imageWidth / width));
}

function compositePromotionImage(ctx, backgroundImage, footerTemplate, config) {
  const canvas = ctx.canvas;
  const footerDisplayHeight = getPromotionFooterHeight(backgroundImage.width, config);

  canvas.width = backgroundImage.width;
  canvas.height = backgroundImage.height + footerDisplayHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImage, 0, 0);
  ctx.drawImage(
    footerTemplate,
    0,
    backgroundImage.height,
    canvas.width,
    footerDisplayHeight
  );
}

function getTemplateConfig() {
  return TEMPLATES[currentTemplateId];
}

function drawContainImage(ctx, image, region, anchor = 'center') {
  const scale = Math.min(region.width / image.width, region.height / image.height, 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = anchor === 'top-left'
    ? region.x
    : region.x + (region.width - drawWidth) / 2;
  const y = anchor === 'top-left'
    ? region.y
    : region.y + (region.height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function compositeImage(backgroundImage, template) {
  if (!template || !template.width || !template.height) {
    throw new Error('顶层底图无效');
  }

  const config = getTemplateConfig();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建画布上下文');
  }

  if (config.mode === 'promotion') {
    compositePromotionImage(ctx, backgroundImage, template, config);
    return canvas;
  }

  canvas.width = template.width;
  canvas.height = template.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fullRegion = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
  };
  drawContainImage(ctx, backgroundImage, fullRegion, 'top-left');
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  return canvas;
}

function handleFileUpload(files) {
  backgroundFiles = Array.from(files);
  const uploadArea = document.getElementById('backgroundImagesUpload');
  uploadArea.innerHTML = `
    <p>已加载 ${backgroundFiles.length} 张下层图片</p>
    <p class="upload-hint">支持单个文件、多个文件或整个文件夹上传</p>
    <div class="thumb-list"></div>
  `;

  const thumbList = uploadArea.querySelector('.thumb-list');

  backgroundFiles.forEach((file) => {
    const isImage = file.type.match('image.*') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);

    const item = document.createElement('div');
    item.className = 'thumb-item';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'thumb-remove';
    removeBtn.textContent = '取消';
    removeBtn.onclick = (event) => {
      event.stopPropagation();
      backgroundFiles = backgroundFiles.filter((entry) => entry.name !== file.name);
      item.remove();
      uploadArea.querySelector('p').textContent = `已加载 ${backgroundFiles.length} 张下层图片`;
      if (backgroundFiles.length === 0) {
        document.getElementById('processBtn').disabled = true;
        document.getElementById('batchDownloadBtn').disabled = true;
      }
      checkReady();
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        item.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      item.classList.add('thumb-item-invalid');
      item.textContent = '非图片';
    }

    const label = document.createElement('div');
    label.className = 'thumb-label';
    label.textContent = file.name;
    item.appendChild(label);
    item.appendChild(removeBtn);
    thumbList.appendChild(item);
  });

  checkReady();
}

function checkReady() {
  const ready = overlayImage && backgroundFiles.length > 0;
  document.getElementById('processBtn').disabled = !ready;
}

function updateOverlayPreview(image, title) {
  const uploadArea = document.getElementById('overlayImageUpload');
  uploadArea.innerHTML = `
    <div class="overlay-preview-wrap">
      <p>${title}</p>
      <button type="button" class="delete-btn">取消</button>
    </div>
  `;

  const preview = document.createElement('img');
  preview.className = 'overlay-preview';
  preview.src = image.src;
  uploadArea.appendChild(preview);
  checkReady();
}

function loadTemplate(templateId) {
  const template = TEMPLATES[templateId];
  if (!template) {
    return;
  }

  currentTemplateId = templateId;
  const uploadArea = document.getElementById('overlayImageUpload');
  uploadArea.innerHTML = '<p>正在加载底图模板...</p>';

  const image = new Image();
  if (template.crossOrigin) {
    image.crossOrigin = template.crossOrigin;
  }

  image.onload = () => {
    overlayImage = image;
    updateOverlayPreview(image, `已加载底图：${template.name}`);
  };
  image.onerror = () => {
    overlayImage = null;
    uploadArea.innerHTML = `
      <p class="text-danger">底图加载失败：${template.name}</p>
      <p class="upload-hint">请检查网络连接，或点击此区域上传本地底图</p>
    `;
    checkReady();
  };
  image.src = template.src;
}

function processImages() {
  const previewContainer = document.getElementById('previewContainer');
  const loadingText = document.getElementById('loadingText');

  loadingText.style.display = 'block';
  loadingText.textContent = '正在处理图片，请稍候...';
  previewContainer.innerHTML = '';
  processedCanvases = [];

  if (backgroundFiles.length === 0) {
    loadingText.textContent = '请先上传下层图片';
    setTimeout(() => {
      loadingText.style.display = 'none';
    }, 2000);
    return;
  }

  if (!overlayImage) {
    loadingText.textContent = '请先加载顶层底图';
    setTimeout(() => {
      loadingText.style.display = 'none';
    }, 2000);
    return;
  }

  let completed = 0;
  let failed = 0;
  const total = backgroundFiles.length;
  const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  function finishBatch() {
    if (failed > 0) {
      loadingText.textContent = `处理完成，${failed} 张图片处理失败`;
      setTimeout(() => {
        loadingText.style.display = 'none';
      }, 3000);
    } else {
      loadingText.style.display = 'none';
    }
    document.getElementById('batchDownloadBtn').disabled = processedCanvases.length === 0;
  }

  backgroundFiles.forEach((file) => {
    const isImage = file.type.match('image.*') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);

    if (!isImage) {
      failed += 1;
      completed += 1;
      const errorItem = document.createElement('div');
      errorItem.className = 'preview-item preview-item-error';
      errorItem.innerHTML = `<p>无效图片: ${file.name}</p><small>类型: ${file.type || '未知'}</small>`;
      previewContainer.appendChild(errorItem);
      if (completed === total) {
        finishBatch();
      }
      return;
    }

    const image = new Image();
    image.onload = () => {
      try {
        const canvas = compositeImage(image, overlayImage);
        const filename = `${file.name.replace(/\.[^/.]+$/, '')}_${dateSuffix}_已处理.jpg`;
        processedCanvases.push({ canvas, filename });

        const item = document.createElement('div');
        item.className = 'preview-item';

        const preview = document.createElement('img');
        preview.className = 'preview-img';
        preview.src = canvas.toDataURL('image/jpeg', 0.95);

        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'export-btn';
        exportBtn.textContent = '导出';
        exportBtn.onclick = () => exportImage(canvas, filename);

        item.appendChild(preview);
        item.appendChild(exportBtn);
        previewContainer.appendChild(item);
      } catch (error) {
        failed += 1;
        const errorItem = document.createElement('div');
        errorItem.className = 'preview-item preview-item-error';
        errorItem.innerHTML = `<p>处理失败: ${file.name}</p><small>错误: ${error.message}</small>`;
        previewContainer.appendChild(errorItem);
      }

      completed += 1;
      loadingText.textContent = `正在处理图片 ${completed}/${total}...`;
      if (completed === total) {
        finishBatch();
      }
    };

    image.onerror = () => {
      failed += 1;
      completed += 1;
      const errorItem = document.createElement('div');
      errorItem.className = 'preview-item preview-item-error';
      errorItem.innerHTML = `<p>加载失败: ${file.name}</p><small>无法读取图片文件</small>`;
      previewContainer.appendChild(errorItem);
      if (completed === total) {
        finishBatch();
      }
    };

    image.src = URL.createObjectURL(file);
  });
}

function exportImage(canvas, filename) {
  try {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.download = filename;
    link.click();
  } catch (error) {
    alert('导出失败：' + error.message);
  }
}

async function batchDownloadImages() {
  const loadingText = document.getElementById('loadingText');
  const batchBtn = document.getElementById('batchDownloadBtn');

  loadingText.style.display = 'block';
  loadingText.textContent = '正在打包图片，请稍候...';
  batchBtn.disabled = true;

  try {
    if (processedCanvases.length === 0) {
      loadingText.textContent = '没有可下载的合成图片';
      setTimeout(() => {
        loadingText.style.display = 'none';
        batchBtn.disabled = false;
      }, 2000);
      return;
    }

    const zip = new JSZip();
    let packed = 0;

    for (const item of processedCanvases) {
      const blob = await new Promise((resolve, reject) => {
        try {
          item.canvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error('图片转换失败'));
            }
          }, 'image/jpeg', 0.95);
          setTimeout(() => reject(new Error('图片转换超时')), 10000);
        } catch (error) {
          reject(new Error('画布污染：' + error.message));
        }
      });

      zip.file(item.filename, blob);
      packed += 1;
      loadingText.textContent = `正在打包 ${packed}/${processedCanvases.length}...`;
    }

    if (packed === 0) {
      throw new Error('所有图片打包失败');
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    saveAs(zipBlob, '批量合成图片.zip');
    loadingText.textContent = '打包完成，正在下载...';
    setTimeout(() => {
      loadingText.style.display = 'none';
      batchBtn.disabled = false;
    }, 1000);
  } catch (error) {
    loadingText.textContent = '打包失败：' + error.message;
    setTimeout(() => {
      loadingText.style.display = 'none';
      batchBtn.disabled = false;
    }, 3000);
  }
}

function bindEvents() {
  document.querySelectorAll('input[name="templateType"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      if (event.target.checked) {
        loadTemplate(event.target.value);
      }
    });
  });

  document.getElementById('overlayImageUpload').addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn') || event.target.closest('.delete-btn')) {
      loadTemplate(currentTemplateId);
      return;
    }
    document.getElementById('overlayFile').click();
  });

  document.getElementById('overlayFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      overlayImage = image;
      updateOverlayPreview(image, `已加载自定义底图：${file.name}`);
    };
    image.src = URL.createObjectURL(file);
    event.target.value = '';
  });

  document.getElementById('backgroundImagesUpload').addEventListener('click', (event) => {
    if (event.target === document.getElementById('backgroundImagesUpload') || event.target.closest('.upload-placeholder')) {
      document.getElementById('backgroundFiles').click();
    }
  });

  document.getElementById('backgroundFiles').addEventListener('change', (event) => {
    handleFileUpload(event.target.files);
    event.target.value = '';
  });

  document.getElementById('folderUploadBtn').addEventListener('click', () => {
    document.getElementById('folderInput').click();
  });

  document.getElementById('folderInput').addEventListener('change', (event) => {
    handleFileUpload(event.target.files);
    event.target.value = '';
  });

  document.getElementById('processBtn').addEventListener('click', processImages);
  document.getElementById('batchDownloadBtn').addEventListener('click', batchDownloadImages);
}

window.onload = function () {
  bindEvents();
  loadTemplate('morning');
};
