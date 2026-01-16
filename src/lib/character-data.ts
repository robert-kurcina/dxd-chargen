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

export const SOCIAL_RANKS = [
  {
    threshold: 50,
    name: 'Noble',
    description: 'A person of high birth or rank.',
  },
  {
    threshold: 40,
    name: 'Gentry',
    description: 'Well-born, bred, or positioned people.',
  },
  {
    threshold: 30,
    name: 'Artisan',
    description: 'A skilled craft worker who makes or creates things by hand.',
  },
  {
    threshold: 20,
    name: 'Commoner',
    description: 'An ordinary person, without rank or title.',
  },
  {
    threshold: 0,
    name: 'Outcast',
    description: 'A person who has been rejected by society or a social group.',
  },
];

export const BASE_TALENTS: Record<string, { attribute: Attribute; threshold: number }> = {
  'Mighty Blow': { attribute: 'STR', threshold: 8 },
  'Iron Grip': { attribute: 'STR', threshold: 9 },
  'Fleet Footed': { attribute: 'AGI', threshold: 8 },
  'Lightning Reflexes': { attribute: 'AGI', threshold: 9 },
  'Quick Wit': { attribute: 'INT', threshold: 8 },
  'Encyclopedic Knowledge': { attribute: 'INT', threshold: 9 },
  'Iron Will': { attribute: 'WILL', threshold: 8 },
  'Unbreakable': { attribute: 'WILL', threshold: 9 },
  'Keen Eyes': { attribute: 'PER', threshold: 8 },
  'Danger Sense': { attribute: 'PER', threshold: 9 },
  'Silver Tongue': { attribute: 'CHA', threshold: 8 },
  'Born Leader': { attribute: 'CHA', threshold: 9 },
};
