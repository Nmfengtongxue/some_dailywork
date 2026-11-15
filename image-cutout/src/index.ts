/**
 * 本地 IMG.LY CE.SDK 抠图编辑器（large 模型）
 * @see https://img.ly/docs/cesdk/js/edit-image/remove-bg-9dfcf7/
 */

import CreativeEditorSDK from '@cesdk/cesdk-js';

import { initBackgroundRemovalEditor } from './imgly';
import { DEMO_ASSETS_BASE_URL } from './imgly/demo-assets';

const CESDK_VERSION = CreativeEditorSDK.version || '1.85.3';

const config = {
  userId: 'local-image-cutout-user',
  baseURL: `https://cdn.img.ly/packages/imgly/cesdk-js/${CESDK_VERSION}/assets`,
  callbacks: {
    onUpload: 'local' as const
  }
};

const boot = document.getElementById('cutoutBoot');

CreativeEditorSDK.create('#cesdk_container', config)
  .then(async (cesdk) => {
    await initBackgroundRemovalEditor(cesdk);

    try {
      await cesdk.load(`${DEMO_ASSETS_BASE_URL}/assets/scene.scene`);
    } catch (sceneError) {
      console.warn('Demo scene failed, creating a blank page instead.', sceneError);
      await cesdk.createDesignScene();
    }

    boot?.setAttribute('hidden', '');
  })
  .catch((error) => {
    console.error('Failed to initialize CE.SDK:', error);
    if (boot) {
      boot.innerHTML = `<div class="cutout-boot__card">
        <h1>编辑器加载失败</h1>
        <p>${String(error?.message || error)}</p>
        <p>请确认本机可访问 cdn.img.ly / staticimgly.com，然后刷新重试。</p>
      </div>`;
    }
  });
