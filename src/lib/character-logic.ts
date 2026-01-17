import type { StaticData } from "@/data";
import { D6, D66, d66Lookup } from "./dice";
import { findKeyCaseInsensitive } from "./utils";


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

  if (specializationParts.length > 1 && !levelMatch) {
    // Handles cases like 'Bar > Baz', which implies 'Bar 1 > Baz'
    level = 1;
  }
  
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
    if (!rank) return 0;
    switch (rank.toUpperCase()) {
        case 'A': return -1;
        case 'B': return -2;
        case 'C': return -3;
        default: 
            const parsed = parseInt(rank, 10);
            return isNaN(parsed) ? 0 : parsed;
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

        // Rule: Prioritize Age Group match if a term matches both
        const ageRankEntry = data.ageGroups.find(g => g.ageGroup.toLowerCase() === name.toLowerCase());
        if (ageRankEntry) {
            if (rankMatch) {
                result.ageRank = getAgeRankValue(rankMatch[1]);
            } else {
                result.ageRank = getAgeRankValue(ageRankEntry.rank);
            }
            continue; 
        } 
        
        const profRankByName = data.namingPracticeTitles.find(
            (p) => Object.values(p).some(val => typeof val === 'string' && val.toLowerCase() === name.toLowerCase())
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

    let finalAsterisks = parsed.asterisks - maturityDifference;
    if (finalAsterisks < 0) {
        finalAsterisks = 0;
    }
    
    const finalLevel = parsed.level - finalAsterisks;
    
    if (finalLevel <= 0) {
        return ''; // Talent is disqualified
    }
    
    // Reconstruct the string
    let result = parsed.name;
    if (finalLevel > 1) {
        result += ` ${finalLevel}`;
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
 * Parses an Interim Multiple (IM) string or number to extract its numeric value.
 * e.g., "IM 5x" -> 5 or 5 -> 5
 * @param imString The IM value to parse.
 * @returns The numeric value of the IM, or 0 if parsing fails.
 */
export function parseIM(imString: string | number): number {
  if (typeof imString === 'number') {
    return imString;
  }
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
    const rank8Bracket = speciesBrackets.find(b => getAgeRankValue(b.rank) === 8);
    if (!rank8Bracket) return startAge; // Should not happen with valid data
    const difference = Math.abs(startAge - rank8Bracket.age);
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

/**
 * Parses a tragedy seed template string to extract keywords.
 * Keywords are enclosed in parentheses, e.g., "(Person)". The keyword "Self" is ignored.
 * @param template The template string, e.g., "(Person) Killed by (Event and Member)".
 * @returns An array of keywords found in the template, excluding "Self".
 */
export function parseTragedyTemplate(template: string): string[] {
  const matches = template.match(/\((.*?)\)/g);
  if (!matches) {
    return [];
  }
  // Remove parentheses and filter out "Self"
  return matches.map(m => m.slice(1, -1)).filter(k => k.toLowerCase() !== 'self');
}

/**
 * Looks up a value for a specific keyword from the "Random Person Item Deity" table using a D66 roll.
 * Applies special logic for the 'Person' column if it contains an asterisk.
 * @param keyword The column name to look up (e.g., "Person", "Citystate").
 * @param d66Roll The D66 roll to find the row.
 * @param table The `randomPersonItemDeity` data table.
 * @returns An object with the raw value, resolved value, and details of any special resolution.
 */
export function lookupTragedyKeyword(keyword: string, d66Roll: number, table: StaticData['randomPersonItemDeity']): { raw: string, resolved: string, details: string } {
  const row = d66Lookup(d66Roll, table);
  if (!row) {
    const unknown = 'UNKNOWN_ROW';
    return { raw: unknown, resolved: unknown, details: '' };
  }

  const matchingKey = findKeyCaseInsensitive(row, keyword);

  if (matchingKey) {
    const rawValue = row[matchingKey];

    if (matchingKey.toLowerCase() === 'person' && typeof rawValue === 'string' && rawValue.includes('*')) {
      const roll = D6();
      const baseValue = rawValue.replace('*', '').trim();
      if (roll >= 4) {
        return {
          raw: rawValue,
          resolved: `${baseValue}-in-law`,
          details: `(D6 roll: ${roll} -> in-law)`
        };
      }
      return {
        raw: rawValue,
        resolved: baseValue,
        details: `(D6 roll: ${roll} -> no change)`
      };
    }
    
    return { raw: rawValue, resolved: rawValue, details: '' };
  }
  
  const unknownKey = 'UNKNOWN_KEYWORD';
  return { raw: unknownKey, resolved: unknownKey, details: '' };
}


/**
 * Resolves a full tragedy seed template by looking up its keywords.
 * @param template The template string to resolve.
 * @param randomPersonItemDeityTable The data table for lookups.
 * @returns The resolved string.
 */
export function resolveTragedySeed(template: string, randomPersonItemDeityTable: StaticData['randomPersonItemDeity']): string {
  const keywords = parseTragedyTemplate(template);
  let resolvedString = template;

  for (const keyword of keywords) {
    const roll = D66();
    const replacement = lookupTragedyKeyword(keyword, roll, randomPersonItemDeityTable).resolved;
    
    const regex = new RegExp(`\\(${keyword}\\)`, 'i');
    resolvedString = resolvedString.replace(regex, replacement);
  }

  return resolvedString;
}

/**
 * Calculates the skillpoint cost of a single trait string (e.g., "Acrobatic 3").
 * @param traitString The trait string to calculate the cost for.
 * @param data The static data containing the traits table.
 * @returns The calculated skillpoint cost, or 0 if the trait is not found.
 */
export function calculateTraitSkillpointCost(traitString: string, data: StaticData): number {
    if (!traitString) return 0;

    const { name, level } = parseTrait(traitString);
    
    // Create a canonical key for lookup
    const canonicalKey = (name.endsWith(' X') ? name : `${name} X`).toLowerCase();
    
    const traitDefinition = data.traits.find(t => {
        const traitKey = t.Key.split(' > ')[0].toLowerCase();
        return traitKey === canonicalKey;
    });

    if (!traitDefinition) return 0;
    
    const imCost = parseIM(traitDefinition.im);
    return level * imCost;
}

/**
 * Calculates the total skillpoint cost for a string of attribute adjustments (e.g., "+2 STR, +1 FOR").
 * @param attributesString The string containing attribute adjustments.
 * @param data The static data containing attribute definitions.
 * @returns The total calculated skillpoint cost.
 */
export function calculateAttributeSkillpointCost(attributesString: string, data: StaticData): number {
    if (!attributesString) return 0;

    let totalCost = 0;
    const adjustments = attributesString.split(',').map(s => s.trim());

    for (const adj of adjustments) {
        const parts = adj.split(' ');
        if (parts.length !== 2) continue;

        const modifier = parseInt(parts[0], 10);
        const attrAbbr = parts[1].toUpperCase();

        if (isNaN(modifier)) continue;

        for (const group of data.attributeDefinitions) {
            const attrDef = group.attributes.find(a => a.abbreviation === attrAbbr);
            if (attrDef) {
                const imCost = parseIM(attrDef.im);
                totalCost += modifier * imCost;
                break;
            }
        }
    }
    return totalCost;
}

/**
 * Calculates the total skillpoint cost for a string of characteristic adjustments (e.g., "+1 Bodypoints").
 * @param characteristicsString The string containing characteristic adjustments.
 * @param data The static data containing characteristic costs.
 * @returns The total calculated skillpoint cost.
 */
export function calculateCharacteristicSkillpointCost(characteristicsString: string, data: StaticData): number {
    if (!characteristicsString) return 0;

    let totalCost = 0;
    const adjustments = characteristicsString.split(',').map(s => s.trim());

    for (const adj of adjustments) {
        const parts = adj.split(' ');
        if (parts.length !== 2) continue;

        const modifier = parseInt(parts[0], 10);
        const charName = parts[1];

        if (isNaN(modifier)) continue;

        const charCostDef = data.characteristicCosts.find(c => c.characteristic.toLowerCase() === charName.toLowerCase());

        if (charCostDef) {
            totalCost += modifier * charCostDef.cost;
        }
    }
    return totalCost;
}


/**
 * Calculates the total skillpoint cost for a string of bonus traits (e.g., "+1 Brawn, +2 Climb").
 * @param bonusString The string containing bonus traits.
 * @param data The static data containing the traits table.
 * @returns The total calculated skillpoint cost.
 */
export function calculateBonusSkillpointCost(bonusString: string, data: StaticData): number {
    if (!bonusString) return 0;
    
    let totalCost = 0;
    const bonuses = bonusString.split(',').map(s => s.trim());
    
    for (const bonus of bonuses) {
        // This regex handles cases like "+1 Brawn" and "+2 Detect > Sound"
        const match = bonus.match(/([+-]?\d+)\s+(.*)/);
        if (!match) continue;

        const modifier = parseInt(match[1], 10);
        const traitAndSpecialization = match[2];

        if (isNaN(modifier)) continue;

        const singleLevelCost = calculateTraitSkillpointCost(traitAndSpecialization, data);
        
        // calculateTraitSkillpointCost already returns cost for level 1 of the trait
        // so we just multiply by the modifier
        totalCost += modifier * singleLevelCost;
    }
    
    return totalCost;
}
