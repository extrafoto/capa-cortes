// JPEG metadata lives in APPn marker segments. Canvas drops them; retain safe
// editorial blocks and update no technical EXIF fields that we cannot validate.
const marker = (bytes, index) => bytes[index] === 0xff && bytes[index + 1] >= 0xe0 && bytes[index + 1] <= 0xef;
const has = (bytes, start, text) => text.split('').every((c, i) => bytes[start + i] === c.charCodeAt(0));

export function collectMetadata(jpeg) {
  const bytes = new Uint8Array(jpeg);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('O arquivo não é um JPEG válido.');
  const segments = []; let i = 2;
  while (i + 4 < bytes.length && marker(bytes, i)) {
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > bytes.length) break;
    const app = bytes[i + 1]; const payload = i + 4;
    const isExif = app === 0xe1 && has(bytes, payload, 'Exif\0\0');
    const isXmp = app === 0xe1 && has(bytes, payload, 'http://ns.adobe.com/xap/1.0/\0');
    const isIptc = app === 0xed && has(bytes, payload, 'Photoshop 3.0\0');
    // EXIF contains dimensions/thumbnail that can be stale after crop; retain XMP/IPTC.
    if (isXmp || isIptc) segments.push(bytes.slice(i, i + length + 2));
    i += length + 2;
  }
  return { segments, found: { exif: contains(bytes, 'Exif\0\0'), xmp: segments.some(s => has(s, 4, 'http://ns.adobe.com/xap/1.0/\0')), iptc: segments.some(s => has(s, 4, 'Photoshop 3.0\0')) } };
}

function contains(bytes, text) { const t = [...text].map(c => c.charCodeAt(0)); return bytes.some((_, i) => t.every((v, j) => bytes[i + j] === v)); }

export function injectMetadata(canvasJpeg, metadata) {
  const source = new Uint8Array(canvasJpeg); const retained = metadata.segments || [];
  const bytes = new Uint8Array(2 + retained.reduce((n, s) => n + s.length, 0) + source.length - 2);
  bytes.set(source.slice(0, 2)); let offset = 2;
  retained.forEach(s => { bytes.set(s, offset); offset += s.length; }); bytes.set(source.slice(2), offset);
  return bytes;
}

export function validateMetadata(jpeg, expected) {
  const bytes = new Uint8Array(jpeg); const xmp = contains(bytes, 'http://ns.adobe.com/xap/1.0/\0'); const iptc = contains(bytes, 'Photoshop 3.0\0');
  return { xmp: !expected.found.xmp || xmp, iptc: !expected.found.iptc || iptc, exif: !expected.found.exif, complete: (!expected.found.xmp || xmp) && (!expected.found.iptc || iptc) };
}
