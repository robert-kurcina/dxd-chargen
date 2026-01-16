'use client';

import type { StaticData } from '@/data';

export default function Worksheet({ data }: { data: StaticData }) {
  return (
    <div className="space-y-8 mt-4">
      <div className="p-4 border rounded-md">
        <h2 className="text-xl font-bold">Worksheet</h2>
        <p>
          This is the worksheet tab content.
        </p>
      </div>
    </div>
  );
}
