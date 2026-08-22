import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATEGORIES = new Set(['citystates', 'decals', 'images', 'maps', 'peoples']);
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*$/i;
const PEOPLE_PAIR = /^(?:ancestral\.pairs-\d+|phenotype\.pair)\.png$/i;
const PEOPLE_HOLOTYPE = /^humaniki-(?:alef|babbita|drauf|gnoan|human|klenari)\.png$/i;
const REMOTE_CITYSTATE_BASE = 'https://raw.githubusercontent.com/robert-kurcina/dxd-chargen/main/data/maps/citystates';

function contentTypeFor(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return extension === '.png' ? 'image/png'
    : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
      : extension === '.webp' ? 'image/webp'
        : extension === '.svg' ? 'image/svg+xml'
          : extension === '.pdf' ? 'application/pdf'
            : 'application/octet-stream';
}

async function localAsset(category: string, filename: string) {
  const directory = category === 'peoples' && PEOPLE_PAIR.test(filename)
    ? path.join('data', 'peoples', '_pairs')
    : category === 'peoples' && PEOPLE_HOLOTYPE.test(filename)
      ? path.join('data', 'peoples', 'holotypes')
      : category === 'citystates'
        ? path.join('data', 'maps', 'citystates')
        : path.join('data', category);
  return readFile(path.join(process.cwd(), directory, filename));
}

async function remoteCitystateAsset(filename: string) {
  const response = await fetch(`${REMOTE_CITYSTATE_BASE}/${encodeURIComponent(filename)}`, {
    cache: process.env.NODE_ENV === 'production' ? 'force-cache' : 'no-store',
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ category: string; filename: string }> },
) {
  const { category, filename } = await context.params;
  if (!CATEGORIES.has(category) || !SAFE_FILENAME.test(filename) || (category === 'peoples' && !filename.toLowerCase().endsWith('.png'))) return new NextResponse(null, { status: 400 });

  let bytes: Buffer | Uint8Array | null = null;
  try {
    bytes = await localAsset(category, filename);
  } catch {
    if (category === 'citystates') {
      try {
        bytes = await remoteCitystateAsset(filename);
      } catch {
        bytes = null;
      }
    }
  }
  if (!bytes) return new NextResponse(null, { status: 404 });

  const cacheControl = process.env.NODE_ENV === 'production'
    ? 'public, max-age=31536000, immutable'
    : 'no-store, no-cache, must-revalidate, proxy-revalidate';
  return new NextResponse(bytes, { headers: { 'Content-Type': contentTypeFor(filename), 'Cache-Control': cacheControl } });
}
