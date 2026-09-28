'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import SuspenseSpinner from '@/components/suspense-spinner';
import { useRouter } from 'next/navigation';
import type { StaticData } from '@/data';
import { createEmptyCharacterDraft, migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { createLibraryEntry, importCharacter, exportCharacter, activeLibraryEntry, browserPersistedLibrary, CHARACTER_LIBRARY_STORAGE_KEY, LEGACY_DRAFT_STORAGE_KEY, migrateCharacterLibrary, PENDING_FILE_LOAD_STORAGE_KEY, updateActiveDraft, type CharacterLibraryState } from '@/lib/character-library';
import { syncHeritageGrantedSelections } from '@/lib/rules/background';
import { syncIntrinsics } from '@/lib/rules/intrinsics';
import { syncProficiencies } from '@/lib/rules/proficiencies';
import { syncProperties } from '@/lib/rules/properties';
import { syncUtilities } from '@/lib/rules/utilities';
import { ADMIN_SETTINGS_EVENT, readAdminSettings, sortLibraryTags } from '@/lib/admin-settings';

import { originAllowed, originChangeAllowed } from '@/lib/campaign-origins';
import { GenerationConflict, creationContext, seedForCharacter, LOCK_SECTIONS } from '@/lib/rules/preset-generation';
import { LOCAL_CAMPAIGNS, CAMPAIGN_SELECTION_KEY, localCampaign } from '@/lib/local-campaigns';
import { emptyHistory, recordEdit, travel, packHistory, unpackHistory, type History, type Json } from '@/lib/draft-history';

const historyKey = (id: string) => `dxd-character-history-v1:${id}`;
const snapshot = (draft: CharacterDraft): Json => JSON.parse(JSON.stringify({ ...draft, updatedAt: null, characterId: null }));

function normalizeDraft(draft: CharacterDraft, data: StaticData) { return syncUtilities(syncProperties(syncProficiencies(syncIntrinsics(syncHeritageGrantedSelections(draft, data), data), data), data), data); }
const comparableDraft = (draft: CharacterDraft) => JSON.stringify({ ...draft, updatedAt: '' });
const INITIAL_TIMESTAMP = '1970-01-01T00:00:00.000Z';
function initialLibraryState(): CharacterLibraryState { return { schemaVersion: 1, activeId: 'initial', entries: [{ id: 'initial', createdAt: INITIAL_TIMESTAMP, updatedAt: INITIAL_TIMESTAMP, draft: createEmptyCharacterDraft() }] }; }

type WorkspaceContextValue = {
  selectedCampaign: typeof LOCAL_CAMPAIGNS[number];
  selectCampaign: (id: string) => void;
  createInCampaign: (origin?: CharacterDraft['background']) => void;
  createAccountCampaignDraft: (campaign: { id: string; name: string; lifecycle: 'preparing' | 'active' | 'archived'; isDefault?: boolean; canConfigure?: boolean }) => void;
  localEntries: CharacterLibraryState['entries'];
  openLocalDraft: (id: string) => void;
  downloadBackup: () => void;
  restoreBackup: (text: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  rememberHistory: boolean;
  setRememberHistory: (value: boolean) => void;
  historyNotice: string;
  storageWarning: string;
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  activeFileId: string | null;
  dirty: boolean;
  message: string;
  setMessage: (value: string) => void;
  availableTags: string[];
  libraryRefresh: number;
  saving: boolean;
  reverting: boolean;
  save: () => Promise<boolean>;
  revert: () => Promise<void>;
  reset: () => void;
  loadDraft: (idName: string, value: CharacterDraft) => void;
  loadAccountDraft: (id: string, value: CharacterDraft, version: number, isPrivate: boolean) => void;
  saveAccount: () => Promise<boolean>;
  isAccountCharacter: boolean;
  accountServerOnly: boolean;
  hasAccountRecord: boolean;
  accountDirty: boolean;
  accountPrivate: boolean;
  setAccountPrivate: (value: boolean) => void;
  online: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ data, children }: { data: StaticData; children: React.ReactNode }) {
  const router = useRouter();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(LOCAL_CAMPAIGNS[1].id);
  const selectedCampaign = localCampaign(selectedCampaignId);
  const selectCampaign = (id: string) => {
    const campaign = localCampaign(id);
    setSelectedCampaignId(campaign.id);
    try { window.localStorage.setItem(CAMPAIGN_SELECTION_KEY, campaign.id); }
    catch { setStorageWarning('Campaign selection could not be remembered in this browser.'); }
  };
  const [library, setLibraryState] = useState<CharacterLibraryState>(initialLibraryState);
  const libraryRef = useRef(library);
  const setLibrary = (next: CharacterLibraryState) => { libraryRef.current = next; setLibraryState(next); };
  const [history, setHistoryState] = useState<History>(emptyHistory);
  const historyRef = useRef(history);
  const setHistory = (next: History) => { historyRef.current = next; setHistoryState(next); };
  const [rememberHistory, setRememberHistoryState] = useState(true);
  const [historyNotice, setHistoryNotice] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const storageReadable = useRef(true);
  const savingRef = useRef(false);
  const restoreHistory = (next: CharacterLibraryState) => {
    const entry = activeLibraryEntry(next);
    try { setHistory(entry && window.localStorage.getItem('dxd-remember-history') !== 'false' ? unpackHistory(window.localStorage.getItem(historyKey(entry.id)), entry.id, snapshot(entry.draft)) : emptyHistory()); }
    catch { setHistory(emptyHistory()); setStorageWarning('Browser storage is unavailable. Changes remain only in memory.'); }
  };
  const setRememberHistory = (enabled: boolean) => {
    setRememberHistoryState(enabled);
    try {
      window.localStorage.setItem('dxd-remember-history', String(enabled));
      if (!enabled) for (const key of Object.keys(window.localStorage)) if (key.startsWith('dxd-character-history-v1:')) window.localStorage.removeItem(key);
    } catch { setStorageWarning('Could not save the history preference. Changes remain only in memory.'); }
  };
  const [hydrated, setHydrated] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [accountPrivateChoice, setAccountPrivateChoice] = useState(false);
  const [savedAccountPrivate, setSavedAccountPrivate] = useState(false);
  const accountRequestRef = useRef<{ signature: string; key: string } | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [savedAccountSnapshot, setSavedAccountSnapshot] = useState('');
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    let savedLibrary: unknown = null; let legacyDraft: unknown = null;
    try { const rawLibrary = window.localStorage.getItem(CHARACTER_LIBRARY_STORAGE_KEY); if (rawLibrary) savedLibrary = JSON.parse(rawLibrary); const rawLegacy = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY); if (rawLegacy) legacyDraft = JSON.parse(rawLegacy); } catch { storageReadable.current = false; setStorageWarning('Stored drafts could not be read. Automatic browser saving is paused to preserve them; save to a file and reload when storage is available.'); }
    const migrated = migrateCharacterLibrary(savedLibrary, legacyDraft);
    const safeEntries = migrated.entries.filter(entry => entry.serverRecord?.mode !== 'server');
    let nextLibrary = safeEntries.length
      ? { ...migrated, activeId: safeEntries.some(entry => entry.id === migrated.activeId) ? migrated.activeId : safeEntries[0].id, entries: safeEntries.map(entry => ({ ...entry, draft: normalizeDraft(entry.draft, data) })) }
      : initialLibraryState();
    try {
      const pendingRaw = window.localStorage.getItem(PENDING_FILE_LOAD_STORAGE_KEY);
      const pending = pendingRaw ? JSON.parse(pendingRaw) as { idName?: unknown; draft?: unknown } : null;
      if (pending && typeof pending.idName === 'string' && pending.draft) {
        const loaded = normalizeDraft(migrateCharacterDraft(pending.draft), data);
        const id = loaded.characterId ? `file:${loaded.characterId}` : `file:${pending.idName}`;
        const entry = { ...createLibraryEntry(loaded, id), fileId: pending.idName };
        nextLibrary = { ...nextLibrary, activeId: id, entries: [...nextLibrary.entries.filter(item => item.id !== id), entry] };
        setActiveFileId(pending.idName);
        setSavedSnapshot(comparableDraft(loaded));
        setMessage(`Loaded ${pending.idName}`);
        window.localStorage.removeItem(PENDING_FILE_LOAD_STORAGE_KEY);
      }
    } catch { setMessage('The pending character could not be loaded. Existing local drafts were preserved.'); }
    setLibrary(nextLibrary);
    const restoredEntry = activeLibraryEntry(nextLibrary);
    if (restoredEntry?.fileId) setActiveFileId(restoredEntry.fileId);
    if (restoredEntry?.serverRecord) { setAccountPrivateChoice(restoredEntry.serverRecord.isPrivate); setSavedAccountPrivate(restoredEntry.serverRecord.isPrivate); setSavedAccountSnapshot(comparableDraft(restoredEntry.draft)); }
    try {
      const selected = window.localStorage.getItem(CAMPAIGN_SELECTION_KEY);
      if (selected) setSelectedCampaignId(localCampaign(selected).id);
      else if (!savedLibrary && !legacyDraft && !restoredEntry?.fileId && window.location.pathname === '/') router.replace('/campaigns');
    } catch {}
    restoreHistory(nextLibrary);
    try { setRememberHistoryState(window.localStorage.getItem('dxd-remember-history') !== 'false'); } catch {}
    setHydrated(true);
  }, [data]);
  useEffect(() => {
    if (!hydrated || !storageReadable.current) return;
    try {
      const browserLibrary = browserPersistedLibrary(library);
      window.localStorage.setItem(CHARACTER_LIBRARY_STORAGE_KEY, JSON.stringify(browserLibrary));
      const active = activeLibraryEntry(browserLibrary);
      if (active) window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(active.draft));
      setStorageWarning('');
    } catch { setStorageWarning('Browser storage could not save this draft. Changes remain only in memory; save to a file before closing.'); }
  }, [library, hydrated]);
  useEffect(() => {
    if (!hydrated || !storageReadable.current) return;
    const entry = activeLibraryEntry(library); if (!entry) return;
    try {
      if (entry.serverRecord?.mode === 'server') { window.localStorage.removeItem(historyKey(entry.id)); setHistoryNotice('Account character undo history stays only in this session.'); return; }
      if (!rememberHistory) { window.localStorage.removeItem(historyKey(entry.id)); setHistoryNotice('Undo history lasts only for this session.'); return; }
      const packed = packHistory(entry.id, snapshot(entry.draft), history);
      window.localStorage.setItem(historyKey(entry.id), packed.text);
      setHistoryNotice(packed.truncated ? 'Older or large edits are undoable only in this session; saved history is limited to less than 10 KB.' : '');
    } catch { setHistoryNotice('Undo history could not be saved and is available only in this session.'); }
  }, [library, history, hydrated, rememberHistory]);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline(); window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);
  useEffect(() => {
    const syncTags = () => setAvailableTags(sortLibraryTags(readAdminSettings().libraryTags));
    syncTags(); window.addEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
    return () => window.removeEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
  }, []);

  const draft = activeLibraryEntry(library)?.draft ?? createEmptyCharacterDraft();
  const serialized = comparableDraft(draft);
  const activeEntry = activeLibraryEntry(library);
  const isAccountCharacter = Boolean(activeEntry?.serverRecord || activeEntry?.accountTargetCampaignId);
  const accountServerOnly = activeEntry?.serverRecord?.mode === 'server';
  const hasAccountRecord = Boolean(activeEntry?.serverRecord);
  const accountPrivate = accountPrivateChoice;
  const accountDirty = Boolean(activeEntry?.serverRecord && (serialized !== savedAccountSnapshot || accountPrivateChoice !== savedAccountPrivate));
  const dirty = activeFileId ? serialized !== savedSnapshot : activeEntry?.serverRecord ? accountDirty : activeEntry?.accountTargetCampaignId ? true : serialized !== comparableDraft(normalizeDraft(createEmptyCharacterDraft(), data));
  const setAccountPrivate = (value: boolean) => setAccountPrivateChoice(value);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);

  const setDraft: Dispatch<SetStateAction<CharacterDraft>> = (action) => {
    const current = libraryRef.current;
    const before = activeLibraryEntry(current)?.draft; if (!before) return;
    try {
      // Evaluate the updater once, outside React's replayable updater callbacks.
      const candidate = typeof action === 'function' ? action(structuredClone({ ...before, creation: before.creation ?? { ...creationContext(before), seed: seedForCharacter(current.activeId, readAdminSettings().randomSeed) } })) : action;
      const after = normalizeDraft(candidate, data);
      if (!originChangeAllowed(localCampaign(after.campaignId).originPolicy, after.campaignId === before.campaignId ? before.background.settlementId : null, after.background.settlementId)) throw new GenerationConflict('This settlement is disallowed as a new starting origin. Its details remain available in Explore origins.');
      // Seeding metadata alone must not turn a no-op editor action into an edit.
      if (!before.creation && JSON.stringify(snapshot({ ...after, creation: undefined })) === JSON.stringify(snapshot(before))) return;
      const nextHistory = recordEdit(historyRef.current, snapshot(before), snapshot(after));
      if (nextHistory === historyRef.current) return;
      setHistory(nextHistory);
      setLibrary(updateActiveDraft(current, after));
    } catch (error) { setMessage(error instanceof GenerationConflict ? error.message : 'The edit could not be applied. Your previous draft is unchanged.'); }
  };
  const navigateHistory = (direction: 'undo' | 'redo') => {
    const current = libraryRef.current;
    const before = activeLibraryEntry(current)?.draft; if (!before) return;
    try {
      const result = travel(snapshot(before), historyRef.current, direction);
      const candidate = { ...(result.value as unknown as CharacterDraft), characterId: before.characterId, updatedAt: before.updatedAt };
      const normalized = normalizeDraft(candidate, data);
      if (JSON.stringify(snapshot(normalized)) !== JSON.stringify(result.value)) throw new Error('Rules changed');
      setHistory(result.history); setLibrary(updateActiveDraft(current, normalized));
      setMessage(direction === 'undo' ? 'Edit undone.' : 'Edit restored.');
    } catch { setHistory(emptyHistory()); setMessage('History no longer matches the current rules. The character was preserved.'); }
  };
  const undo = () => navigateHistory('undo');
  const redo = () => navigateHistory('redo');
  const loadDraft = (idName: string, value: CharacterDraft) => {
    const loaded = normalizeDraft(migrateCharacterDraft(value), data);
    const current = libraryRef.current;
    const id = loaded.characterId ? `file:${loaded.characterId}` : `file:${idName}`;
    const entry = { ...createLibraryEntry(loaded, id), fileId: idName };
    const next = { ...current, activeId: id, entries: [...current.entries.filter(item => item.id !== id), entry] };
    setLibrary(next); restoreHistory(next);
    setActiveFileId(idName); setAccountPrivateChoice(false); setSavedAccountPrivate(false); setSavedAccountSnapshot(''); setSavedSnapshot(comparableDraft(loaded)); setMessage(`Loaded ${idName}`); router.push('/');
  };
  const saveAccount = async () => {
    if (savingRef.current) return false;
    const sourceLibrary = libraryRef.current;
    const sourceEntry = activeLibraryEntry(sourceLibrary);
    if (!sourceEntry) return false;
    const startedId = sourceEntry.id;
    const startedDraft = structuredClone(sourceEntry.draft);
    const record = sourceEntry.serverRecord;
    const privateValue = accountPrivateChoice;
    if (record && comparableDraft(startedDraft) === savedAccountSnapshot && privateValue === savedAccountPrivate) { setMessage('No unsaved Account Library changes.'); return true; }
    const accountDraft = { ...startedDraft, campaignId: sourceEntry.accountTargetCampaignId ? startedDraft.campaignId ?? null : null };
    const signature = JSON.stringify({ id: record?.id ?? null, version: record?.version ?? null, draft: accountDraft, private: privateValue });
    if (accountRequestRef.current?.signature !== signature) accountRequestRef.current = { signature, key: crypto.randomUUID() };
    const idempotencyKey = accountRequestRef.current.key;
    savingRef.current = true; setSaving(true);
    try {
      const response = await fetch(record ? `/api/auth/characters/${record.id}` : '/api/auth/characters', {
        method: record ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record
          ? { draft: accountDraft, expectedVersion: record.version, idempotencyKey, private: privateValue }
          : { draft: accountDraft, private: privateValue, idempotencyKey }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; version?: number; currentVersion?: number; error?: string };
      if (!response.ok) {
        if (response.status === 409) setMessage(`Account character changed on the server (current version ${result.currentVersion ?? 'unknown'}). Your edits remain open in this tab; reopen the current account version before trying again.`);
        else if (response.status === 401) setMessage('Sign in with a verified account to save to the Account Library. Your current edits remain open in this tab.');
        else if (response.status === 403) setMessage(result.error ?? 'You do not have permission to change this account character. Your current edits remain open in this tab.');
        else setMessage(result.error ?? 'Account save failed. Your current edits remain open in this tab.');
        return false;
      }
      if (!result.id || !Number.isSafeInteger(result.version)) { setMessage('The account save response was incomplete. Your edits remain open in this tab; retry the same request here without reloading.'); return false; }
      accountRequestRef.current = null;
      const savedRecord = { id: result.id, version: result.version!, isPrivate: privateValue };
      const currentLibrary = libraryRef.current;
      const currentEntry = currentLibrary.entries.find(entry => entry.id === startedId);
      if (!currentEntry) { setLibraryRefresh(key => key + 1); setMessage('The earlier character was saved to your account. The current character is unchanged.'); return true; }
      const currentUnchanged = comparableDraft(currentEntry.draft) === comparableDraft(startedDraft) && accountPrivateChoice === privateValue;
      const nextLibrary = { ...currentLibrary, entries: currentLibrary.entries.map(entry => entry.id === startedId
        ? { ...entry, serverRecord: { ...savedRecord, mode: record?.mode ?? 'copy' } }
        : entry) };
      setLibrary(nextLibrary);
      if (currentLibrary.activeId === startedId && currentUnchanged) {
        const savedEntry = nextLibrary.entries.find(entry => entry.id === startedId)!;
        setSavedAccountSnapshot(comparableDraft(savedEntry.draft)); setSavedAccountPrivate(privateValue); setAccountPrivateChoice(privateValue);
        setMessage(record
          ? `Saved Account Library version ${result.version}.`
          : accountDraft.campaignId
            ? 'Saved the character to the selected account campaign.'
            : sourceEntry.accountTargetCampaignId
              ? `Saved unassigned for ${sourceEntry.accountTargetCampaignName || 'the selected campaign'}; campaign review/admission is not available yet.`
              : 'Saved an unassigned copy to the Account Library.');
      } else setMessage(currentLibrary.activeId === startedId ? 'The earlier version was saved to your account. Newer edits remain unsaved.' : 'The earlier character was saved to your account. The current character is unchanged.');
      setLibraryRefresh(key => key + 1);
      return true;
    } catch {
      setMessage('Account save could not be confirmed. Your draft remains on this device; retrying here without reloading is safe.');
      return false;
    } finally { savingRef.current = false; setSaving(false); }
  };

  const loadAccountDraft = (id: string, value: CharacterDraft, version: number, isPrivate: boolean) => {
    const loaded = normalizeDraft(migrateCharacterDraft(value), data);
    const entryId = `account:${id}`;
    const current = libraryRef.current;
    const entry = { ...createLibraryEntry(loaded, entryId), serverRecord: { id, version, isPrivate, mode: 'server' as const } };
    const next = { ...current, activeId: entryId, entries: [...current.entries.filter(item => item.id !== entryId), entry] };
    setLibrary(next); setHistory(emptyHistory()); setActiveFileId(null);
    setAccountPrivateChoice(isPrivate); setSavedAccountPrivate(isPrivate); setSavedAccountSnapshot(comparableDraft(loaded));
    setMessage(`Opened Account Library version ${version}.`); router.push('/');
  };

  const save = async () => {
    const currentEntry = activeLibraryEntry(libraryRef.current);
    if (!activeFileId && (currentEntry?.serverRecord || currentEntry?.accountTargetCampaignId)) return saveAccount();
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch('/api/character-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idName: activeFileId, draft }) });
      if (!response.ok) { setMessage('Save failed.'); return false; }
      const value = await response.json();
      const savedDraft = normalizeDraft(migrateCharacterDraft(value.draft ?? draft), data);
      const current = libraryRef.current;
      if (activeLibraryEntry(current)?.id !== activeLibraryEntry(library)?.id) {
        setLibraryRefresh(key => key + 1); setMessage('The previous character was saved. Your current character is unchanged.'); return true;
      }
      if (comparableDraft(activeLibraryEntry(current)!.draft) !== comparableDraft(draft)) {
        setLibrary(updateActiveDraft(current, { ...activeLibraryEntry(current)!.draft, characterId: savedDraft.characterId }));
        setLibrary({ ...libraryRef.current, entries: libraryRef.current.entries.map(entry => entry.id === libraryRef.current.activeId ? { ...entry, fileId: value.idName } : entry) });
        setActiveFileId(value.idName); setSavedSnapshot(comparableDraft(savedDraft)); setLibraryRefresh(key => key + 1);
        setMessage('The earlier version was saved. Newer edits remain unsaved.'); return true;
      }
      setLibrary(updateActiveDraft(current, savedDraft));
      if (JSON.stringify(snapshot(savedDraft)) !== JSON.stringify(snapshot(draft))) setHistory(emptyHistory());
      setLibrary({ ...libraryRef.current, entries: libraryRef.current.entries.map(entry => entry.id === libraryRef.current.activeId ? { ...entry, fileId: value.idName } : entry) });
      setActiveFileId(value.idName); setSavedSnapshot(comparableDraft(savedDraft)); setLibraryRefresh((key) => key + 1); setMessage(`Saved ${value.idName}`); return true;
    } catch { setMessage('Save failed. The local draft was preserved.'); return false; } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const revert = async () => {
    if (!activeFileId || reverting) return;
    const startedEntry = activeLibraryEntry(libraryRef.current);
    const startedSnapshot = startedEntry ? comparableDraft(startedEntry.draft) : null;
    setReverting(true);
    try {
      const response = await fetch(`/api/character-files/${encodeURIComponent(activeFileId)}`, { cache: 'no-store' });
      if (!response.ok) { setMessage('Revert failed.'); return; }
      const value = await response.json();
      const currentEntry = activeLibraryEntry(libraryRef.current);
      if (currentEntry?.id !== startedEntry?.id || !currentEntry || comparableDraft(currentEntry.draft) !== startedSnapshot) {
        setMessage('Revert cancelled because the active draft changed while loading.'); return;
      }
      loadDraft(activeFileId, value.draft);
    } catch { setMessage('Revert failed. The local draft was preserved.'); } finally {
      setReverting(false);
    }
  };
  const createInCampaign = (origin?: CharacterDraft['background']) => {
    if (origin && !originAllowed(selectedCampaign.originPolicy, origin.settlementId)) { setMessage('This settlement is disallowed as a new starting origin. Its details remain available in Explore origins.'); return; }
    const empty = createEmptyCharacterDraft();
    const entry = createLibraryEntry(normalizeDraft({ ...empty, campaignId: selectedCampaign.id, ...(origin ? { background: { ...empty.background, regionId: origin.regionId, settlementId: origin.settlementId }, creation: { ...creationContext(empty), locks: [...LOCK_SECTIONS.Origin] } } : {}) }, data));
    entry.draft.creation = { ...creationContext(entry.draft), seed: seedForCharacter(entry.id, readAdminSettings().randomSeed) };
    setLibrary({ ...libraryRef.current, activeId: entry.id, entries: [...libraryRef.current.entries, entry] });
    setHistory(emptyHistory()); setActiveFileId(null); setAccountPrivateChoice(false); setSavedAccountPrivate(false); setSavedAccountSnapshot(''); setSavedSnapshot('');
    setMessage(`New character in ${selectedCampaign.name}. Your previous draft remains in the Library.`);
    router.push('/');
  };
  const createAccountCampaignDraft = (campaign: { id: string; name: string; lifecycle: 'preparing' | 'active' | 'archived'; isDefault?: boolean; canConfigure?: boolean }) => {
    if (campaign.lifecycle === 'archived') { setMessage('Archived campaigns cannot receive new characters.'); return; }
    const empty = createEmptyCharacterDraft();
    const campaignId = campaign.lifecycle === 'active' && !campaign.isDefault && !campaign.canConfigure ? null : campaign.id;
    const draft = normalizeDraft({ ...empty, campaignId }, data);
    const entry = { ...createLibraryEntry(draft), accountTargetCampaignId: campaign.id, accountTargetCampaignName: campaign.name };
    entry.draft.creation = { ...creationContext(entry.draft), seed: seedForCharacter(entry.id, readAdminSettings().randomSeed) };
    setLibrary({ ...libraryRef.current, activeId: entry.id, entries: [...libraryRef.current.entries, entry] });
    setHistory(emptyHistory()); setActiveFileId(null); setAccountPrivateChoice(false); setSavedAccountPrivate(false); setSavedAccountSnapshot(''); setSavedSnapshot('');
    setMessage(campaign.lifecycle === 'active' && !campaign.isDefault && !campaign.canConfigure
      ? `New character for ${campaign.name}. It will be saved unassigned until campaign review/admission is available.`
      : `New character in ${campaign.name}. Your previous draft remains in the Library.`);
    router.push('/');
  };
  const reset = () => createInCampaign();
  const openLocalDraft = (id: string) => {
    const entry = libraryRef.current.entries.find(item => item.id === id); if (!entry) return;
    const next = { ...libraryRef.current, activeId: id }; setLibrary(next); restoreHistory(next);
    setActiveFileId(entry.fileId ?? null);
    setAccountPrivateChoice(entry.serverRecord?.isPrivate ?? false); setSavedAccountPrivate(entry.serverRecord?.isPrivate ?? false);
    setSavedAccountSnapshot(entry.serverRecord ? comparableDraft(entry.draft) : '');
    setSavedSnapshot('');
    setMessage(entry.serverRecord ? `Opened cached account character v${entry.serverRecord.version}.` : 'Opened browser draft.'); router.push('/');
  };

  const downloadBackup = () => {
    const entry = activeLibraryEntry(libraryRef.current); if (!entry) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportCharacter(entry), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${(entry.draft.utilities.name || 'character').replace(/[^a-z0-9_-]/gi, '-').slice(0, 80)}-forge-backup.json`;
    anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Character backup downloaded. It includes character data and generation settings, without undo history.');
  };
  const restoreBackup = (text: string) => {
    try {
      const imported = importCharacter(JSON.parse(text));
      const entry = { ...imported, draft: normalizeDraft(imported.draft, data) };
      setLibrary({ ...libraryRef.current, activeId: entry.id, entries: [...libraryRef.current.entries, entry] });
      setHistory(emptyHistory()); setActiveFileId(null); setAccountPrivateChoice(false); setSavedAccountPrivate(false); setSavedAccountSnapshot(''); setSavedSnapshot('');
      setMessage('Imported a separate browser copy. Existing characters are unchanged. Save to create a new character file.');
      router.push('/');
    } catch (error) { setMessage(`Import failed. Existing drafts are unchanged. ${error instanceof Error ? error.message : 'Choose a valid Forge backup.'}`); }
  };

  const value = useMemo<WorkspaceContextValue>(() => ({ downloadBackup, restoreBackup, selectedCampaign, selectCampaign, createInCampaign, createAccountCampaignDraft, localEntries: library.entries.filter(entry => entry.serverRecord?.mode !== 'server'), openLocalDraft, canUndo: history.past.length > 0, canRedo: history.future.length > 0, undo, redo, rememberHistory, setRememberHistory, historyNotice, storageWarning, data, draft, setDraft, activeFileId, dirty, message, setMessage, availableTags, libraryRefresh, saving, reverting, save, saveAccount, loadAccountDraft, isAccountCharacter, accountServerOnly, hasAccountRecord, accountDirty, accountPrivate, setAccountPrivate, online, revert, reset, loadDraft }), [data, draft, activeFileId, dirty, message, availableTags, libraryRefresh, saving, reverting, history, rememberHistory, historyNotice, storageWarning, selectedCampaign, library, accountPrivateChoice, savedAccountPrivate, savedAccountSnapshot, online]);
  if (!hydrated) return <SuspenseSpinner panel label="Loading character workspace…" className="mx-auto mt-4 max-w-[1440px]" />;
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace context is unavailable.');
  return value;
}
