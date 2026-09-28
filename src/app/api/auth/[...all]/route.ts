import { getLocalAccountRuntime } from '@/server/auth/local-runtime';

export const runtime = 'nodejs';

async function handle(request: Request) {
  if (process.env.NODE_ENV !== 'development' || process.env.DXD_STORAGE_MODE !== 'accounts') {
    return Response.json({ error: 'Account APIs are unavailable in this environment.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return await getLocalAccountRuntime().handle(request);
  } catch {
    // Configuration/DB failures stay generic; do not disclose secrets or SQL details.
    return Response.json({ error: 'Local account service is not ready.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const GET = handle;
export const POST = handle;
