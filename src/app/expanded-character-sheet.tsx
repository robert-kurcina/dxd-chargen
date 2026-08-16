'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { StaticData } from '@/data';
import type { CharacterDraft } from '@/lib/character-draft';
import { projectCharacterSheet, type CharacterSheetData } from '@/lib/character-sheet-projection';
import { calculateProperties } from '@/lib/rules/properties';
import { adjustedGearValues, carriedItemWeight, displayInventoryQuantity, gearSizeAdjustment, isWornEquipment, type InventoryCategory } from '@/lib/rules/utilities';

const statureFrameLabels: Record<number, string> = {
  [-2]: 'Shorter',
  [-1]: 'Short',
  0: 'Average',
  1: 'Tall',
  2: 'Taller',
};
const buildFrameLabels: Record<number, string> = {
  [-2]: 'Gracile',
  [-1]: 'Slim',
  0: 'Average',
  1: 'Stout',
  2: 'Robust',
};
const displayMeasure = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
const culturalMarker = (value: string) => {
  const match = value.trim().match(/^(?:all\s+are\s+)?cultural\s*>\s*(.+)$/i);
  return match ? `Cultural > ${match[1].trim()}` : null;
};

function sheetPayload(draft: CharacterDraft, sheet: CharacterSheetData, data: StaticData) {
  const derived = calculateProperties(draft, data);
  const value = (group: Array<{ name: string; value: number | string }>, name: string) => group.find((item) => item.name === name)?.value ?? 0;
  const categoryInventory = (category: InventoryCategory, items: CharacterDraft['utilities']['equipment']) => {
    const inheritedCultural = items.map((item) => culturalMarker(item.name)).find((entry): entry is string => Boolean(entry)) ?? '';
    return items
      .filter((item) => !culturalMarker(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
      .map((item) => ({ category, item, cultural: item.cultural ?? inheritedCultural }));
  };
  const inventory = [
    ...categoryInventory('weapons', draft.utilities.weapons),
    ...categoryInventory('armor', draft.utilities.armor),
    ...categoryInventory('equipment', draft.utilities.equipment),
  ];
  const itemSize = (category: InventoryCategory, item: CharacterDraft['utilities']['equipment'][number], definition?: { name?: string; notes?: string[] }) => {
    const scalable = category === 'weapons' || category === 'armor' || (category === 'equipment' && definition && isWornEquipment(definition));
    if (!scalable) return null;
    const adjustment = gearSizeAdjustment(draft, item.sizedForSiz);
    return adjustment && adjustment.presumedSiz !== 12 ? adjustment.presumedSiz : null;
  };
  const equipmentNames = inventory.map(({ category, item }) => {
    const catalogue = category === 'weapons' ? data.itemWeapons : category === 'armor' ? data.itemArmors : data.itemEquipments;
    const definition = catalogue.find((entry) => entry.catalogId === item.catalogId)
      ?? catalogue.find((entry) => entry.name.localeCompare(item.name, undefined, { sensitivity: 'base' }) === 0);
    const base = displayInventoryQuantity(item.name, item.quantity, item.customAppend);
    const sized = itemSize(category, item, definition);
    return sized ? `${base} SIZ ${sized}` : base;
  });
  const equipmentProperties = inventory.map(({ category, item }) => {
    const catalogue = category === 'weapons' ? data.itemWeapons : category === 'armor' ? data.itemArmors : data.itemEquipments;
    const definition = catalogue.find((entry) => entry.catalogId === item.catalogId)
      ?? catalogue.find((entry) => entry.name.localeCompare(item.name, undefined, { sensitivity: 'base' }) === 0);
    const values = definition
      ? adjustedGearValues(category, definition, draft, data, item.sizedForSiz)
      : { priceGp: item.unitPriceGp, weight: item.unitWeight };
    const priceKnown = Boolean(definition) || Number(item.unitPriceGp) !== 0;
    const weightKnown = Boolean(definition) || Number(item.unitWeight) !== 0;
    const priceText = priceKnown ? `${displayMeasure(Number(values.priceGp) || 0)} gp` : '— gp';
    const weightText = weightKnown ? `${displayMeasure(Number(values.weight) || 0)}#` : '—#';
    if (definition && category === 'weapons') {
      const weapon = values as typeof values & { ora?: number; isBracket?: boolean; acc?: number; impact?: number; damageDice?: number; damageOffset?: number; traits?: string[] };
      const signed = (value: number) => value > 0 ? `+${value}` : String(value);
      const ora = weapon.isBracket ? `[${Number(weapon.ora ?? 0)}]` : (Number(weapon.ora ?? 0) === 0 ? '-' : signed(Number(weapon.ora ?? 0)));
      const dice = Math.max(1, Math.trunc(Number(weapon.damageDice ?? 1) || 1));
      const offset = Math.trunc(Number(weapon.damageOffset ?? 0) || 0);
      const damage = `${dice}D${offset > 0 ? `+${offset}` : offset < 0 ? offset : ''}`;
      const traits = (weapon.traits ?? []).length ? `[${(weapon.traits ?? []).join(', ')}].` : '';
      return `ORa ${ora}  Acc ${signed(Number(weapon.acc ?? 0))}  Impact ${signed(Number(weapon.impact ?? 0))}  Damage ${damage}  ${weightText}  ${priceText}${traits ? `\n${traits}` : ''}`;
    }
    if (definition && category === 'armor') {
      const armor = values as typeof values & { armorRating?: number; deflectRating?: number; traits?: string[] };
      const traits = (armor.traits ?? []).length ? `[${(armor.traits ?? []).join(', ')}].` : '';
      return `Deflect +${Math.trunc(Number(armor.deflectRating ?? 0))}  AR ${Math.trunc(Number(armor.armorRating ?? 0))}  ${weightText}  ${priceText}${traits ? `\n${traits}` : ''}`;
    }
    return `${priceText}; ${weightText}`;
  });
  const equipmentCategories = Object.fromEntries(equipmentNames.map((name, index) => [name, inventory[index].category]));
  const equipmentCultures = Object.fromEntries(equipmentNames.map((name, index) => [name, inventory[index].cultural]).filter(([, cultural]) => Boolean(cultural)));
  const statureAdjustment = derived?.statureAdjustment ?? draft.properties.statureAdjustment ?? 0;
  const buildAdjustment = derived?.buildAdjustment ?? draft.properties.buildAdjustment ?? 0;
  const weightAdjustment = derived?.weightAdjustment ?? draft.properties.weightAdjustment ?? 0;
  const weightStatus = weightAdjustment < 0
    ? `Underweight ${Math.abs(weightAdjustment)}`
    : weightAdjustment > 0
      ? `Overweight ${weightAdjustment}`
      : 'Average';
  const carriedWeight = carriedItemWeight(draft, data);
  return {
    Slug: (sheet.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    Portrait: draft.utilities.portraitDataUrl,
    Name: [sheet.name, sheet.properName ? `[${sheet.properName}]` : ''].filter(Boolean).join('\n'),
    Details: [sheet.details.environ, sheet.details.species, sheet.details.bio, sheet.details.physique].filter(Boolean).join('\n'),
    PML: sheet.pml,
    AffinityAttribute: sheet.affinityAttribute ?? '',
    BrawnLevel: derived?.traitAdjustments.brawn ?? 0,
    AllometricCarryAdjustment: derived?.allometric ?? 0,
    SkillsUnresolved: sheet.history.skillsUnresolved,
    TraitsUnresolved: sheet.history.traitsUnresolved,
    SkillsTerms: sheet.history.skillTerms,
    TraitsTerms: sheet.history.traitTerms,
    ...Object.fromEntries(sheet.attributes.flatMap((attribute) => [[attribute.name, attribute.value], [`${attribute.name}DM`, attribute.modifier]])),
    Profession: sheet.background.profession.join('\n'),
    Settlement: sheet.background.settlement.join('\n'),
    Religion: sheet.background.religion.join('\n'),
    Personality: sheet.background.personality,
    Features: sheet.background.notableFeatures.join(', '),
    HistoryNotes: [
      `Equipment; ${sheet.history.equipment}`,
      `Weapons; ${sheet.history.weapons}`,
      `Armor; ${sheet.history.armor}`,
      `Magic Items; ${sheet.history.magicItems}`,
      `Spells; ${sheet.history.spells ?? ''}`,
      `Skills; ${sheet.history.skills}`,
      `Traits; ${sheet.history.traits}`,
      `Languages; ${sheet.history.languages}`,
    ].join('\n'),
    WeaponsArmorEquipment: equipmentNames.join('\n\n'),
    WeaponsArmorEquipmentProperties: equipmentProperties.join('\n\n'),
    EquipmentCategories: equipmentCategories,
    EquipmentCultures: equipmentCultures,
    EquipmentTotalWeight: `${Math.floor(carriedWeight)}#`,
    BackNotes: [draft.utilities.notes, draft.utilities.backstory].filter(Boolean).join('\n\n'),
    BackName: sheet.name,
    Hitpoints: value(sheet.performance, 'Hitpoints'),
    Bodypoints: value(sheet.performance, 'Bodypoints'),
    Recovery: value(sheet.performance, 'Recovery Rate'),
    Endurance: value(sheet.performance, 'Endurance'),
    Resilience: value(sheet.performance, 'Resilience'),
    Resistance: value(sheet.performance, 'Resistance'),
    WealthRank: value(sheet.miscellaneous, 'Wealth Rank'),
    SocialRank: value(sheet.miscellaneous, 'Social Rank'),
    ProfessionRank: value(sheet.miscellaneous, 'Trade Rank'),
    FavorDice: value(sheet.miscellaneous, 'Favor Dice'),
    Cellburn: value(sheet.miscellaneous, 'Cellburn Limit'),
    Manapool: value(sheet.miscellaneous, 'Manapool'),
    HastyActions: value(sheet.combat, 'Actions'),
    MeleeAttack: value(sheet.combat, 'Melee Attack'),
    MeleeDefend: value(sheet.combat, 'Melee Defend'),
    RangeAttack: value(sheet.combat, 'Range Attack'),
    RangeDefend: value(sheet.combat, 'Range Defend'),
    MaxAdvantage: value(sheet.combat, 'Max Advantage'),
    Profile: draft.properties.profile ?? derived?.profile ?? 0,
    Stature: draft.properties.stature ?? derived?.finalStature ?? 0,
    Build: draft.properties.build ?? derived?.build ?? 0,
    Frame: `${statureAdjustment}/${buildAdjustment}`,
    adjustmentStature: statureFrameLabels[statureAdjustment] ?? String(statureAdjustment),
    adjustmentBuild: buildFrameLabels[buildAdjustment] ?? String(buildAdjustment),
    WeightStatus: weightStatus,
    Physicality: derived?.physicality ?? 0,
    GaspLimit: derived ? `${derived.gaspTurnsScalar}` : '',
    SleepLimit: derived ? `${derived.sleepHoursScalar}` : '',
    ScalarAgility: derived ? Number(derived.agilityFeet.toFixed(2)) : 0,
    ScalarMphRun: derived?.runMph ?? 0,
  };
}

export default function ExpandedCharacterSheet({ draft, data }: { draft: CharacterDraft; data: StaticData }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const sheet = useMemo(() => projectCharacterSheet(draft, data), [draft, data]);
  const payload = useMemo(() => sheetPayload(draft, sheet, data), [draft, sheet, data]);
  const send = useCallback(() => iframe.current?.contentWindow?.postMessage({ type: 'dxd-character-sheet', payload }, window.location.origin), [payload]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === iframe.current?.contentWindow && event.data?.type === 'dxd-character-sheet-ready') send();
    };
    window.addEventListener('message', receive);
    send();
    return () => window.removeEventListener('message', receive);
  }, [send]);
  return <iframe ref={iframe} title="Sarna Len character sheet" src="/character-creator/index.html?embed=1" onLoad={send} sandbox="allow-scripts allow-same-origin allow-downloads" className="block h-full min-h-0 w-full overscroll-contain border-0 bg-white md:rounded-lg md:border" />;
}
