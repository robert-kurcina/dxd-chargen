import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { default: data } = await import('../src/data/index.ts');
const { createEmptyCharacterDraft, migrateCharacterDraft } = await import('../src/lib/character-draft.ts');
const { normalizeCharacterDraftForStorage } = await import('../src/lib/import-character-creator.ts');
const { generatePreset, mechanicalPresets, normalizeGeneratedDraft, LOCK_SECTIONS } = await import('../src/lib/rules/preset-generation.ts');
const { projectCharacterSheet } = await import('../src/lib/character-sheet-projection.ts');
// Exercise the actual save normalization and file-load migration without writing user files.
for (const preset of mechanicalPresets(data)) {
  test(`${preset.name}: stored JSON preserves editable metadata and sheet projection`, () => {
    const draft = generatePreset(normalizeGeneratedDraft(createEmptyCharacterDraft(), data), data, { presetId: preset.id });
    draft.characterId = 'abcd1234';
    draft.campaignId = '7841aa01-33f4-4a90-8d13-000000000002';
    draft.creation.locks = [...LOCK_SECTIONS.Origin];
    draft.utilities.name = 'Camilla'; // A historical repair name must remain ordinary player input.
    draft.utilities.notes = 'Round-trip story: é / 星 / 🧙';
    draft.utilities.libraryTags = ['NPC', 'Round trip'];
    const saved = normalizeCharacterDraftForStorage(draft);
    assert.deepEqual(JSON.parse(JSON.stringify(saved)), JSON.parse(JSON.stringify(draft)));
    const loaded = migrateCharacterDraft(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(JSON.parse(JSON.stringify(loaded)), JSON.parse(JSON.stringify(saved)));
    for (const field of ['characterId', 'campaignId', 'creation']) assert.deepEqual(loaded[field], draft[field]);
    assert.equal(loaded.utilities.notes, draft.utilities.notes);
    assert.deepEqual(loaded.utilities.libraryTags, draft.utilities.libraryTags);
    assert.deepEqual(projectCharacterSheet(loaded, data), projectCharacterSheet(saved, data));
    assert.deepEqual(JSON.parse(JSON.stringify(normalizeCharacterDraftForStorage(loaded))), JSON.parse(JSON.stringify(saved)));
  });
}

test('Library maintenance preserves current drafts on disk and still repairs legacy imports', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { normalizeCharacterLibrary } = await import('../src/lib/import-character-creator.ts');
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-roundtrip-'));
  try {
    const preset = mechanicalPresets(data).find(item => item.name === 'Mariner');
    const draft = generatePreset(normalizeGeneratedDraft(createEmptyCharacterDraft(), data), data, { presetId: preset.id });
    const folder = path.join(root, 'abcd1234-fixture');
    await mkdir(folder);
    const filename = path.join(folder, 'character.json');
    const serialized = `${JSON.stringify(draft, null, 2)}\n`;
    await writeFile(filename, serialized);
    await normalizeCharacterLibrary(root);
    assert.equal(await readFile(filename, 'utf8'), serialized);
    const legacy = createEmptyCharacterDraft();
    legacy.background.culturalHeritageId = 'heritage-culture-herder';
    assert.equal(normalizeCharacterDraftForStorage(legacy).background.culturalHeritageId, 'heritage-culture-herding');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('backup envelope round-trip detaches file identity and rejects invalid formats', async () => {
  const { exportCharacter, importCharacter, createLibraryEntry } = await import('../src/lib/character-library.ts');
  const source = createLibraryEntry(createEmptyCharacterDraft());
  source.fileId = 'abcd1234-source'; source.draft.characterId = 'abcd1234';
  const envelope = exportCharacter(source);
  const snapshot = structuredClone(envelope);
  const imported = importCharacter(JSON.parse(JSON.stringify(envelope)));
  assert.notEqual(imported.id, source.id);
  assert.equal(imported.fileId, undefined);
  assert.equal(imported.draft.characterId, null);
  assert.deepEqual(envelope, snapshot);
  for (const invalid of [null, {}, { Name: 'Sheet' }, { ...envelope, version: 2 }, { schemaVersion: 12 }, { schemaVersion: 11 }]) assert.throws(() => importCharacter(invalid));
});
