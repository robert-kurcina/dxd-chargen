import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterLibrary } from '@/lib/import-character-creator';

export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
const safeName = (value: string) => value.normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'unnamed';
const safeId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;
function decodeDataUrl(value: string) { const match = value.match(/^data:([^;,]+);base64,(.+)$/); return match ? { mime: match[1], bytes: Buffer.from(match[2], 'base64') } : null; }
function extension(mime: string) { return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'; }
async function metadata(idName: string) {
  const folder = path.join(ROOT, idName);
  const draft = migrateCharacterDraft(JSON.parse(await readFile(path.join(folder, 'character.json'), 'utf8')));
  const files = await readdir(folder);
  const portrait = files.find((name) => /^portrait\.(?:png|jpe?g|webp)$/i.test(name));
  return { idName, name: draft.utilities.name || '', properName: draft.utilities.properName || '', speciesId: draft.intrinsics.speciesId, lineageId: draft.intrinsics.lineageId, tradeId: draft.intrinsics.tradeId, professionId: draft.intrinsics.specializationId, childOfStrife: draft.intrinsics.childOfStrife, strifePairingId: draft.intrinsics.strifePairingId, strifeFatherLineageId: draft.intrinsics.strifeFatherLineageId, strifeMotherLineageId: draft.intrinsics.strifeMotherLineageId, thumbnailUrl: portrait ? `/api/character-files/${encodeURIComponent(idName)}/image/${encodeURIComponent(portrait)}` : null, updatedAt: (await stat(path.join(folder, 'character.json'))).mtime.toISOString() };
}
export async function GET() {
  await mkdir(ROOT, { recursive: true });
  // Apply safe normalization aliases to persisted character records.
  await normalizeCharacterLibrary(ROOT);
  const entries = await readdir(ROOT, { withFileTypes: true });
  const characters = (await Promise.all(entries.filter((entry) => entry.isDirectory() && safeId(entry.name)).map(async (entry) => { try { return await metadata(entry.name); } catch { return null; } }))).filter(Boolean).sort((a, b) => a!.idName.localeCompare(b!.idName, undefined, { numeric: true, sensitivity: 'base' }));
  return NextResponse.json({ characters });
}
export async function POST(request: Request) {
  const body = await request.json() as { idName?: string | null; draft?: CharacterDraft };
  const draft = migrateCharacterDraft(body.draft);
  await mkdir(ROOT, { recursive: true });
  const previous = safeId(body.idName);
  const stableId = previous?.split('-')[0] || randomUUID().replace(/-/g, '').slice(0, 8);
  const idName = `${stableId}-${safeName(draft.utilities.name)}`;
  const folder = path.join(ROOT, idName);
  if (previous && previous !== idName) { try { await rename(path.join(ROOT, previous), folder); } catch { await mkdir(folder, { recursive: true }); } } else await mkdir(folder, { recursive: true });
  const cropped = decodeDataUrl(draft.utilities.portraitDataUrl);
  if (cropped) await writeFile(path.join(folder, `portrait.${extension(cropped.mime)}`), cropped.bytes);
  const sourceValue = draft.utilities.portraitSourceDataUrl ?? '';
  const source = decodeDataUrl(sourceValue);
  if (source) await writeFile(path.join(folder, `source-image.${extension(source.mime)}`), source.bytes);
  else if (/^https?:\/\//i.test(sourceValue)) await writeFile(path.join(folder, 'source-image.url'), `${sourceValue}\n`, 'utf8');
  await writeFile(path.join(folder, 'character.json'), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  return NextResponse.json({ idName, character: await metadata(idName) });
}
