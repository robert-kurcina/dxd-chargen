export const ATTRIBUTES = {
  STR: 'Strength',
  AGI: 'Agility',
  INT: 'Intelligence',
  WILL: 'Willpower',
  PER: 'Perception',
  CHA: 'Charisma',
} as const;

export type Attribute = keyof typeof ATTRIBUTES;

export const SKILLS: Record<string, { attribute: Attribute }> = {
  Athletics: { attribute: 'STR' },
  'Melee Combat': { attribute: 'STR' },
  Stealth: { attribute: 'AGI' },
  'Ranged Combat': { attribute: 'AGI' },
  Lore: { attribute: 'INT' },
  Crafting: { attribute: 'INT' },
  Resolve: { attribute: 'WILL' },
  Endurance: { attribute: 'WILL' },
  Investigation: { attribute: 'PER' },
  Awareness: { attribute: 'PER' },
  Persuasion: { attribute: 'CHA' },
  Deception: { attribute: 'CHA' },
};
