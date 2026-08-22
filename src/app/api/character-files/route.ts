import { randomUUID } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterDraftForStorage, normalizeCharacterLibrary } from '@/lib/import-character-creator';

export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
const safeName = (value: string) => value.normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'unnamed';
const safeId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;
const safeCharacterId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]{8,64}$/i.test(value) ? value.toLowerCase() : null;
async function folderForCharacterId(characterId: string) {
  try {
    const entries = await readdir(ROOT, { withFileTypes: true });
    return entries.find((entry) => entry.isDirectory() && entry.name.startsWith(`${characterId}-`) && safeId(entry.name))?.name ?? null;
  } catch {
    return null;
  }
}
function decodeDataUrl(value: string) { const match = value.match(/^data:([^;,]+);base64,(.+)$/); return match ? { mime: match[1], bytes: Buffer.from(match[2], 'base64') } : null; }
function extension(mime: string) { return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'; }
async function versionCount(folder: string) {
  try { return 1 + (await readdir(path.join(folder, 'versions'), { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length; }
  catch { return 1; }
}
async function metadata(idName: string) {
  const folder = path.join(ROOT, idName);
  const characterPath = path.join(folder, 'character.json');
  const draft = migrateCharacterDraft(JSON.parse(await readFile(characterPath, 'utf8')));
  const files = await readdir(folder);
  const portrait = files.find((name) => /^portrait\.(?:png|jpe?g|webp)$/i.test(name));
  const fileStat = await stat(characterPath);
  return {
    idName,
    characterId: draft.characterId ?? idName.split('-')[0],
    versionCount: await versionCount(folder),
    name: draft.utilities.name || '', properName: draft.utilities.properName || '', speciesId: draft.intrinsics.speciesId,
    lineageId: draft.intrinsics.lineageId, tradeId: draft.intrinsics.tradeId, professionId: draft.intrinsics.specializationId,
    libraryTags: draft.utilities.libraryTags ?? [], childOfStrife: draft.intrinsics.childOfStrife, strifePairingId: draft.intrinsics.strifePairingId,
    strifeFatherLineageId: draft.intrinsics.strifeFatherLineageId, strifeMotherLineageId: draft.intrinsics.strifeMotherLineageId,
    thumbnailUrl: portrait ? `/api/character-files/${encodeURIComponent(idName)}/image/${encodeURIComponent(portrait)}` : null,
    updatedAt: draft.updatedAt ?? fileStat.mtime.toISOString(),
  };
}
async function archiveCurrentVersion(folder: string) {
  const characterPath = path.join(folder, 'character.json');
  try {
    const raw = await readFile(characterPath, 'utf8');
    const existing = migrateCharacterDraft(JSON.parse(raw));
    const versions = path.join(folder, 'versions');
    await mkdir(versions, { recursive: true });
    const stamp = (existing.updatedAt ?? (await stat(characterPath)).mtime.toISOString()).replace(/[^0-9]/g, '').slice(0, 17) || Date.now().toString();
    const versionId = `${stamp}-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await writeFile(path.join(versions, `${versionId}.json`), raw.endsWith('\n') ? raw : `${raw}\n`, 'utf8');
    return versionId;
  } catch { return null; }
}
export async function GET() {
  await mkdir(ROOT, { recursive: true });
  await normalizeCharacterLibrary(ROOT);
  const entries = await readdir(ROOT, { withFileTypes: true });
  const characters = (await Promise.all(entries.filter((entry) => entry.isDirectory() && safeId(entry.name)).map(async (entry) => { try { return await metadata(entry.name); } catch { return null; } }))).filter(Boolean).sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime() || a!.idName.localeCompare(b!.idName, undefined, { numeric: true, sensitivity: 'base' }));
  return NextResponse.json({ characters });
}
export async function POST(request: Request) {
  const body = await request.json() as { idName?: string | null; draft?: CharacterDraft };
  let draft = normalizeCharacterDraftForStorage(migrateCharacterDraft(body.draft));
  await mkdir(ROOT, { recursive: true });
  const requestedPrevious = safeId(body.idName);
  const embeddedCharacterId = safeCharacterId(draft.characterId);
  const requestedCharacterId = requestedPrevious?.split('-')[0] ?? null;
  const stableId = requestedCharacterId || embeddedCharacterId || randomUUID().replace(/-/g, '').slice(0, 8);
  const discoveredPrevious = requestedPrevious ?? await folderForCharacterId(stableId);
  draft = { ...draft, characterId: stableId, updatedAt: new Date().toISOString() };
  const idName = `${stableId}-${safeName(draft.utilities.name)}`;
  let folder = path.join(ROOT, discoveredPrevious ?? idName);
  await mkdir(folder, { recursive: true });
  await archiveCurrentVersion(folder);
  if (discoveredPrevious && discoveredPrevious !== idName) {
    const target = path.join(ROOT, idName);
    try { await rename(folder, target); folder = target; }
    catch { await mkdir(target, { recursive: true }); try { await cp(folder, target, { recursive: true, force: false, errorOnExist: false }); await rm(folder, { recursive: true, force: true }); } catch {} folder = target; }
  } else if (!discoveredPrevious) folder = path.join(ROOT, idName);
  await mkdir(folder, { recursive: true });
  const cropped = decodeDataUrl(draft.utilities.portraitDataUrl);
  if (cropped) await writeFile(path.join(folder, `portrait.${extension(cropped.mime)}`), cropped.bytes);
  const sourceValue = draft.utilities.portraitSourceDataUrl ?? '';
  const source = decodeDataUrl(sourceValue);
  if (source) await writeFile(path.join(folder, `source-image.${extension(source.mime)}`), source.bytes);
  else if (/^https?:\/\//i.test(sourceValue)) await writeFile(path.join(folder, 'source-image.url'), `${sourceValue}\n`, 'utf8');
  await writeFile(path.join(folder, 'character.json'), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  return NextResponse.json({ idName, draft, character: await metadata(idName) });
}
