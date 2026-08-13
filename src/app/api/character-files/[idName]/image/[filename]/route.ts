import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const ROOT = path.join(process.cwd(), 'data', 'characters');
export async function GET(_: Request, context: { params: Promise<{ idName: string; filename: string }> }) {
  const { idName, filename } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idName) || !/^portrait\.(?:png|jpe?g|webp)$/i.test(filename)) return new NextResponse(null, { status: 400 });
  try { const body = await readFile(path.join(ROOT, idName, filename)); const contentType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg'; return new NextResponse(body, { headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' } }); }
  catch { return new NextResponse(null, { status: 404 }); }
}
