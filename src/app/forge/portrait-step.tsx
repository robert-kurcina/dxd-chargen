'use client';

import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CharacterDraft } from '@/lib/character-draft';
import SuspenseSpinner from '@/components/suspense-spinner';

// Portrait output configuration. Change dimensions here; the GUI intentionally
// does not expose output dimensions.
export const PORTRAIT_CONFIG = { width: 294, height: 248, mimeType: 'image/jpeg', quality: 0.9 } as const;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (source.startsWith('http')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function croppedDataUrl(source: string, area: Area, rotation: number) {
  const image = await loadImage(source);
  const radians = rotation * Math.PI / 180;
  const boundWidth = Math.abs(Math.cos(radians) * image.width) + Math.abs(Math.sin(radians) * image.height);
  const boundHeight = Math.abs(Math.sin(radians) * image.width) + Math.abs(Math.cos(radians) * image.height);
  const rotated = document.createElement('canvas');
  rotated.width = Math.ceil(boundWidth);
  rotated.height = Math.ceil(boundHeight);
  const rotatedContext = rotated.getContext('2d');
  if (!rotatedContext) throw new Error('Canvas unavailable');
  rotatedContext.translate(rotated.width / 2, rotated.height / 2);
  rotatedContext.rotate(radians);
  rotatedContext.drawImage(image, -image.width / 2, -image.height / 2);

  const output = document.createElement('canvas');
  output.width = PORTRAIT_CONFIG.width;
  output.height = PORTRAIT_CONFIG.height;
  const context = output.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, output.width, output.height);
  return output.toDataURL(PORTRAIT_CONFIG.mimeType, PORTRAIT_CONFIG.quality);
}

export default function PortraitStep({ draft, setDraft }: { draft: CharacterDraft; setDraft: Dispatch<SetStateAction<CharacterDraft>> }) {
  const [source, setSource] = useState(draft.utilities.portraitDataUrl);
  const [url, setUrl] = useState('');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const [savingPortrait, setSavingPortrait] = useState(false);
  const [sourceLoaded, setSourceLoaded] = useState(!source);

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith('image/')) return setError('Choose an image file.');
    setReadingImage(true);
    setSourceLoaded(false);
    const reader = new FileReader();
    reader.onload = () => { const portraitSourceDataUrl = String(reader.result); setSource(portraitSourceDataUrl); setDraft((current) => ({ ...current, utilities: { ...current.utilities, portraitSourceDataUrl } })); setError(''); setReadingImage(false); };
    reader.onerror = () => { setError('The image could not be read.'); setReadingImage(false); };
    reader.readAsDataURL(file);
  };
  const save = async () => {
    if (!source || !area || savingPortrait) return;
    setSavingPortrait(true);
    try {
      const portraitDataUrl = await croppedDataUrl(source, area, rotation);
      setDraft((current) => ({ ...current, utilities: { ...current.utilities, portraitDataUrl } }));
      setError('');
    } catch {
      setError('This URL does not permit browser image export. Download it and use Upload instead.');
    } finally {
      setSavingPortrait(false);
    }
  };

  return <div className="space-y-4">
    <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"><div className="space-y-2"><label htmlFor="portrait-upload" className="text-sm font-medium">Upload image</label><Input id="portrait-upload" type="file" accept="image/*" disabled={readingImage} onChange={loadFile} />{readingImage && <SuspenseSpinner compact label="Reading image…" className="justify-start" />}</div><div className="space-y-2"><label htmlFor="portrait-url" className="text-sm font-medium">Image URL</label><div className="flex gap-2"><Input id="portrait-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /><Button type="button" variant="outline" onClick={() => { const portraitSourceDataUrl = url.trim(); setSourceLoaded(false); setSource(portraitSourceDataUrl); setDraft((current) => ({ ...current, utilities: { ...current.utilities, portraitSourceDataUrl } })); setError(''); }}>Load</Button></div></div></section>
    {source && <section className="grid gap-4 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_240px]"><div className="relative h-[min(480px,60dvh)] overflow-hidden rounded bg-muted">{!sourceLoaded && <SuspenseSpinner label="Loading portrait…" className="absolute inset-0 z-10 bg-muted" />}<div className={!sourceLoaded ? 'invisible h-full' : 'h-full'}><Cropper image={source} crop={crop} zoom={zoom} rotation={rotation} aspect={PORTRAIT_CONFIG.width / PORTRAIT_CONFIG.height} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={(_, pixels) => setArea(pixels)} onMediaLoaded={() => setSourceLoaded(true)} /></div></div><div className="space-y-4"><div><label htmlFor="portrait-zoom" className="text-sm font-medium">Zoom</label><Input id="portrait-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></div><div><label htmlFor="portrait-rotation" className="text-sm font-medium">Rotation</label><Input id="portrait-rotation" type="range" min="-180" max="180" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} /></div><p className="text-xs text-muted-foreground">Drag the image to position it. Touch gestures and mouse-wheel zoom are supported.</p><Button type="button" disabled={savingPortrait || !sourceLoaded} onClick={save}>{savingPortrait ? <SuspenseSpinner compact label="Saving portrait…" className="text-current" /> : 'Crop and save portrait'}</Button><Button type="button" variant="outline" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, portraitDataUrl: '', portraitSourceDataUrl: '' } }))}>Clear portrait</Button></div></section>}
    {draft.utilities.portraitDataUrl && <section className="space-y-2 rounded-lg border p-4"><div className="font-medium">Saved portrait</div><img src={draft.utilities.portraitDataUrl} alt="Saved character portrait" width={PORTRAIT_CONFIG.width} height={PORTRAIT_CONFIG.height} className="h-auto max-w-full rounded border" /></section>}
    {error && <p className="text-sm text-[#990000]" role="alert">{error}</p>}
  </div>;
}
