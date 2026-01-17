
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

/**
 * Formats a number into a string with "K" for thousands or "M" for millions.
 * @param value The number or string to format.
 * @returns A formatted string (e.g., "10 K") or the original value if not a number.
 */
export function formatNumberWithSuffix(value: number | string): string {
  if (value === null || value === undefined) return '';
  
  let num;
  if (typeof value === 'string') {
    // Remove commas for parsing
    num = parseFloat(value.replace(/,/g, ''));
  } else {
    num = value;
  }

  if (isNaN(num)) {
    return String(value);
  }

  if (num >= 1000000) {
    const millions = num / 1000000;
    // Use toPrecision to avoid floating point inaccuracies in the final string
    return `${Number(millions.toPrecision(15))} M`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return `${Number(thousands.toPrecision(15))} K`;
  }
  return String(num);
}

/**
 * Parses a string with "K" or "M" suffixes back into its numeric equivalent.
 * @param value The string to parse (e.g., "10 K").
 * @returns The parsed number.
 */
export function parseNumberWithSuffix(value: string | number): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string') {
        return NaN;
    }

    const s = value.trim().toUpperCase();
    if (s === '') {
        return NaN;
    }
    
    // The main number part, handles scientific notation as well
    const numPart = parseFloat(s);

    if (s.endsWith(' K')) {
        return numPart * 1000;
    }
    if (s.endsWith(' M')) {
        return numPart * 1000000;
    }
    
    // If no suffix, just return the parsed number
    return parseFloat(s);
}
