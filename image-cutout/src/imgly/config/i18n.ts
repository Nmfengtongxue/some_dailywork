/**
 * zh / en translations for the local CE.SDK editor.
 * @see https://img.ly/docs/cesdk/js/user-interface/localization-508e20/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

const SHARED = {
  'libraries.ly.img.templates.label': { zh: '模板', en: 'Templates' },
  'component.library.elements': { zh: '元素', en: 'Elements' },
  'libraries.ly.img.upload.label': { zh: '上传', en: 'Uploads' },
  'libraries.ly.img.image.label': { zh: '图片', en: 'Images' },
  'libraries.ly.img.text.label': { zh: '文字', en: 'Text' },
  'libraries.ly.img.vector.shape.label': { zh: '形状', en: 'Shapes' },
  'libraries.ly.img.sticker.label': { zh: '贴纸', en: 'Stickers' },
  'component.layerList': { zh: '图层', en: 'Layers' },
  'component.fileOperation.exportImage': { zh: '导出图片', en: 'Export Images' },
  'component.fileOperation.exportPDF': { zh: '导出 PDF', en: 'Export PDF' },
  'component.fileOperation.exportVideo': { zh: '导出视频', en: 'Export Video' },
  'component.undo': { zh: '撤销', en: 'Undo' },
  'component.redo': { zh: '重做', en: 'Redo' },
  'common.undo': { zh: '撤销', en: 'Undo' },
  'common.redo': { zh: '重做', en: 'Redo' },
  'common.done': { zh: '完成', en: 'Done' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.apply': { zh: '应用', en: 'Apply' },
  'common.delete': { zh: '删除', en: 'Delete' },
  'common.duplicate': { zh: '复制', en: 'Duplicate' },
  'common.replace': { zh: '替换', en: 'Replace' },
  'common.edit': { zh: '编辑', en: 'Edit' },
  'common.upload': { zh: '上传', en: 'Upload' },
  'common.download': { zh: '下载', en: 'Download' },
  'common.back': { zh: '返回', en: 'Back' },
  'common.close': { zh: '关闭', en: 'Close' },
  'common.search': { zh: '搜索', en: 'Search' },
  'common.preview': { zh: '预览', en: 'Preview' },
  'action.export.image': { zh: '导出图片', en: 'Export Images' },
  'action.export.pdf': { zh: '导出 PDF', en: 'Export PDF' },
  'zoom.auto': { zh: '自适应', en: 'Auto' },
  'component.zoom.auto': { zh: '自适应', en: 'Auto' },
  'component.zoom.in': { zh: '放大', en: 'Zoom in' },
  'component.zoom.out': { zh: '缩小', en: 'Zoom out' },
  'component.documentSettings': { zh: '文档', en: 'Document' },
  'document.title': { zh: '文档', en: 'Document' },
  'block.scene': { zh: '文档', en: 'Document' },
  'component.undo.undo': { zh: '撤销', en: 'Undo' },
  'component.undo.redo': { zh: '重做', en: 'Redo' },
  'component.zoom.label.auto': { zh: '自适应', en: 'Auto' },
  'component.zoom.autoFit': { zh: '适应页面', en: 'Auto-Fit Page' },
  'component.zoom.fitPage': { zh: '适合页面', en: 'Fit Page' },
  'component.zoom.fitSelection': { zh: '适合选区', en: 'Fit Selection' },
  'component.zoom.in': { zh: '放大', en: 'Zoom In' },
  'component.zoom.out': { zh: '缩小', en: 'Zoom Out' },
  'component.zoom.options': { zh: '更多缩放选项', en: 'See more zoom options' },
  'common.export': { zh: '导出', en: 'Export' },
  'component.fileOperation.exportScene': { zh: '导出设计', en: 'Export Design' },
  'component.fileOperation.more': { zh: '更多操作', en: 'Show more options' },
  'libraries.ly.img.pageFormats.label': { zh: '页面尺寸', en: 'Page formats' },
  'libraries.ly.img.cropPresets.label': { zh: '裁切比例', en: 'Crop presets' },
  'libraries.ly.img.filter.label': { zh: '滤镜', en: 'Filters' },
  'libraries.ly.img.effect.label': { zh: '效果', en: 'Effects' },
  'libraries.ly.img.blur.label': { zh: '模糊', en: 'Blur' },
  'libraries.ly.img.typeface.label': { zh: '字体', en: 'Typeface' },
  'plugin.@imgly/plugin-background-removal-web.fillProcessing.canvasMenu.button.label': {
    zh: '去除背景',
    en: 'Remove BG'
  },
  'plugin.@imgly/plugin-background-removal-web.fillProcessing.inspectorBar.button.label': {
    zh: '去除背景',
    en: 'Remove BG'
  },
  'plugin.@imgly/plugin-background-removal-web.fillProcessing.navigationBar.button.label': {
    zh: '去除背景',
    en: 'Remove BG'
  },
  'plugin.@imgly/plugin-background-removal-web.fillProcessing.canvasBar.button.label': {
    zh: '去除背景',
    en: 'Remove BG'
  },
  'plugin.@imgly/plugin-background-removal-web.fillProcessing.dock.button.label': {
    zh: '去除背景',
    en: 'Remove BG'
  },
  'image-cutout.locale.switch': { zh: 'English', en: '中文' },
  'image-cutout.locale.tooltip': {
    zh: '切换到 English',
    en: 'Switch to 中文'
  },
  'image-cutout.tryMore': { zh: '试试更多示例', en: 'Try more examples.' }
} as const;

function pack(locale: 'zh' | 'en'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(SHARED)) {
    out[key] = value[locale];
  }
  return out;
}

export function setupTranslations(cesdk: CreativeEditorSDK): void {
  cesdk.i18n.setTranslations({
    zh: pack('zh'),
    en: pack('en')
  });

  const saved = localStorage.getItem('image-cutout-locale');
  cesdk.i18n.setLocale(saved === 'en' ? 'en' : 'zh');
}

export function setupLocaleSwitch(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerComponent(
    'image-cutout.locale.navigationBar',
    ({ builder: { Button } }) => {
      const locale = cesdk.i18n.getLocale();
      Button('image-cutout.locale.toggle', {
        label: 'image-cutout.locale.switch',
        tooltip: 'image-cutout.locale.tooltip',
        onClick: () => {
          const next = locale === 'zh' ? 'en' : 'zh';
          cesdk.i18n.setLocale(next);
          localStorage.setItem('image-cutout-locale', next);
        }
      });
    }
  );
}
