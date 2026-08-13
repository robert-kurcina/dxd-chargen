import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATEGORIES = new Set(['decals', 'images', 'maps']);
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ category: string; filename: string }> },
) {
  const { category, filename } = await context.params;
  if (!CATEGORIES.has(category) || !SAFE_FILENAME.test(filename)) return new NextResponse(null, { status: 400 });
  try {
    const bytes = await readFile(path.join(process.cwd(), 'data', category, filename));
    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : extension === '.pdf' ? 'application/pdf' : 'application/octet-stream';
    return new NextResponse(bytes, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
