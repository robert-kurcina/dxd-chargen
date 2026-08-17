export function createImagePdf(pageImages: string[], imageWidth = 1200, imageHeight = 1575): Blob {
  if (!pageImages.length) throw new Error('No PDF pages were rendered.');
  const encoder = new TextEncoder();
  const objects = new Map<number, Uint8Array | { header: Uint8Array; body: Uint8Array }>();
  const pageWidth = 576;
  const pageHeight = 756;
  const pageObjects = pageImages.map((_, index) => 3 + index * 3);
  objects.set(1, encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.set(2, encoder.encode(`<< /Type /Pages /Kids [${pageObjects.map((number) => `${number} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`));
  const dataUrlBytes = (dataUrl: string) => {
    const binary = atob(dataUrl.split(',')[1] ?? '');
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  };
  pageImages.forEach((image, index) => {
    const pageObject = pageObjects[index];
    const imageObject = pageObject + 1;
    const contentObject = pageObject + 2;
    const imageBytes = dataUrlBytes(image);
    const commands = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Sheet Do\nQ`);
    objects.set(pageObject, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Sheet ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`));
    objects.set(imageObject, { header: encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`), body: imageBytes });
    objects.set(contentObject, { header: encoder.encode(`<< /Length ${commands.length} >>\nstream\n`), body: commands });
  });
  const maxObject = 2 + pageImages.length * 3;
  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0];
  let length = chunks[0].length;
  for (let number = 1; number <= maxObject; number += 1) {
    offsets[number] = length;
    const value = objects.get(number);
    if (!value) throw new Error(`Missing PDF object ${number}.`);
    const start = encoder.encode(`${number} 0 obj\n`);
    const binary = typeof (value as { body?: Uint8Array }).body !== 'undefined';
    const end = encoder.encode(binary ? '\nendstream\nendobj\n' : '\nendobj\n');
    const parts = binary
      ? [start, (value as { header: Uint8Array; body: Uint8Array }).header, (value as { header: Uint8Array; body: Uint8Array }).body, end]
      : [start, value as Uint8Array, end];
    chunks.push(...parts);
    length += parts.reduce((sum, part) => sum + part.length, 0);
  }
  const xrefOffset = length;
  const xref = [`xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`, ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(encoder.encode(`${xref}trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob(chunks, { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}
