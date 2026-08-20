import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterDraftForStorage } from '@/lib/import-character-creator';
export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
export async function GET(request: Request, context: { params: Promise<{ idName: string }> }) {
  const { idName } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idName)) return NextResponse.json({ error: 'Invalid character id' }, { status: 400 });
  const version = new URL(request.url).searchParams.get('version');
  if (version && version !== 'current' && !/^[a-z0-9-]+$/i.test(version)) return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
  const filePath = version && version !== 'current'
    ? path.join(ROOT, idName, 'versions', `${version}.json`)
    : path.join(ROOT, idName, 'character.json');
  try { return NextResponse.json({ idName, versionId: version ?? 'current', draft: normalizeCharacterDraftForStorage(migrateCharacterDraft(JSON.parse(await readFile(filePath, 'utf8')))) }); }
  catch { return NextResponse.json({ error: 'Character version not found' }, { status: 404 }); }
}
