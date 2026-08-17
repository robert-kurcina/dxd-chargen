import { Suspense } from 'react';
import sarnaLenData from '@/data';
import Tests from '@/app/tests';
import AdminTabSpinner from '../tab-spinner';

export default function AdminTestsPage() {
  return <Suspense fallback={<AdminTabSpinner />}><Tests data={sarnaLenData} /></Suspense>;
}
