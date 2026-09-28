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

test('browser character storage keys separate accounts and preserve the legacy guest namespace', async () => {
  const { CHARACTER_LIBRARY_STORAGE_KEY, LEGACY_DRAFT_STORAGE_KEY, characterLibraryStorageKey, legacyDraftStorageKey, characterHistoryStoragePrefix } = await import('../src/lib/character-library.ts');
  assert.equal(characterLibraryStorageKey(null), CHARACTER_LIBRARY_STORAGE_KEY);
  assert.equal(legacyDraftStorageKey(null), LEGACY_DRAFT_STORAGE_KEY);
  assert.notEqual(characterLibraryStorageKey('account-a'), characterLibraryStorageKey('account-b'));
  assert.equal(characterLibraryStorageKey('account:a'), `${CHARACTER_LIBRARY_STORAGE_KEY}:account:account%3Aa`);
  assert.notEqual(legacyDraftStorageKey('account-a'), legacyDraftStorageKey('account-b'));
  assert.notEqual(characterHistoryStoragePrefix('account-a'), characterHistoryStoragePrefix('account-b'));
  assert.equal(characterLibraryStorageKey(''), CHARACTER_LIBRARY_STORAGE_KEY, 'invalid empty identities cannot select an account cache');
});

test('stale Account Library edits detach into a durable local copy without their server identity', async () => {
  const { createLibraryEntry, preserveAccountConflict } = await import('../src/lib/character-library.ts');
  const draft = createEmptyCharacterDraft();
  draft.characterId = 'server-character-key';
  draft.utilities.name = 'Unsaved conflict edits';
  draft.utilities.notes = 'Keep every local edit when the server version has advanced.';
  const server = createLibraryEntry(draft, 'account:7841aa01-33f4-4a90-8d13-000000000099');
  server.serverRecord = { id: '7841aa01-33f4-4a90-8d13-000000000099', version: 2, isPrivate: true, mode: 'server' };
  const untouched = createLibraryEntry(createEmptyCharacterDraft(), 'local:untouched');
  const library = { schemaVersion: 1, activeId: server.id, entries: [server, untouched] };
  const preserved = preserveAccountConflict(library, server.id, true);
  assert.ok(preserved);
  assert.notEqual(preserved.activeId, server.id);
  assert.equal(preserved.entries.length, 2);
  const detached = preserved.entries.find(entry => entry.id === preserved.activeId);
  assert.ok(detached);
  assert.notEqual(detached.id, server.id);
  assert.equal(detached.serverRecord, undefined);
  assert.equal(detached.accountCopyPrivate, true, 'the intended Account Library privacy choice remains available on the detached copy');
  assert.equal(detached.fileId, undefined);
  assert.equal(detached.draft.characterId, null);
  assert.equal(detached.draft.utilities.name, 'Unsaved conflict edits');
  assert.equal(detached.draft.utilities.notes, 'Keep every local edit when the server version has advanced.');
  assert.equal(preserved.entries.find(entry => entry.id === untouched.id), untouched);
  assert.equal(library.entries[0], server, 'the original library remains unchanged');
  assert.equal(preserveAccountConflict(library, 'missing'), null);
  const latestServer = createLibraryEntry(createEmptyCharacterDraft(), server.id);
  latestServer.serverRecord = { id: server.serverRecord.id, version: 3, isPrivate: false, mode: 'server' };
  const browserDurable = (await import('../src/lib/character-library.ts')).browserPersistedLibrary(preserved);
  assert.equal(browserDurable.entries.some(entry => entry.id === detached.id), true, 'conflicted local edits survive reload');
  assert.equal(browserDurable.entries.find(entry => entry.id === detached.id)?.accountCopyPrivate, true);
  const bothCopies = { ...preserved, entries: [...preserved.entries, latestServer] };
  assert.equal(bothCopies.entries.some(entry => entry.id === detached.id), true);
  assert.equal(bothCopies.entries.some(entry => entry.serverRecord?.version === 3), true);
});

test('backup envelope round-trip detaches file identity and rejects invalid formats', async () => {
  const { exportCharacter, importCharacter, createLibraryEntry, migrateCharacterLibrary, browserPersistedLibrary } = await import('../src/lib/character-library.ts');
  const source = createLibraryEntry(createEmptyCharacterDraft());
  source.fileId = 'abcd1234-source'; source.draft.characterId = 'abcd1234';
  source.accountTargetCampaignId = '7841aa01-33f4-4a90-8d13-000000000098';
  source.accountTargetCampaignName = 'Test campaign';
  source.serverRecord = { id: '7841aa01-33f4-4a90-8d13-000000000099', version: 4, isPrivate: true, mode: 'copy' };
  const serverEntry = { ...createLibraryEntry(createEmptyCharacterDraft(), 'account:7841aa01-33f4-4a90-8d13-000000000099'), serverRecord: { ...source.serverRecord, mode: 'server' } };
  const mixedLibrary = { schemaVersion: 1, activeId: serverEntry.id, entries: [source, serverEntry] };
  const browserCopy = browserPersistedLibrary(mixedLibrary);
  assert.deepEqual(browserCopy.entries.map(entry => entry.id), [source.id]);
  assert.equal(browserCopy.activeId, source.id);
  const serverOnly = browserPersistedLibrary({ ...mixedLibrary, entries: [serverEntry] });
  assert.equal(serverOnly.entries.some(entry => entry.serverRecord?.mode === 'server'), false);
  const migrated = migrateCharacterLibrary({ schemaVersion: 1, activeId: source.id, entries: [source] });
  assert.deepEqual(migrated.entries[0].serverRecord, source.serverRecord, 'account version link survives local storage migration');
  assert.equal(migrated.entries[0].accountTargetCampaignId, source.accountTargetCampaignId, 'selected account campaign survives local storage migration');
  assert.equal(migrated.entries[0].accountTargetCampaignName, source.accountTargetCampaignName, 'selected campaign name survives local storage migration');
  const envelope = exportCharacter(source);
  assert.equal('serverRecord' in envelope.character, false, 'backup is a detached copy, not a link to the account record');
  assert.equal('accountTargetCampaignId' in envelope.character, false, 'backup is not coupled to an account campaign');
  assert.equal('accountTargetCampaignName' in envelope.character, false, 'backup is not coupled to an account campaign');
  assert.equal('accountCopyPrivate' in envelope.character, false, 'backup is not coupled to an Account Library privacy setting');
  const snapshot = structuredClone(envelope);
  const imported = importCharacter(JSON.parse(JSON.stringify(envelope)));
  assert.notEqual(imported.id, source.id);
  assert.equal(imported.fileId, undefined);
  assert.equal(imported.draft.characterId, null);
  assert.deepEqual(envelope, snapshot);
  for (const invalid of [null, {}, { Name: 'Sheet' }, { ...envelope, version: 2 }, { schemaVersion: 12 }, { schemaVersion: 11 }]) assert.throws(() => importCharacter(invalid));
});
