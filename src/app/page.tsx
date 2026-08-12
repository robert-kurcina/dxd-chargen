import sampleData from '@/data/character-sample.json';
import sarnaLenData from '@/data';
import CharacterApp from './character-app';

export default function CharacterSheetPage() {
  return <CharacterApp data={sarnaLenData} sampleData={sampleData} />;
}
