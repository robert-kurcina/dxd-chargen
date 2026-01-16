'use client';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const characterData = {
  name: 'Iskender',
  properName: 'Istanidor',
  details: {
    environ: 'River > Cityfolk > Fishing',
    species: 'Human > Eniyaski',
    bio: 'Male > Young Adult age 23.9',
    physique: `6'4" and 178-pounds`,
  },
  level: 1,
  attributes: [
    { name: 'CCA', value: 13, modifier: '+3' },
    { name: 'RCA', value: 10, modifier: '+2' },
    { name: 'REF', value: 12, modifier: '+3' },
    { name: 'INT', value: 10, modifier: '+2' },
    { name: 'KNO', value: 10, modifier: '+2' },
    { name: 'PRE', value: 10, modifier: '+2' },
    { name: 'POW', value: 9, modifier: '+1' },
    { name: 'STR', value: 9, modifier: '+1' },
    { name: 'FOR', value: 8, modifier: '+1' },
    { name: 'MOV', value: 13, modifier: '+3' },
    { name: 'SIZ', value: 12, modifier: '+3' },
    { name: 'ZED', value: 6, modifier: '-1' },
  ],
  background: {
    profession: ['Warrior > Soldier', 'Rank 1 > Soldier'],
    settlement: ['Vasik Realm', 'Citystate Khardik'],
    religion: ['Agnostic', '[Gnorg]'],
    personality: 'Opinionated',
    notableFeatures: ['Acute Hearing [+2 Detect sound]', 'Dark Eyes'],
  },
  history: {
    equipment: 'Wardrobe, Backpack, Boatcloak',
    weapons: 'Broadsword, Dagger',
    armor: 'Boiled Leather, Half Helm & Mantle',
    magicItems: 'Whetcoin',
    skills:
      '[Comrade 2 > Target], [Empathy 2], §Academics 1 > Maths, §Studies 2 > Read, Archery 1, Barter 3, Brawn 2, Domus 3 > Fisher, Drill 3, Expert 5 > Improvised Weapons, Expert 3 > Swords, Expert 2 > Daggers, Expert 3 > Spears, Fishing 3, History 1 > Vasik Realm, Knife-fighter 2, Leadership 1, Lore 3 > Human Cultures, Martialist 2, Navigation 2, Nimble 1, Parry 3, Persuade 2, Pidgin 3 > War Vasikha, Politics 1 > Khardik, Quick 2, Read 2 > Khardik, Steer 2 > Sailboat, Strike 2, Sturdy 1, Survival 1 > River, Survival 1 > Coast, Suss 1, Swim 4, Tactics 2 > Team, Trained 3 > Leather, Trained 1 > Mail, Trapmaster 1',
    languages:
      '+[Middle Khardik-5], [Common-4], [Khardik Barter-3], [Middle Coro-3], [Heimneshi-2], [War Vasikha-3]',
  },
  performance: [
    { name: 'Hitpoints', value: 19 },
    { name: 'Bodypoints', value: 12 },
    { name: 'Recovery Rate', value: 5 },
    { name: 'Endurance', value: 11 },
    { name: 'Resilience', value: 9 },
    { name: 'Resistance', value: 19 },
  ],
  concerns: [
    { name: 'Superficial', value: 0 },
    { name: 'Injury', value: 0 },
    { name: 'Fatigue', value: 0 },
    { name: 'Weariness', value: 0 },
    { name: 'Stress', value: 0 },
    { name: 'Rads', value: 0 },
  ],
  miscellaneous: [
    { name: 'Wealth Rank', value: 15 },
    { name: 'Social Rank', value: 1 },
    { name: 'Trade Rank', value: 1 },
    { name: 'Favor Dice', value: 1 },
    { name: 'Cellburn Limit', value: 1 },
    { name: 'Manapool', value: 9 },
  ],
  combat: [
    { name: 'Actions', value: '+1' },
    { name: 'Melee Attack', value: '+3' },
    { name: 'Melee Defend', value: '+3' },
    { name: 'Range Attack', value: '+2' },
    { name: 'Range Defend', value: '+3' },
    { name: 'Max Advantage', value: '+1' },
  ],
};

const HistorySection = ({ title, content }: { title: string; content: string }) => (
  <p>
    <span className="font-bold">{title};</span> {content}
  </p>
);

