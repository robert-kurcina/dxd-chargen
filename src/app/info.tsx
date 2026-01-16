import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SimpleTable = ({ title, data }: { title: string; data: any[] }) => {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(
    data.reduce((acc, curr) => ({ ...acc, ...curr }), {})
  );

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={header}>
                  {typeof row[header] === 'boolean'
                    ? String(row[header])
                    : row[header] ?? 'N/A'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default function Info({ data }: { data: any }) {
  const {
    ageBrackets,
    attributeModifiers,
    characteristicModifiers,
    ageGroups,
    attributeArrays,
    attributeDefinitions,
    beliefs,
    calculatedAbilities,
    citystates,
    deities,
    descriptors,
    disabilities,
    economicStatuses,
    empires,
    environs,
    favoredTradesByLineage,
    culturalHeritage,
    environHeritage,
    societalHeritage,
    adjustments,
    namingPracticeTitles,
    notableFeatures,
    physicalBlemishes,
    pmlTitles,
    pointBuyCosts,
    professions,
    randomPersonItemDeity,
    settlements,
    socialGroups,
    socialRanks,
    species,
    tragedySeeds,
    traits,
    wealthTitles,
    steps,
  } = data;

  return (
    <div className="mt-4 p-4 border rounded-md max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Game Information</h2>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Age Brackets</h3>
        {Object.entries(ageBrackets).map(([species, brackets]: [string, any]) => (
          <div key={species} className="mb-4">
            <h4 className="font-bold text-md mb-1">{species}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map((bracket: any) => (
                  <TableRow key={`${species}-${bracket.group}`}>
                    <TableCell>{bracket.rank}</TableCell>
                    <TableCell>{bracket.group}</TableCell>
                    <TableCell>{bracket.age}</TableCell>
                    <TableCell>{bracket.bonus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
      
      <SimpleTable title="Attribute Modifiers" data={attributeModifiers} />
      <SimpleTable title="Characteristic Modifiers" data={characteristicModifiers} />
      <SimpleTable title="Age Groups" data={ageGroups} />
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Attribute Arrays</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Array</TableHead>
              <TableHead>Values</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(attributeArrays).map(([key, value]: [string, any]) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <TableCell>{value.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Attribute Definitions</h3>
        {attributeDefinitions.map((group: any) => (
          <div key={group.groupName} className="mb-4">
            <h4 className="font-bold text-md mb-1">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.attributes.map((attr: any) => (
                  <TableRow key={attr.abbreviation}>
                    <TableCell>{attr.name}</TableCell>
                    <TableCell>{attr.abbreviation}</TableCell>
                    <TableCell>{attr.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      <SimpleTable title="Beliefs" data={beliefs} />
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Calculated Abilities</h3>
        {calculatedAbilities.map((group: any) => (
          <div key={group.groupName} className="mb-4">
            <h4 className="font-bold text-md mb-1">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.abilities.map((ability: any) => (
                  <TableRow key={ability.name}>
                    <TableCell>{ability.name}</TableCell>
                    <TableCell>{ability.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      <SimpleTable title="City States" data={citystates} />

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Deities</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deity</TableHead>
              <TableHead>Domains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deities.map((deity: any) => (
              <TableRow key={deity.deity}>
                <TableCell>{deity.deity}</TableCell>
                <TableCell>{deity.domains.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SimpleTable title="Descriptors" data={descriptors} />
      <SimpleTable title="Disabilities" data={disabilities} />

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Economic Statuses</h3>
        <ul className="list-disc pl-5">
          {economicStatuses.map((status:string) => <li key={status}>{status}</li>)}
        </ul>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Empires</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Neighbors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empires.map((empire: any) => (
              <TableRow key={empire.id}>
                <TableCell>{empire.id}</TableCell>
                <TableCell>{empire.name}</TableCell>
                <TableCell>{empire.region}</TableCell>
                <TableCell>{empire.neighbors.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Environs</h3>
        <ul className="list-disc pl-5">
          {environs.map((environ:string) => <li key={environ}>{environ}</li>)}
        </ul>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Favored Trades by Lineage</h3>
        {Object.entries(favoredTradesByLineage).map(([category, groups]: [string, any]) => (
          <div key={category} className="mb-4">
            <h4 className="font-bold text-md mb-1">{category}</h4>
            {Object.entries(groups).map(([group, lineages]: [string, any]) => (
              <div key={group} className="ml-4 mb-2">
                <h5 className="font-semibold">{group}</h5>
                {Object.entries(lineages).map(([lineage, trades]: [string, any]) => (
                  <div key={lineage} className="ml-8 mb-2">
                    <h6 className="font-medium">{lineage}</h6>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trade</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(trades).map(([trade, value]) => (
                           <TableRow key={trade}>
                              <TableCell>{trade}</TableCell>
                              <TableCell>{value as any}</TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <SimpleTable title="Cultural Heritage" data={culturalHeritage} />
      <SimpleTable title="Environ Heritage" data={environHeritage} />
      <SimpleTable title="Societal Heritage" data={societalHeritage} />
      <SimpleTable title="Adjustments" data={adjustments} />
      <SimpleTable title="Naming Practice Titles" data={namingPracticeTitles} />
      <SimpleTable title="Notable Features" data={notableFeatures} />
      <SimpleTable title="Physical Blemishes" data={physicalBlemishes} />
      <SimpleTable title="PML Titles" data={pmlTitles} />
      <SimpleTable title="Point Buy Costs" data={pointBuyCosts} />
      <SimpleTable title="Random Person Item Deity" data={randomPersonItemDeity} />
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Professions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trade</TableHead>
              <TableHead>Candidacy</TableHead>
              <TableHead>Naming Practice</TableHead>
              <TableHead>Specializations</TableHead>
              <TableHead>per 1000</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professions.map((profession: any) => (
              <TableRow key={profession.trade}>
                <TableCell>{profession.trade}</TableCell>
                <TableCell>{profession.candidacy}</TableCell>
                <TableCell>{profession.namingPractice}</TableCell>
                <TableCell>
                  {profession.specializations.join(', ')}
                </TableCell>
                <TableCell>{profession.per1000}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Settlements</h3>
        {Object.entries(settlements).map(([region, citys]: [string, any]) => (
          <div key={region} className="mb-4">
            <h4 className="font-bold text-md mb-1">{region}</h4>
            <p>{citys.join(', ')}</p>
          </div>
        ))}
      </div>

      <SimpleTable title="Social Groups" data={socialGroups} />
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Social Ranks</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Society</TableHead>
              <TableHead>Social Rank</TableHead>
              <TableHead>Titles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {socialRanks.map((rank: any) => (
              <TableRow key={rank.society}>
                <TableCell>{rank.society}</TableCell>
                <TableCell>{rank.socialRank}</TableCell>
                <TableCell>{rank.titles.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Species</h3>
        {species.map((specie: any) => (
          <div key={specie.name} className="mb-4">
            <h4 className="font-bold text-md mb-1">{specie.name}</h4>
            {specie.groups.map((group: any) => (
              <div key={group.name} className="ml-4 mb-2">
                <h5 className="font-semibold">{group.name}</h5>
                <p className="ml-4">{group.lineages.join(', ')}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <SimpleTable title="Tragedy Seeds" data={tragedySeeds} />
      <SimpleTable title="Traits" data={traits} />
      <SimpleTable title="Wealth Titles" data={wealthTitles} />

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Steps</h3>
        {steps.map((step: any) => (
          <div key={step.value} className="mb-4">
            <h4 className="font-bold text-md mb-1">{step.title}</h4>
            <ul className="list-disc pl-5">
              {step.substeps.map((substep: any) => (
                <li key={substep.value} className="ml-4">{substep.title} {substep.disabled ? '(disabled)' : ''}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
