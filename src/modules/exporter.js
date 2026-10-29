import { drawCrop } from './crop-engine.js';
import { injectMetadata, validateMetadata } from './metadata-handler.js';
export async function makeExport(image, area, preset, metadata) {
  const canvas = document.createElement('canvas'); drawCrop(canvas.getContext('2d'), image, area, preset);
  const raw = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
  const combined = injectMetadata(await raw.arrayBuffer(), metadata);
  return { blob: new Blob([combined], { type: 'image/jpeg' }), validation: validateMetadata(combined, metadata) };
}
