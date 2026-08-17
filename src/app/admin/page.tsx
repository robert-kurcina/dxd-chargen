import { Suspense } from 'react';
import GlobalAdminPanel from './global-panel';
import AdminTabSpinner from './tab-spinner';

export default function AdminGlobalPage() {
  return <Suspense fallback={<AdminTabSpinner />}><GlobalAdminPanel /></Suspense>;
}