export default function CharacterSheet() {
  const portrait = PlaceHolderImages.find((img) => img.id === 'character-portrait');

  return (
    <div className="bg-white text-black p-4 md:p-8 font-sans">
      <div className="border border-gray-300 p-4 max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
          <div className="w-full md:w-2/3">
            <p className="text-sm text-gray-500">Name</p>
            <div className="border-2 border-transparent h-12 text-xl mb-4">
              <p className="text-2xl font-bold">{characterData.name}</p>
              <p className="text-lg">[{characterData.properName}]</p>
            </div>
            <p className="text-sm text-gray-500">Details</p>
            <div className="border-2 border-transparent h-auto text-lg">
              <p>{characterData.details.environ}</p>
              <p>{characterData.details.species}</p>
              <p>{characterData.details.bio}</p>
              <p>{characterData.details.physique}</p>
            </div>
          </div>
          <div className="w-full md:w-1/3">
            <p className="text-sm text-center text-gray-500">Portrait</p>
            <div className="border-2 border-gray-300 bg-gray-200 h-60 md:h-auto md:aspect-[960/810] flex items-center justify-center">
              {portrait ? (
                <Image
                  src={portrait.imageUrl}
                  alt={portrait.description}
                  width={960}
                  height={810}
                  className="object-cover w-full h-full"
                  data-ai-hint={portrait.imageHint}
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
          </div>
        </header>

        <section className="mb-4">
          <h2 className="font-bold mb-2 text-lg">Character Level (PML)</h2>
          <div className="border border-gray-300 p-2 flex items-center justify-between">
            <span className="font-bold text-2xl">{characterData.level}</span>
            <div className="flex items-center space-x-1 md:space-x-2 text-gray-700 text-xs md:text-sm">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className={`flex items-center justify-center border border-gray-400 rounded-full h-6 w-6 md:h-8 md:w-8 ${
                    characterData.level === i + 1
                      ? 'bg-yellow-300 font-bold'
                      : ''
                  }`}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-bold mb-1 text-lg">Attributes</h2>
          <div className="border border-gray-400">
            <div className="grid grid-cols-12">
              {characterData.attributes.map((attr) => (
                <div
                  key={attr.name}
                  className="text-center text-xs font-bold border-r border-gray-300 p-1 bg-gray-100"
                >
                  {attr.name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 border-t border-gray-400">
              {characterData.attributes.map((attr, i) => (
                <div
                  key={i}
                  className="h-10 flex items-center justify-center font-bold text-xl border-r border-gray-300"
                >
                  {attr.value}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 border-t border-gray-300 bg-gray-50">
              {characterData.attributes.map((attr, i) => (
                <div
                  key={i}
                  className="h-8 flex items-center justify-center text-sm border-r border-gray-300"
                >
                  {attr.modifier}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-12 text-center text-xs font-bold text-white">
            <div className="col-span-3 bg-red-600 p-1">COMBAT</div>
            <div className="col-span-3 bg-blue-500 p-1">PSYCHOLOGICAL</div>
            <div className="col-span-4 bg-green-500 p-1">PHYSICALS</div>
            <div className="col-span-2 bg-purple-500 p-1">MAGIC</div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row mb-4 gap-4">
          <div className="w-full md:w-1/2">
            <h2 className="font-bold mb-2 text-lg">Background</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Profession</p>
                <div className="text-lg">
                  {characterData.background.profession.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Settlement</p>
                <div className="text-lg">
                  {characterData.background.settlement.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Religion</p>
                <div className="text-lg">
                   {characterData.background.religion.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Personality</p>
                <div className="text-lg">
                  <p>{characterData.background.personality}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Notable Features</p>
                <div className="text-lg">
                  {characterData.background.notableFeatures.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex flex-col">
            <h2 className="font-bold mb-2 text-lg">History & Notes</h2>
            <div className="border border-gray-300 p-2 flex-grow min-h-[240px] text-sm space-y-2">
              <HistorySection title="Equipment" content={characterData.history.equipment} />
              <HistorySection title="Weapons" content={characterData.history.weapons} />
              <HistorySection title="Armor" content={characterData.history.armor} />
              <HistorySection title="Magic Items" content={characterData.history.magicItems} />
              <HistorySection title="Skills" content={characterData.history.skills} />
              <HistorySection title="Languages" content={characterData.history.languages} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="font-bold mb-2">Performance</h3>
            <div className="space-y-2">
              {characterData.performance.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <div className="border border-gray-400 w-10 h-8 flex items-center justify-center shrink-0 font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Concerns</h3>
            <div className="space-y-2">
              {characterData.concerns.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <div className="border border-gray-400 w-10 h-8 flex items-center justify-center shrink-0 font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Miscellaneous</h3>
            <div className="space-y-2">
              {characterData.miscellaneous.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <div className="border border-gray-400 w-10 h-8 flex items-center justify-center shrink-0 font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Combat</h3>
            <div className="space-y-2">
              {characterData.combat.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <div className="border border-gray-400 w-10 h-8 flex items-center justify-center shrink-0 font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
