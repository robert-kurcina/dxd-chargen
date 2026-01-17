import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Finds a key in an object in a case-insensitive manner.
 * @param obj The object to search.
 * @param keyToFind The key string to find.
 * @returns The original key from the object if found, otherwise undefined.
 */
export function findKeyCaseInsensitive(obj: Record<string, any>, keyToFind: string): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    return Object.keys(obj).find(key => key.toLowerCase() === keyToFind.toLowerCase());
}
