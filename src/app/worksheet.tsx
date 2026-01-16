import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Worksheet({ data }: { data: any }) {
  return (
    <div className="mt-4 p-4 border rounded-md">
      <h2 className="text-xl font-bold">Worksheet</h2>
      <p>
        This is the worksheet tab content. {Object.keys(data).length} sections
        loaded.
      </p>
    </div>
  );
}
