'use client';
import ExpandedCharacterSheet from '@/app/expanded-character-sheet';
import { useWorkspace } from '../workspace-provider';
export default function SheetPage() { const { draft, data, activeFileId } = useWorkspace(); return <div className="mx-auto h-full min-h-0 w-full max-w-[1200px]"><ExpandedCharacterSheet draft={draft} data={data} filename={activeFileId ?? undefined} /></div>; }
