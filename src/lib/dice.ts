import type { StaticData } from "@/data";

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

/**
 * Converts a string Age Rank (like 'A', 'B', 'C', '5') into its numeric equivalent.
 * @param rank The string rank.
 * @returns The numeric rank value.
 */
export function getAgeRankValue(rank: string): number {
    switch (rank.toUpperCase()) {
        case 'A': return -1;
        case 'B': return -2;
        case 'C': return -3;
        default: return parseInt(rank, 10);
    }
}

/**
 * Finds the Age Rank for a given Age Group from the data table.
 * @param ageGroup The age group string (e.g., "Early Teen").
 * @param ageGroups The ageGroups data table.
 * @returns The corresponding rank string, or undefined.
 */
export function getAgeRank(ageGroup: string, ageGroups: StaticData['ageGroups']): string | undefined {
    const entry = ageGroups.find(g => g.ageGroup.toLowerCase() === ageGroup.toLowerCase());
    return entry?.rank;
}

/**
 * Finds the Age Group for a given Age Rank from the data table.
 * @param ageRank The age rank (e.g., 5 or "5").
 * @param ageGroups The ageGroups data table.
 * @returns The corresponding age group string, or undefined.
 */
export function getAgeGroup(ageRank: number | string, ageGroups: StaticData['ageGroups']): string | undefined {
    const rankStr = String(ageRank);
    const entry = ageGroups.find(g => g.rank === rankStr);
    return entry?.ageGroup;
}


/**
 * Parses a maturity string which can contain Age Group and/or Profession Rank.
 * e.g. "Youth[0] or Genera[4]"
 * @param maturityString The string to parse.
 * @param data The static data containing ageGroups and namingPracticeTitles.
 * @returns An object with numeric ageRank and professionRank.
 */
export function parseMaturityString(maturityString: string, data: { ageGroups: StaticData['ageGroups'], namingPracticeTitles: StaticData['namingPracticeTitles'] }): { ageRank: number, professionRank: number } {
    const result = { ageRank: 0, professionRank: 0 };
    if (!maturityString || maturityString.trim() === '') return result;

    const parts = maturityString.split(' or ');

    for (const part of parts) {
        const trimmedPart = part.trim();
        const rankMatch = trimmedPart.match(/\[(.+?)\]/);
        const name = trimmedPart.replace(/\[.+?\]/, '').trim();

        // Is it an Age Group? Prioritize this match.
        const ageRankEntry = data.ageGroups.find(g => g.ageGroup.toLowerCase() === name.toLowerCase());
        if (ageRankEntry) {
            if (rankMatch) {
                result.ageRank = getAgeRankValue(rankMatch[1]);
            } else {
                result.ageRank = getAgeRankValue(ageRankEntry.rank);
            }
            // If we found an age group, don't also look for a profession title with the same name
            continue;
        } 
        
        // Only if it's NOT an age group, check if it's a profession title
        const profRankByName = data.namingPracticeTitles.find(
            p => Object.values(p).some(val => typeof val === 'string' && val.toLowerCase() === name.toLowerCase())
        );

        if (profRankByName) {
             if (rankMatch) {
                result.professionRank = parseInt(rankMatch[1], 10);
            } else {
                result.professionRank = parseInt(profRankByName['Rank'], 10);
            }
        }
    }

    return result;
}


/**
 * Calculates the highest maturity difference between a character and a talent's requirement.
 * @param characterMaturity The character's age and profession ranks.
 * @param talentMaturity The talent's required age and profession ranks.
 * @returns The highest difference value.
 */
export function calculateMaturityDifference(
    characterMaturity: { ageRank: number, professionRank: number },
    talentMaturity: { ageRank: number, professionRank: number }
): number {
    const ageDiff = characterMaturity.ageRank - talentMaturity.ageRank;
    const profDiff = characterMaturity.professionRank - talentMaturity.professionRank;
    
    return Math.max(ageDiff, profDiff);
}


/**
 * Adjusts a talent's level based on asterisks and a maturity difference.
 * @param talentString The full talent string (e.g., "***Foo 5").
 * @param maturityDifference The calculated difference to apply to the asterisks.
 * @returns The adjusted talent string, or an empty string if the talent is disqualified.
 */
export function adjustTalentByMaturity(talentString: string, maturityDifference: number): string {
    const parsed = parseTalent(talentString);

    let newAsterisks = parsed.asterisks - maturityDifference;
    if (newAsterisks < 0) {
        newAsterisks = 0; 
    }
    
    const newLevel = parsed.level - newAsterisks;
    
    if (newLevel <= 0) {
        return ''; // Talent is disqualified
    }
    
    // Reconstruct the string
    let result = parsed.name;
    if (newLevel > 1) {
        result += ` ${newLevel}`;
    }
    if (parsed.specialization) {
        result += ` > ${parsed.specialization}`;
    }
    if (parsed.isDisability) {
        result = `[${result}]`;
    }

    return result;
}

/**
 * Formats a number to include a leading '+' if it's positive.
 * @param num The number to format.
 * @returns A string representation of the number.
 */
export function formatPositiveNumber(num: number): string {
  if (num > 0) {
    return `+${num}`;
  }
  return String(num);
}

/**
 * Parses an Interim Multiple (IM) string to extract its numeric value.
 * e.g., "IM 5x" -> 5
 * @param imString The IM string to parse.
 * @returns The numeric value of the IM, or 0 if parsing fails.
 */
export function parseIM(imString: string): number {
  if (!imString) return 0;
  const match = imString.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}


/**
 * Generates a random age in years for a character based on their species and age group.
 * @param speciesName The name of the character's species (e.g., "Alef").
 * @param ageGroup The character's age group (e.g., "Young Adult").
 * @param ageBrackets The ageBrackets data table.
 * @param ageGroups The ageGroups data table.
 * @returns A random integer representing the character's age in years.
 */
export function getAgeInYears(
  speciesName: keyof StaticData['ageBrackets'],
  ageGroup: string,
  ageBrackets: StaticData['ageBrackets'],
  ageGroups: StaticData['ageGroups']
): number | null {
  const speciesBrackets = ageBrackets[speciesName];
  if (!speciesBrackets) {
    return null; // Species not found
  }

  const currentRankStr = getAgeRank(ageGroup, ageGroups);
  if (currentRankStr === undefined) {
    return null; // Age group not found
  }
  
  const currentBracket = speciesBrackets.find(b => b.rank === currentRankStr);
  if (!currentBracket) {
      return null;
  }

  const startAge = currentBracket.age;
  let endAge: number;
  
  const currentRankValue = getAgeRankValue(currentRankStr);
  
  if (currentRankValue >= 9) {
    // Handle the "Venerable" case (or any max rank)
    const rank8Bracket = speciesBrackets.find(b => b.rank === '8');
    if (!rank8Bracket) return startAge; // Should not happen with valid data
    const difference = startAge - rank8Bracket.age;
    endAge = startAge + difference;
  } else {
    // Find the next rank's bracket. We must find the numeric rank first.
    const nextRankValue = currentRankValue + 1;
    // Find the string representation of the next rank from the main ageGroups table
    const nextRankStr = ageGroups.find(g => getAgeRankValue(g.rank) === nextRankValue)?.rank;

    if (!nextRankStr) return startAge; // Should not happen
    
    const nextBracket = speciesBrackets.find(b => b.rank === nextRankStr);
    if (!nextBracket) {
        return startAge;
    }
    endAge = nextBracket.age;
  }

  // Return a random integer from startAge (inclusive) to endAge (exclusive)
  return Math.floor(Math.random() * (endAge - startAge)) + startAge;
}
