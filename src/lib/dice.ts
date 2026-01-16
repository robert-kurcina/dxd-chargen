/**
 * Rolls a single 6-sided die.
 * @returns A random number between 1 and 6.
 */
export function D6(): number {
  // Using Math.random() is fine here as it's for non-critical, client-side generation.
  return Math.floor(Math.random() * 6) + 1;
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
