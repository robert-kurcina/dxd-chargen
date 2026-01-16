import CharacterSheet from './character-sheet';
import sampleData from '@/data/character-sample.json';
import emptyData from '@/data/character-empty.json';
import sarnaLenData from '@/data/sarna-len-data.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Worksheet from './worksheet';
import Info from './info';

export default function CharacterSheetPage() {
  return (
    <main className="p-4 md:p-8">
      <Tabs defaultValue="overview" className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 bg-gray-100 py-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sample">Sample</TabsTrigger>
            <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <CharacterSheet characterData={emptyData} />
        </TabsContent>
        <TabsContent value="sample">
          <CharacterSheet characterData={sampleData} />
        </TabsContent>
        <TabsContent value="worksheet">
          <Worksheet data={sarnaLenData} />
        </TabsContent>
        <TabsContent value="info">
          <Info data={sarnaLenData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
