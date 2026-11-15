import { removeBackground } from '@imgly/background-removal';

const DEFAULT_PUBLIC_PATH =
  'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

function resolvePublicPath() {
  if (typeof window !== 'undefined' && window.D11_CUTOUT_PUBLIC_PATH) {
    return String(window.D11_CUTOUT_PUBLIC_PATH).replace(/\/?$/, '/');
  }
  return DEFAULT_PUBLIC_PATH;
}

async function run(source, onProgress, device) {
  return removeBackground(source, {
    publicPath: resolvePublicPath(),
    model: 'isnet_fp16',
    device: device === 'cpu' ? 'cpu' : 'gpu',
    output: {
      format: 'image/png',
      type: 'foreground'
    },
    progress: typeof onProgress === 'function' ? onProgress : undefined
  });
}

const api = { run, resolvePublicPath };
if (typeof window !== 'undefined') {
  window.CongratsCutout = api;
}

export default api;
