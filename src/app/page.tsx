export default function CharacterSheetPage() {
  return (
    <div className="bg-white text-black p-4 md:p-8 font-sans">
      <div className="border border-gray-300 p-4 max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
          <div className="w-full md:w-2/3">
            <p className="text-sm text-gray-500">Name</p>
            <div className="border-2 border-red-500 h-12 flex items-center justify-center text-red-500 font-bold text-xl mb-4">
              1
            </div>
            <p className="text-sm text-gray-500">Details</p>
            <div className="border-2 border-red-500 h-8 flex items-center justify-center text-red-500 font-bold text-lg">
              2
            </div>
          </div>
          <div className="w-full md:w-1/3">
            <p className="text-sm text-center text-gray-500">Portrait</p>
            <div className="border-2 border-red-500 bg-gray-200 h-48 flex items-center justify-center text-red-500 font-bold text-2xl">
              3
            </div>
          </div>
        </header>

        {/* Character Level */}
        <section className="mb-4">
          <h2 className="font-bold mb-2 text-lg">Character Level</h2>
          <div className="border-2 border-red-500 p-2 flex items-center justify-between text-red-500 font-bold text-lg">
            4
            <div className="flex items-center space-x-1 md:space-x-2 text-gray-700 text-xs md:text-sm">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="flex items-center justify-center border border-gray-400 rounded-full h-6 w-6 md:h-8 md:w-8">
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Attributes */}
        <section className="mb-4">
          <h2 className="font-bold mb-1 text-lg">Attributes</h2>
          <div className="border border-gray-400">
            <div className="grid grid-cols-12">
              {['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'SIZ', 'ZED'].map((attr) => (
                <div key={attr} className="text-center text-xs font-bold border-r border-gray-300 p-1 bg-gray-100">
                  {attr}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 border-t border-gray-400">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="border-2 border-red-500 h-10 flex items-center justify-center text-red-500 font-bold text-lg border-t-0 border-l-0">
                  {i + 5}
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

        {/* Background and History */}
        <section className="flex flex-col md:flex-row mb-4 gap-4">
          <div className="w-full md:w-1/2">
            <h2 className="font-bold mb-2 text-lg">Background</h2>
            <div className="space-y-3">
              {[
                { label: 'Profession', field: 17 },
                { label: 'Settlement', field: 18 },
                { label: 'Religion', field: 19 },
                { label: 'Personality', field: 20 },
                { label: 'Notable Features', field: 21 },
              ].map(({ label, field }) => (
                <div key={field}>
                  <p className="text-sm text-gray-500 mb-1">{label}</p>
                  <div className="border-2 border-red-500 h-8 flex items-center justify-center text-red-500 font-bold text-lg">
                    {field}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full md:w-1/2 flex flex-col">
            <h2 className="font-bold mb-2 text-lg">History & Notes</h2>
            <div className="border-2 border-red-500 flex-grow min-h-[240px] flex items-center justify-center text-red-500 font-bold text-2xl">
              22
            </div>
          </div>
        </section>

        {/* Bottom Four Columns */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Performance', fields: [
              { name: 'Hitpoints', id: 23 }, { name: 'Bodypoints', id: 24 }, { name: 'Recovery Rate', id: 25 },
              { name: 'Endurance', id: 26 }, { name: 'Resilience', id: 27 }, { name: 'Resistance', id: 28 }
            ]},
            { title: 'Concerns', fields: [
              { name: 'Superficial', id: 29 }, { name: 'Injury', id: 30 }, { name: 'Fatigue', id: 31 },
              { name: 'Weariness', id: 32 }, { name: 'Stress', id: 33 }, { name: 'Rads', id: 34 }
            ]},
            { title: 'Miscellaneous', fields: [
              { name: 'Wealth Rank', id: 35 }, { name: 'Social Rank', id: 36 }, { name: 'Trade Rank', id: 37 },
              { name: 'Favor Dice', id: 38 }, { name: 'Cellburn Limit', id: 39 }, { name: 'Manapool', id: 40 }
            ]},
            { title: 'Combat', fields: [
              { name: 'Actions', id: 41 }, { name: 'Melee Attack', id: 42 }, { name: 'Melee Defend', id: 43 },
              { name: 'Range Attack', id: 44 }, { name: 'Range Defend', id: 45 }, { name: 'Max Advantage', id: 46 }
            ]}
          ].map(({ title, fields }) => (
            <div key={title}>
              <h3 className="font-bold mb-2">{title}</h3>
              <div className="space-y-2">
                {fields.map(({ name, id }) => (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span>{name}</span>
                    <div className="border-2 border-red-500 w-8 h-8 flex items-center justify-center shrink-0 text-red-500 font-bold">
                      {id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
