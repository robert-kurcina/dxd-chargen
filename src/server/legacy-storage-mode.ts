import 'server-only';

// Filesystem character APIs remain development-only while H02c is under construction.
// Any configured mode other than the explicit legacy mode fails closed.
export function blockLegacyCharacterApi() {
  const defaultMode = process.env.NODE_ENV === 'production' ? 'accounts' : 'legacy-local';
  const mode = process.env.DXD_STORAGE_MODE ?? defaultMode;
  if (mode === 'legacy-local' && process.env.NODE_ENV !== 'production') return null;
  return Response.json(
    { error: 'Filesystem character storage is disabled in this storage mode.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
