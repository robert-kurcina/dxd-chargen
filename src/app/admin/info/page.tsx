import { Suspense } from 'react';
import sarnaLenData from '@/data';
import Info from '@/app/info';
import AdminTabSpinner from '../tab-spinner';

export default function AdminInfoPage() {
  return <Suspense fallback={<AdminTabSpinner />}><Info data={sarnaLenData} /></Suspense>;
}
