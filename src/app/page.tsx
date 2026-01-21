import CharacterSheet from './character-sheet';
import sampleData from '@/data/character-sample.json';
import emptyData from '@/data/character-empty.json';
import sarnaLenData from '@/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Worksheet from './worksheet';
import Info from './info';
import Tests from './tests';

export default function CharacterSheetPage() {
  return (
    <main className="h-screen flex flex-col p-4 md:p-8">
      <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
        <div className="shrink-0">
          <div className="sticky top-0 z-30 bg-white py-2">
            <TabsList className="grid w-full max-w-[960px] mx-auto grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sample">Sample</TabsTrigger>
              <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <div className="grid [grid-template-areas:stack] flex-1 min-h-0 pt-2">
          <TabsContent
            value="overview"
            className="[grid-area:stack] overflow-y-auto"
          >
            <CharacterSheet characterData={emptyData} />
          </TabsContent>
          <TabsContent
            value="sample"
            className="[grid-area:stack] overflow-y-auto"
          >
            <CharacterSheet characterData={sampleData} />
          </TabsContent>
          <TabsContent
            value="worksheet"
            className="[grid-area:stack] overflow-y-auto"
          >
            <Worksheet data={sarnaLenData} />
          </TabsContent>
          <TabsContent
            value="tests"
            className="[grid-area:stack] overflow-y-auto"
          >
            <Tests data={sarnaLenData} />
          </TabsContent>
          <TabsContent
            value="info"
            className="[grid-area:stack] overflow-y-auto"
          >
            <Info data={sarnaLenData} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
