'use client';
import CharacterLibraryPanel from '@/app/character-library-panel';
import { useWorkspace } from '../workspace-provider';
export default function LibraryPage() { const { data, libraryRefresh, loadDraft } = useWorkspace(); return <CharacterLibraryPanel data={data} refreshKey={libraryRefresh} onOpen={loadDraft} />; }
