import { Suspense } from 'react';
import sarnaLenData from '@/data';
import CharacterLibraryPanel from '@/app/character-library-panel';
import AdminTabSpinner from '../tab-spinner';

export default function AdminCharactersPage() {
  return <Suspense fallback={<AdminTabSpinner />}><CharacterLibraryPanel data={sarnaLenData} adminMode /></Suspense>;
}
