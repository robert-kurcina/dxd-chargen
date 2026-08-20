import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft } from '@/lib/character-draft';
export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
const validIdName = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export async function GET(_: Request, context: { params: Promise<{ idName: string }> }) {
  const { idName } = await context.params;
  if (!validIdName(idName)) return NextResponse.json({ error: 'Invalid character id' }, { status: 400 });
  const folder = path.join(ROOT, idName);
  try {
    const currentPath = path.join(folder, 'character.json');
    const current = migrateCharacterDraft(JSON.parse(await readFile(currentPath, 'utf8')));
    const currentStamp = current.updatedAt ?? (await stat(currentPath)).mtime.toISOString();
    let archived: Array<{ versionId: string; filename: string; updatedAt: string; name: string; properName: string; libraryTags: string[]; isCurrent: boolean }> = [];
    try {
      const files = (await readdir(path.join(folder, 'versions'))).filter((name) => /^[a-z0-9-]+\.json$/i.test(name));
      archived = await Promise.all(files.map(async (filename) => {
        const filePath = path.join(folder, 'versions', filename);
        const draft = migrateCharacterDraft(JSON.parse(await readFile(filePath, 'utf8')));
        return { versionId: filename.replace(/\.json$/i, ''), filename, updatedAt: draft.updatedAt ?? (await stat(filePath)).mtime.toISOString(), name: draft.utilities.name, properName: draft.utilities.properName, libraryTags: draft.utilities.libraryTags ?? [], isCurrent: false };
      }));
    } catch {}
    const versions = [{ versionId: 'current', filename: 'character.json', updatedAt: currentStamp, name: current.utilities.name, properName: current.utilities.properName, libraryTags: current.utilities.libraryTags ?? [], isCurrent: true }, ...archived]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ idName, versions });
  } catch { return NextResponse.json({ error: 'Character not found' }, { status: 404 }); }
}
