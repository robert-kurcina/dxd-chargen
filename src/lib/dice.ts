
import type { StaticData } from "@/data";

/**
 * Rolls a specified number of 6-sided dice and sums the results.
 * @param numberOfDice The number of D6 to roll. Defaults to 1.
 * @returns A random number representing the sum of the dice rolls.
 */
export function D6(numberOfDice: number = 1): number {
  let sum = 0;
  for (let i = 0; i < numberOfDice; i++) {
    // Using Math.random() is fine here as it's for non-critical, client-side generation.
    sum += Math.floor(Math.random() * 6) + 1;
  }
  return sum;
}

/**
 * Rolls a D66 (two 6-sided dice, one for tens, one for units).
 * @returns A random number between 11 and 66 where the second digit is never greater than 6.
 */
export function D66(): number {
  const d1 = D6();
  const d2 = D6();
  return d1 * 10 + d2;
}

type TableRow = { d66: string; [key: string]: any };

/**
 * Looks up a value in a D66 table.
 * The 'd66' column can contain single numbers or a string range like "11-16".
 * @param d66Value The D66 value to look up.
 * @param table The data table to search in.
 * @returns The matching row from the table, or undefined if no match is found.
 */
export function d66Lookup(d66Value: number, table: TableRow[]): TableRow | undefined {
  for (const row of table) {
    const range = row.d66;

    // Skip rows with no valid D66 mapping
    if (range === '-') {
      continue;
    }

    if (range.includes('-')) {
      const [minStr, maxStr] = range.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      if (!isNaN(min) && !isNaN(max) && d66Value >= min && d66Value <= max) {
        return row;
      }
    } else {
      const value = parseInt(range, 10);
      if (!isNaN(value) && value === d66Value) {
        return row;
      }
    }
  }
  return undefined;
}

/**
 * Given a row from a d66 table, it finds the correct value based on a d6 roll.
 * It looks for column headers that are comma-separated numbers (e.g., "1,2,3" or "4,5,6").
 * @param d6Value The D6 roll (1-6).
 * @param row The row object from the d66 lookup.
 * @returns The value from the column that the d6 roll falls into.
 */
export function d6ColumnLookup(d6Value: number, row: TableRow): string | undefined {
  if (!row) {
    return undefined;
  }

  for (const key in row) {
    if (key === 'd66' || !row.hasOwnProperty(key)) {
      continue;
    }

    const columnNumbers = key.split(',').map(n => parseInt(n.trim(), 10));

    if (columnNumbers.some(isNaN)) {
      continue; // Skip keys that are not number ranges
    }

    if (columnNumbers.includes(d6Value)) {
      return row[key];
    }
  }

  return undefined;
}
