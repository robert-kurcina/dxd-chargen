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

/**
 * Checks if a trait string represents a disability (i.e., is wrapped in square brackets).
 * @param trait The full trait string (e.g., "[Coward X]").
 * @returns True if the trait is a disability.
 */
export function isDisability(trait: string): boolean {
  return trait.trim().startsWith('[') && trait.trim().endsWith(']');
}

/**
 * Parses a complex talent or trait string into its constituent parts.
 * Handles asterisks, trait names, levels (implicit or explicit), specializations, and disability markers.
 * e.g., "***[Hatred 2 > Elves]" -> { name: "Hatred", level: 2, specialization: "Elves", isDisability: true, asterisks: 3 }
 * @param fullTraitString The talent or trait string to parse.
 * @returns An object containing the parsed components of the trait.
 */
export function parseTalent(fullTraitString: string): {
  name: string;
  level: number;
  specialization: string | null;
  isDisability: boolean;
  asterisks: number;
} {
  let traitStr = fullTraitString.trim();

  // 1. Count and remove leading asterisks
  let asterisks = 0;
  while (traitStr.startsWith('*')) {
    asterisks++;
    traitStr = traitStr.substring(1);
  }

  // 2. Check for disability and remove brackets for parsing
  const disability = isDisability(traitStr);
  if (disability) {
    traitStr = traitStr.substring(1, traitStr.length - 1);
  }

  // 3. Separate specialization
  const specializationParts = traitStr.split(' > ');
  const mainPart = specializationParts[0];
  const specialization = specializationParts.length > 1 ? specializationParts[1].trim() : null;

  // 4. Extract level and name from the main part
  const levelMatch = mainPart.match(/\s+(\d+)$/);
  let level = 1; // Default level is 1
  let name: string;

  if (levelMatch) {
    level = parseInt(levelMatch[1], 10);
    // Remove the level from the name part
    name = mainPart.substring(0, levelMatch.index).trim();
  } else {
    // No explicit level, the whole mainPart is the name
    name = mainPart.trim();
  }

  return {
    name,
    level,
    specialization,
    isDisability: disability,
    asterisks,
  };
}

/**
 * Parses a simple trait string (without asterisks) into its components.
 * This is a convenience wrapper around parseTalent.
 * @param traitString The trait string to parse.
 * @returns An object containing the parsed components.
 */
export function parseTrait(traitString: string): {
  name: string;
  level: number;
  specialization: string | null;
  isDisability: boolean;
} {
    const { name, level, specialization, isDisability } = parseTalent(traitString);
    return { name, level, specialization, isDisability };
}
