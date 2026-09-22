/** Reversible JSON edits. No game rules, browser storage, or random side effects. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Slot = { exists: false } | { exists: true; value: Json };
type Patch = { path: string[]; before: Slot; after: Slot };
export type Edit = { label: string; patches: Patch[] };
export type History = { past: Edit[]; future: Edit[] };
export const HISTORY_BYTES = 10_000;
export const MEMORY_ACTIONS = 50;
export const emptyHistory = (): History => ({ past: [], future: [] });
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const object = (v: unknown): v is Record<string, Json> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const slot = (value: Record<string, Json>, key: string): Slot => Object.hasOwn(value, key) ? { exists: true, value: value[key] } : { exists: false };

function diff(before: Json, after: Json, path: string[] = []): Patch[] {
  if (equal(before, after)) return [];
  if (!object(before) || !object(after)) return [{ path, before: { exists: true, value: before }, after: { exists: true, value: after } }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
    if (unsafe.has(key)) throw new Error('Unsafe history path');
    const a = slot(before, key), b = slot(after, key);
    if (a.exists && b.exists) return diff(a.value, b.value, [...path, key]);
    return equal(a, b) ? [] : [{ path: [...path, key], before: a, after: b }];
  });
}

export function recordEdit(history: History, before: Json, after: Json, label = 'Edit character'): History {
  const patches = diff(before, after);
  if (!patches.length) return history;
  return { past: [...history.past, { label, patches: clone(patches) }].slice(-MEMORY_ACTIONS), future: [] };
}

function apply(value: Json, edit: Edit, direction: 'before' | 'after'): Json {
  let next = clone(value);
  if (!edit || typeof edit.label !== 'string' || !Array.isArray(edit.patches)) throw new Error('Invalid history entry');
  for (const patch of edit.patches) {
    if (!Array.isArray(patch.path) || patch.path.some(key => typeof key !== 'string' || unsafe.has(key))) throw new Error('Unsafe history path');
    const expected = direction === 'before' ? patch.after : patch.before;
    const replacement = patch[direction];
    for (const value of [expected, replacement]) {
      if (!value || typeof value.exists !== 'boolean' || (value.exists && !Object.hasOwn(value, 'value'))) throw new Error('Invalid history value');
    }
    if (patch.path.length === 0) {
      if (!expected.exists || !replacement.exists || !equal(next, expected.value)) throw new Error('History no longer matches');
      next = clone(replacement.value);
      continue;
    }
    let parent = next;
    for (const key of patch.path.slice(0, -1)) {
      if (!object(parent) || !Object.hasOwn(parent, key)) throw new Error('Missing history path');
      parent = parent[key];
    }
    if (!object(parent)) throw new Error('Invalid history parent');
    const key = patch.path[patch.path.length - 1];
    if (!equal(slot(parent, key), expected)) throw new Error('History no longer matches');
    if (replacement.exists) parent[key] = clone(replacement.value); else delete parent[key];
  }
  return next;
}

export function travel(value: Json, history: History, direction: 'undo' | 'redo'): { value: Json; history: History } {
  const undo = direction === 'undo';
  const source = undo ? history.past : history.future;
  const edit = source[source.length - 1];
  if (!edit) return { value, history };
  const next = apply(value, edit, undo ? 'before' : 'after');
  return { value: next, history: undo
    ? { past: history.past.slice(0, -1), future: [...history.future, edit] }
    : { past: [...history.past, edit], future: history.future.slice(0, -1) } };
}

/** Content-change detector only; never an authentication or integrity credential. */
function fingerprint(value: Json): string {
  const text = JSON.stringify(value);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
  return `${text.length}:${a >>> 0}:${b >>> 0}`;
}
export function packHistory(characterId: string, value: Json, history: History): { text: string; truncated: boolean } {
  const kept = { past: [...history.past], future: [...history.future] };
  const encode = () => JSON.stringify({ version: 1, characterId, head: fingerprint(value), ...kept });
  let text = encode();
  while (new TextEncoder().encode(text).length >= HISTORY_BYTES && (kept.past.length || kept.future.length)) {
    // Remove farthest undo or redo, retaining a contiguous chain in each direction.
    if (kept.past.length >= kept.future.length) kept.past.shift(); else kept.future.shift();
    text = encode();
  }
  if (new TextEncoder().encode(text).length >= HISTORY_BYTES) throw new Error('History metadata exceeds budget');
  return { text, truncated: kept.past.length !== history.past.length || kept.future.length !== history.future.length };
}

export function unpackHistory(text: string | null, characterId: string, value: Json): History {
  if (!text || new TextEncoder().encode(text).length >= HISTORY_BYTES) return emptyHistory();
  try {
    const parsed = JSON.parse(text);
    if (parsed.version !== 1 || parsed.characterId !== characterId || parsed.head !== fingerprint(value) || !Array.isArray(parsed.past) || !Array.isArray(parsed.future) || parsed.past.length + parsed.future.length > MEMORY_ACTIONS) return emptyHistory();
    for (const [entries, direction] of [[parsed.past, 'before'], [parsed.future, 'after']] as const) {
      let check = value;
      for (const entry of [...entries].reverse()) check = apply(check, entry, direction);
    }
    return { past: parsed.past, future: parsed.future };
  } catch { return emptyHistory(); }
}
