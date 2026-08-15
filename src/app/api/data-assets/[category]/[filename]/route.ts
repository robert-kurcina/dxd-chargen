import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATEGORIES = new Set(['decals', 'images', 'maps', 'peoples']);
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*$/i;
const PEOPLE_PAIR = /^(?:ancestral\.pairs-\d+|phenotype\.pair)\.png$/i;
const PEOPLE_HOLOTYPE = /^humaniki-(?:alef|babbita|drauf|gnoan|human|klenari)\.png$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ category: string; filename: string }> },
) {
  const { category, filename } = await context.params;
  if (!CATEGORIES.has(category) || !SAFE_FILENAME.test(filename) || (category === 'peoples' && !filename.toLowerCase().endsWith('.png'))) return new NextResponse(null, { status: 400 });
  try {
    const directory = category === 'peoples' && PEOPLE_PAIR.test(filename)
      ? path.join('data', 'peoples', '_pairs')
      : category === 'peoples' && PEOPLE_HOLOTYPE.test(filename)
        ? path.join('data', 'peoples', 'holotypes')
        : path.join('data', category);
    const bytes = await readFile(path.join(process.cwd(), directory, filename));
    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : extension === '.pdf' ? 'application/pdf' : 'application/octet-stream';
    const cacheControl = process.env.NODE_ENV === 'production'
      ? 'public, max-age=31536000, immutable'
      : 'no-store, no-cache, must-revalidate, proxy-revalidate';
    return new NextResponse(bytes, { headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
