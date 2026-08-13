import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft } from '@/lib/character-draft';
export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
export async function GET(_: Request, context: { params: Promise<{ idName: string }> }) {
  const { idName } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idName)) return NextResponse.json({ error: 'Invalid character id' }, { status: 400 });
  try { return NextResponse.json({ idName, draft: migrateCharacterDraft(JSON.parse(await readFile(path.join(ROOT, idName, 'character.json'), 'utf8'))) }); }
  catch { return NextResponse.json({ error: 'Character not found' }, { status: 404 }); }
}
