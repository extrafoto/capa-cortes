export function cropArea(imageWidth, imageHeight, ratio, zoom, x, y) {
  const baseW = Math.min(imageWidth, imageHeight * ratio); const baseH = baseW / ratio;
  const width = baseW / zoom, height = baseH / zoom;
  return { width, height, x: Math.max(0, Math.min(imageWidth - width, x)), y: Math.max(0, Math.min(imageHeight - height, y)) };
}

export function drawCrop(context, image, area, output) {
  context.canvas.width = output.width; context.canvas.height = output.height;
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, output.width, output.height);
}
