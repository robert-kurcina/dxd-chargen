'use client';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import characterData from '@/data/character-sample.json';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const HistorySection = ({ title, content }: { title: string; content: string }) => (
  <p>
    <span className="font-bold">{title};</span> {content}
  </p>
);

export default function CharacterSheet() {
  const portrait = PlaceHolderImages.find((img) => img.id === 'character-portrait');

  return (
    <div
      className="text-black p-4 md:p-8 font-sans bg-cover bg-center"
      style={{ backgroundImage: `url(https://images.unsplash.com/photo-1579281783472-3b13411b415f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwYXJjaG1lbnQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTcxNDcwODc5N3ww&ixlib=rb-4.1.0&q=80&w=1080)` }}
    >
      <div className="border border-gray-300 p-4 max-w-4xl mx-auto bg-white shadow-lg">
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
            <div className="border-4 border-black bg-gray-200 h-60 md:h-auto md:aspect-[960/810] flex items-center justify-center">
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
          <div className="border border-gray-300 p-2 flex items-center justify-end">
            <div className="flex items-center space-x-1 md:space-x-2 text-gray-700 text-xs md:text-sm">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className="relative flex items-center justify-center border border-gray-400 rounded-full h-6 w-6 md:h-8 md:w-8"
                >
                  {characterData.level === i + 1 && (
                    <Icons.Star className="absolute w-full h-full" />
                  )}
                   <span className="relative">{i + 1}</span>
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
                  className={cn(
                    "text-center text-xs font-bold border-r border-gray-300 p-1 bg-gray-100 flex flex-col justify-end items-center h-10",
                    {
                      'border-r-2 border-black': ['REF', 'KNO', 'POW', 'SIZ'].includes(attr.name)
                    }
                  )}
                >
                  {attr.name === 'FOR' && <Icons.Affinity className="h-4 w-4 mb-1" />}
                  {attr.name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 border-t border-gray-400">
              {characterData.attributes.map((attr, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-10 flex items-center justify-center font-bold text-xl border-r border-gray-300",
                    {
                      'border-r-2 border-black': ['REF', 'KNO', 'POW', 'SIZ'].includes(attr.name)
                    }
                  )}
                >
                  {attr.value}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 border-t border-gray-300 bg-gray-50">
              {characterData.attributes.map((attr, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-6 flex items-center justify-center text-sm border-r border-gray-300",
                     {
                      'border-r-2 border-black': ['REF', 'KNO', 'POW', 'SIZ'].includes(attr.name)
                    }
                  )}
                >
                  {attr.modifier}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-12 text-center text-xs font-bold text-white">
            <div className="col-span-3 bg-red-600 p-1">COMBAT</div>
            <div className="col-span-4 bg-blue-500 p-1">PSYCHOLOGICAL</div>
            <div className="col-span-4 bg-green-500 p-1">PHYSICALS</div>
            <div className="col-span-1 bg-purple-500 p-1">MAGIC</div>
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
