import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { migrateCharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterDraftForStorage } from '@/lib/import-character-creator';
import { LEGACY_SHEET_FRONT_REPAIR_STEP, repairLegacySheetFrontConversion } from '@/lib/legacy-sheet-front-repair';
export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
export async function GET(request: Request, context: { params: Promise<{ idName: string }> }) {
  const { idName } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idName)) return NextResponse.json({ error: 'Invalid character id' }, { status: 400 });
  const version = new URL(request.url).searchParams.get('version');
  if (version && version !== 'current' && !/^[a-z0-9-]+$/i.test(version)) return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
  const current = !version || version === 'current';
  const filePath = current
    ? path.join(ROOT, idName, 'character.json')
    : path.join(ROOT, idName, 'versions', `${version}.json`);
  try {
    let draft = migrateCharacterDraft(JSON.parse(await readFile(filePath, 'utf8')));
    if (current && !draft.completedSteps.includes(LEGACY_SHEET_FRONT_REPAIR_STEP)) {
      try {
        const source = JSON.parse(await readFile(path.join(ROOT, idName, 'source-character.json'), 'utf8'));
        draft = repairLegacySheetFrontConversion(draft, source);
      } catch {}
    }
    return NextResponse.json({ idName, versionId: version ?? 'current', draft: normalizeCharacterDraftForStorage(draft) });
  }
  catch { return NextResponse.json({ error: 'Character version not found' }, { status: 404 }); }
}
