import CharacterSheet from './character-sheet';
import sampleData from '@/data/character-sample.json';
import emptyData from '@/data/character-empty.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CharacterSheetPage() {
  return (
    <main className="p-4 md:p-8">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sample">Sample</TabsTrigger>
          <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <CharacterSheet characterData={emptyData} />
        </TabsContent>
        <TabsContent value="sample">
          <CharacterSheet characterData={sampleData} />
        </TabsContent>
        <TabsContent value="worksheet">
          <div className="mt-4 p-4 border rounded-md">
            <h2 className="text-xl font-bold">Worksheet</h2>
            <p>This is the worksheet tab content.</p>
          </div>
        </TabsContent>
        <TabsContent value="info">
          <div className="mt-4 p-4 border rounded-md">
            <h2 className="text-xl font-bold">Info</h2>
            <p>This is the info tab content.</p>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
