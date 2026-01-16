import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Info({ data }: { data: any }) {
  const { attributeDefinitions, professions, ageBrackets } = data;
  return (
    <div className="mt-4 p-4 border rounded-md">
      <h2 className="text-xl font-bold mb-4">Info</h2>

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

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Professions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trade</TableHead>
              <TableHead>Candidacy</TableHead>
              <TableHead>Specializations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professions.map((profession: any) => (
              <TableRow key={profession.trade}>
                <TableCell>{profession.trade}</TableCell>
                <TableCell>{profession.candidacy}</TableCell>
                <TableCell>
                  {profession.specializations.join(', ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Age Brackets</h3>
        {Object.entries(ageBrackets).map(([species, brackets]: [string, any]) => (
          <div key={species} className="mb-4">
            <h4 className="font-bold text-md mb-1">{species}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map((bracket: any) => (
                  <TableRow key={`${species}-${bracket.group}`}>
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
    </div>
  );
}
