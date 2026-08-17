import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterDraftForStorage } from '@/lib/import-character-creator';
import { cleanLibraryTags } from '@/lib/admin-settings';

export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
const safeId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;

export async function PATCH(request: Request) {
  const body = await request.json() as { updates?: Array<{ idName?: string; libraryTags?: unknown }> };
  if (!Array.isArray(body.updates) || !body.updates.length) return NextResponse.json({ error: 'No tag updates supplied.' }, { status: 400 });
  const updates = body.updates.map((update) => ({ idName: safeId(update.idName), libraryTags: cleanLibraryTags(update.libraryTags) }));
  if (updates.some((update) => !update.idName)) return NextResponse.json({ error: 'Invalid character id.' }, { status: 400 });

  let updated = 0;
  for (const update of updates) {
    const idName = update.idName!;
    try {
      const filename = path.join(ROOT, idName, 'character.json');
      const draft = normalizeCharacterDraftForStorage(migrateCharacterDraft(JSON.parse(await readFile(filename, 'utf8'))));
      const next = { ...draft, utilities: { ...draft.utilities, libraryTags: update.libraryTags } };
      await writeFile(filename, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      updated += 1;
    } catch {
      return NextResponse.json({ error: `Character not found: ${idName}` }, { status: 404 });
    }
  }
  return NextResponse.json({ updated });
}
