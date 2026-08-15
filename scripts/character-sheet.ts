/**
 * TypeScript port of the DXDCRS Sarna Len character-sheet logic.
 *
 * The original Lua script coupled these rules to Tabletop Simulator's `self`
 * object. This module keeps the rules pure so a browser UI, tests, or an
 * exporter can consume them without a TTS runtime.
 */

export type FieldValue = string | number | null | undefined;

export interface CharacterValues {
  [field: string]: FieldValue;
  Name?: FieldValue;
  CCA?: FieldValue;
  RCA?: FieldValue;
  REF?: FieldValue;
  INT?: FieldValue;
  KNO?: FieldValue;
  PRE?: FieldValue;
  POW?: FieldValue;
  STR?: FieldValue;
  FOR?: FieldValue;
  MOV?: FieldValue;
  SIZ?: FieldValue;
  ZED?: FieldValue;
  PML?: FieldValue;
  Stature?: FieldValue;
  Build?: FieldValue;
  Hitpoints?: FieldValue;
  Bodypoints?: FieldValue;
  Recovery?: FieldValue;
  Endurance?: FieldValue;
  Resilience?: FieldValue;
  Resistance?: FieldValue;
  Damage?: FieldValue;
  Injury?: FieldValue;
  Fatigue?: FieldValue;
  Weariness?: FieldValue;
  Stress?: FieldValue;
  Rads?: FieldValue;
  FavorDice?: FieldValue;
  Cellburn?: FieldValue;
  Manapool?: FieldValue;
}

export interface Decal {
  name: string;
}

export interface DisplayField {
  value: string | number;
  tooltip?: string;
}

export interface CharacterSheetResult {
  values: CharacterValues;
  display: Record<string, DisplayField>;
}

export interface SavedCharacterSheet {
  checkbox: Record<string, boolean>;
  counter: Record<string, number>;
  textbox: Record<string, FieldValue>;
}

export const HISTORY_NOTE_KEYWORDS = [
  "Allies", "Tragedy", "Equipment", "Weapons", "Armor", "Magic Items",
  "Skills", "Spells", "Languages", "Traits",
] as const;

export type HistoryNoteKeyword = typeof HISTORY_NOTE_KEYWORDS[number];
export type HistoryNoteSections = Record<HistoryNoteKeyword, string[]>;

const HISTORY_NOTE_ALIASES: Record<string, HistoryNoteKeyword> = {
  allies: "Allies",
  tragedy: "Tragedy",
  tragedies: "Tragedy",
  equipment: "Equipment",
  weapons: "Weapons",
  armor: "Armor",
  "magic item": "Magic Items",
  "magic items": "Magic Items",
  skills: "Skills",
  spells: "Spells",
  languages: "Languages",
  langages: "Languages",
  traits: "Traits",
};

const cleanHistoryText = (value: unknown): string =>
  String(value ?? "").replace(/\r/g, "").trim();

const alphanumericKey = (value: string): string => value.replace(/^[^a-z0-9]+/i, "");
const sortTextAscending = (values: string[]): string[] => [...values].sort((left, right) =>
  alphanumericKey(left).localeCompare(alphanumericKey(right), "en", {
    numeric: true,
    sensitivity: "base",
  }),
);

function splitHistoryList(value: string): string[] {
  const source = cleanHistoryText(value).replace(/\]\s*\[/g, "], [");
  const output: string[] = [];
  let token = "";
  let braces = 0;
  let brackets = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") braces += 1;
    if (character === "}") braces = Math.max(0, braces - 1);
    if (character === "[") brackets += 1;
    if (character === "]") brackets = Math.max(0, brackets - 1);
    const periodDelimiter = character === "." && /\s|$/.test(source[index + 1] ?? "");
    if (braces === 0 && brackets === 0 &&
        (character === ";" || character === "\n" || periodDelimiter)) {
      const item = cleanHistoryText(token);
      if (item && !/^none(?: revealed)?$/i.test(item)) output.push(item);
      token = "";
    } else {
      token += character;
    }
  }
  const item = cleanHistoryText(token).replace(/\.$/, "");
  if (item && !/^none(?: revealed)?$/i.test(item)) output.push(item);
  return output;
}

function canonicalVirtuosity(value: string): string[] | null {
  const text = cleanHistoryText(value);
  const isVirtuosity = /^Virtuosity\b/i.test(text);
  const isCanonical = /^v-/i.test(text);
  if (!isVirtuosity && !isCanonical) return null;

  const source = isVirtuosity
    ? text.replace(/^Virtuosity(?:[-\s]+\d+)?\s*(?:>|\{)?\s*/i, "").replace(/\s*\}?$/, "")
    : text;
  return splitHistoryList(source).map((entry) => {
    const unprefixed = entry.replace(/^v-/i, "");
    const ranked = unprefixed.match(/^(.*?)(?:-(\d+)|\s+(\d+))$/);
    const name = cleanHistoryText(ranked?.[1] ?? unprefixed);
    const rank = ranked?.[2] ?? ranked?.[3];
    return `v-${name}${rank ? `-${rank}` : ""}`;
  });
}

function canonicalRankedTerm(value: string): string {
  const text = cleanHistoryText(value);
  const ranked = text.match(/^(.*?)(?:-(\d+)|\s+(\d+))$/);
  if (!ranked) return text;
  return `${cleanHistoryText(ranked[1])}-${ranked[2] ?? ranked[3]}`;
}

function canonicalSpecializations(value: string): string {
  const text = cleanHistoryText(value);
  const prefix = text.startsWith("+") ? "+" : "";
  const unprefixed = prefix ? text.slice(1).trim() : text;
  const disability = unprefixed.startsWith("[") && unprefixed.endsWith("]");
  const inner = disability ? unprefixed.slice(1, -1).trim() : unprefixed;
  const canonicalMatch = inner.match(/^(.*?)\s*\{\s*(.*?)\s*\}$/);
  if (canonicalMatch && !canonicalMatch[1].includes(">")) {
    const base = canonicalRankedTerm(canonicalMatch[1]);
    const specializations = splitHistoryList(canonicalMatch[2]).map(canonicalRankedTerm).join(", ");
    const canonical = `${base} { ${specializations} }`;
    return `${prefix}${disability ? `[${canonical}]` : canonical}`;
  }
  const delimiter = inner.indexOf(">");
  if (delimiter < 0) {
    const canonical = canonicalRankedTerm(inner);
    return `${prefix}${disability ? `[${canonical}]` : canonical}`;
  }
  const base = canonicalRankedTerm(inner.slice(0, delimiter));
  const specializations = cleanHistoryText(inner.slice(delimiter + 1))
    .replace(/^\{\s*|\s*\}$/g, "");
  const canonical = `${base} { ${splitHistoryList(specializations).map(canonicalRankedTerm).join(", ")} }`;
  return `${prefix}${disability ? `[${canonical}]` : canonical}`;
}

function canonicalZedsurge(value: string): string | null {
  const text = cleanHistoryText(value).replace(/^\+/, "").replace(/^\[|\]$/g, "");
  const ranked = text.match(/^Zedsurge(?:-(\d+)|\s+(\d+))?$/i);
  if (!ranked) return null;
  const rank = ranked[1] ?? ranked[2];
  return `v-Zedsurge${rank ? `-${rank}` : ""}`;
}

export function parseHistoryNotes(value: FieldValue): HistoryNoteSections {
  const source = cleanHistoryText(value);
  const sections = Object.fromEntries(
    HISTORY_NOTE_KEYWORDS.map((keyword) => [keyword, []]),
  ) as unknown as HistoryNoteSections;
  const headingPattern = /(?:^|\n)\s*(Allies|Traged(?:y|ies)|Equipment|Weapons|Armor|Magic Items?|Skills|Spells|Languages|Langages|Traits)\s*[;:]/gim;
  const matches = [...source.matchAll(headingPattern)];

  matches.forEach((match, index) => {
    const keyword = HISTORY_NOTE_ALIASES[match[1].toLowerCase()];
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    sections[keyword].push(...splitHistoryList(source.slice(start, end)));
  });

  const skills: string[] = [];
  const traits = [...sections.Traits];
  sections.Skills.forEach((entry) => {
    const zedsurge = canonicalZedsurge(entry);
    if (zedsurge) {
      traits.push(zedsurge);
      return;
    }
    const virtuosity = canonicalVirtuosity(entry);
    if (virtuosity) traits.push(...virtuosity);
    else skills.push(canonicalSpecializations(entry));
  });
  sections.Skills = skills;
  sections.Traits = traits.flatMap((entry) => {
    const zedsurge = canonicalZedsurge(entry);
    return zedsurge ? [zedsurge] : canonicalVirtuosity(entry) ?? [canonicalSpecializations(entry)];
  });
  sections.Languages = sections.Languages.map(canonicalSpecializations);

  HISTORY_NOTE_KEYWORDS.forEach((keyword) => {
    sections[keyword] = sortTextAscending(sections[keyword]);
  });
  return sections;
}

export function serializeHistoryNotes(sections: HistoryNoteSections): string {
  return HISTORY_NOTE_KEYWORDS.map((keyword) => {
    const values = sortTextAscending(sections[keyword].map(cleanHistoryText).filter(Boolean));
    return `${keyword};${values.length ? ` ${values.join(", ")}` : ""}`;
  }).join("\n");
}

export interface EquipmentRow {
  item: string;
  properties: string;
}

function splitEquipmentBlocks(value: FieldValue): string[] {
  return cleanHistoryText(value)
    .split(/\n\s*\n+/)
    .map(cleanHistoryText)
    .filter(Boolean);
}

export function parseEquipmentRows(
  itemValue: FieldValue,
  propertyValue: FieldValue,
): EquipmentRow[] {
  const items = splitEquipmentBlocks(itemValue);
  const properties = splitEquipmentBlocks(propertyValue);
  const rowCount = Math.max(items.length, properties.length);
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    item: items[index] ?? "",
    properties: properties[index] ?? "",
  })).filter(({ item, properties: detail }) => item || detail);
  return rows.sort((left, right) =>
    alphanumericKey(left.item).localeCompare(alphanumericKey(right.item), "en", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function serializeEquipmentRows(rows: readonly EquipmentRow[]): {
  WeaponsArmorEquipment: string;
  WeaponsArmorEquipmentProperties: string;
} {
  const normalized = rows
    .map(({ item, properties }) => ({
      item: cleanHistoryText(item),
      properties: cleanHistoryText(properties),
    }))
    .filter(({ item, properties }) => item || properties);
  return {
    WeaponsArmorEquipment: normalized.map(({ item }) => item).join("\n\n"),
    WeaponsArmorEquipmentProperties: normalized.map(({ properties }) => properties).join("\n\n"),
  };
}

const TOOLTIP_ENDURANCE =
  "Physical Endurance. Ignore the effects of Fatigue and Weariness.";
const TOOLTIP_RESILIENCE =
  "Mental Resilience. Ignore the effects of Stress.";
const TOOLTIP_RESISTANCE =
  "Radiation Resistance. Ignore the effects of Rads.";
const TOOLTIP_FATIGUE =
  "Physical Fatigue. Acquire this when doing too much too quickly.";
const TOOLTIP_WEARINESS =
  "Physical Weariness. Acquire this when doing too much for too long.";
const TOOLTIP_STRESS =
  "Mental Stress. Acquire this when mental, psychological, or emotional health is attacked.";
const TOOLTIP_RADS =
  "Radiation Damage. The Wasting Sickness. Acquire this around too much magic.";

export const SAVED_TEXT_FIELDS = [
  "Name", "CCA", "RCA", "REF", "INT", "KNO", "PRE", "POW", "STR", "FOR", "SIZ", "ZED",
  "CharacterLevel", "Stature", "Build", "Profile", "Hitpoints", "Bodypoints", "Recovery",
  "Endurance", "Resilience", "Resistance", "Damage", "Injury", "Fatigue", "Weariness",
  "Stress", "Rads", "WealthRank", "SocialRank", "ProfessionRank", "FavorDice", "Cellburn",
  "Manapool", "Details", "HistoryNotes", "Profession", "Settlement", "Religion", "Personality",
  "Features", "GMNotes", "BackName", "WeaponsArmorEquipment",
  "WeaponsArmorEquipmentProperties", "BackNotes",
] as const;

/** Original Lua update functions and the fields each function produces. */
export const CHARACTER_SHEET_OUTPUTS = {
  updateCharacterLevel: ["PML", "CharacterLevel"],
  updateSIZ: ["SIZ"],
  updateAttrDM: ["CCADM", "RCADM", "REFDM", "INTDM", "KNODM", "PREDM", "POWDM", "STRDM", "FORDM", "MOVDM", "SIZDM", "ZEDDM"],
  updateCarryAbility: ["IndexLift", "ScalarLift", "IndexShoulder", "ScalarShoulder", "IndexCarry", "ScalarCarry"],
  updateThrowingAbility: ["IndexLob", "ScalarLob", "IndexPitch", "ScalarPitch", "IndexHurl", "ScalarHurl"],
  updateMovementAbility: ["MOV", "MOVDM", "IndexWalk", "ScalarWalk", "IndexJog", "ScalarJog", "IndexRun", "ScalarRun", "ScalarMphRun", "ScalarAgility"],
  updateJumpingAbility: ["IndexUp", "ScalarUp", "IndexBroad", "ScalarBroad", "IndexDown", "ScalarDown"],
  setUCValue: ["ScalarUC"],
  updateHitpoints: ["Hitpoints"],
  updateBodypoints: ["Bodypoints"],
  updateRecovery: ["Recovery"],
  updateEndurance: ["Endurance"],
  updateResilience: ["Resilience"],
  updateResistance: ["Resistance"],
  updateFatigue: ["Fatigue"],
  updateWeariness: ["Weariness"],
  updateStress: ["Stress"],
  updateRads: ["Rads"],
  updateFavorDice: ["FavorDice"],
  updateCellburn: ["Cellburn"],
  updateManapool: ["Manapool"],
  updateBackName: ["BackName"],
  updateProfileRank: ["Profile"],
  updateHastyActions: ["HastyActions"],
  updateMeleeAttack: ["MeleeAttack"],
  updateMeleeDefend: ["MeleeDefend"],
  updateRangeAttack: ["RangeAttack"],
  updateRangeDefend: ["RangeDefend"],
  updateMaxAdvantage: ["MaxAdvantage"],
} as const;

const SCALAR_UC = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8] as const;
const SCALAR_AF: Record<number, number> = {
  [-3]: 0.01, [-2]: 0.1, [-1]: 1, 0: 10, 1: 100, 2: 1000,
  3: 10, 4: 100, 5: 1, 6: 10, 7: 100, 8: 1, 9: 10,
};
const SCALAR_ES: Record<number, string> = {
  [-3]: "", [-2]: "", [-1]: "", 0: "", 1: "", 2: "",
  3: "K", 4: "K", 5: "M", 6: "M", 7: "M", 8: "M", 9: "G",
};

function numberValue(value: FieldValue): number {
  if (value === null || value === undefined || value === "") return 0;
  const converted = typeof value === "number" ? value : Number(value);
  return Number.isFinite(converted) ? converted : 0;
}

function overrideOr(value: FieldValue, fallback: number): number {
  return value === null || value === undefined || value === ""
    ? fallback
    : numberValue(value);
}

export function getDMByValue(value: FieldValue, usePrefix = false): number | string {
  const difference = numberValue(value) - 7;
  const delta = Math.floor(Math.abs(difference) / 2 + 0.5);
  const signed = difference < 0 ? -delta : delta;
  return usePrefix ? `${signed < 0 ? "-" : "+"}${delta}` : signed;
}

export function getScalarValue(index: number): string {
  const bounded = Math.max(-30, Math.min(90, Math.floor(index)));
  const magnitude = Math.floor(bounded / 10);
  const remainder = bounded - 10 * magnitude;
  return `${Number((SCALAR_UC[remainder] * SCALAR_AF[magnitude]).toPrecision(12))}${SCALAR_ES[magnitude]}`;
}

export function getIndex(value: FieldValue): number {
  const numeric = numberValue(value);
  if (numeric === 0) return 0;
  if (numeric < 0.1) return -20;
  if (numeric < 1) return -10;
  if (numeric >= 100_000) return 40;

  const dekaGroup = numeric >= 10_000 ? 30 : numeric >= 1_000 ? 20
    : numeric >= 100 ? 10 : numeric >= 10 ? 0 : -10;
  const divisor = 10 ** ((dekaGroup + 10) / 10);
  const processValue = numeric / divisor;
  let offset = 0;
  SCALAR_UC.forEach((scalar, index) => {
    if (processValue >= scalar) offset = index;
  });
  return dekaGroup + offset;
}

export function getDegreeOfFear(stressDM: number): string {
  if (stressDM <= 0) return "";
  if (stressDM <= 1) return "NERVOUS";
  if (stressDM <= 2) return "DISORDERED";
  if (stressDM <= 3) return "PANICKED";
  if (stressDM <= 9) return "BROKEN";
  return "DISCOMBOBULATED";
}

export function getShowDM(dm: number, actualValue: number): string {
  if (actualValue === 0 || dm === 0) return "";
  return `>> suffer DM ${dm}D`;
}

export function countLevelStars(decals: readonly Decal[]): number {
  return decals.filter(({ name }) => name.toLowerCase() === "star").length;
}

export function getDeityRating(source: CharacterValues): number {
  const explicitRating = numberValue(source.Deity);
  if (explicitRating > 0) return explicitRating;
  const notes = String(source.HistoryNotes ?? "");
  const match = notes.match(/\bDeity\s*-\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function calculateCharacterSheet(
  source: CharacterValues,
  decals: readonly Decal[] = [],
): CharacterSheetResult {
  const values: CharacterValues = { ...source };
  const display: Record<string, DisplayField> = {};
  const get = (field: string): number => numberValue(values[field]);
  const set = (field: string, value: string | number, tooltip?: string): void => {
    values[field] = value;
    display[field] = tooltip ? { value, tooltip } : { value };
  };

  const hasSourcePml = source.PML !== null && source.PML !== undefined && source.PML !== "";
  const pml = hasSourcePml
    ? Math.max(0, Math.floor(numberValue(source.PML)))
    : countLevelStars(decals);
  set("PML", pml, `PML is ${pml}`);
  set("CharacterLevel", pml, `PML is ${pml}`);

  const computedSize = Math.floor(0.51 + (10 / 3) * (get("Build") - 10));
  values.SIZ = source.SIZ === null || source.SIZ === undefined || source.SIZ === ""
    ? computedSize
    : source.SIZ;
  display.SIZ = { value: computedSize };

  const attributes = ["CCA", "RCA", "REF", "INT", "KNO", "PRE", "POW", "STR", "FOR", "MOV", "SIZ", "ZED"];
  attributes.forEach((attribute) => set(`${attribute}DM`, getDMByValue(get(attribute), true)));

  const size = get("SIZ");
  const strength = get("STR");
  const reflex = get("REF");
  const fortitude = get("FOR");
  const stature = get("Stature");

  const lift = Math.floor(strength / 2 + size) - 9;
  const shoulder = Math.max(strength, size) - 9;
  const carry = Math.min(shoulder, strength) - 3;
  set("IndexLift", lift); set("ScalarLift", getScalarValue(lift));
  set("IndexShoulder", shoulder); set("ScalarShoulder", getScalarValue(shoulder));
  set("IndexCarry", carry); set("ScalarCarry", getScalarValue(carry));

  const minimumThrow = size - 12;
  const lob = Math.max(strength - 18, minimumThrow - 12);
  const pitch = lob + 6;
  const hurl = Math.max(pitch + 6, strength + Math.floor(size / 2) - 12);
  set("IndexLob", lob); set("ScalarLob", getScalarValue(lob));
  set("IndexPitch", pitch); set("ScalarPitch", getScalarValue(pitch));
  set("IndexHurl", hurl); set("ScalarHurl", getScalarValue(hurl));

  const movementAdjustment = Math.floor(
    numberValue(getDMByValue(reflex)) / 2 + numberValue(getDMByValue(strength)) / 2
      - numberValue(getDMByValue(size)) / 2,
  );
  const walk = Math.floor(stature / 20) + 5 + Math.floor(movementAdjustment / 2);
  const jog = walk + 3;
  const run = jog + 3 + movementAdjustment;
  const movement = Math.max(walk, jog, run);
  values.MOV = movement;
  set("MOV", movement, `Can Run about ${getScalarValue(run - 12)} MPH; ${getScalarValue(run)} feet per 10 seconds`);
  set("MOVDM", getDMByValue(movement, true));
  set("IndexWalk", walk); set("ScalarWalk", getScalarValue(walk));
  set("IndexJog", jog); set("ScalarJog", getScalarValue(jog));
  set("IndexRun", run); set("ScalarRun", getScalarValue(run));
  set("ScalarMphRun", getScalarValue(run - 12));
  set("ScalarAgility", Math.floor(numberValue(getScalarValue(walk)) / 10));

  const jumpUp = Math.max(movement - 21, strength - size - 6);
  const jumpBroad = Math.floor(jumpUp + stature / 10);
  const jumpDown = Math.max(jumpUp + 3, movement - 12);
  set("IndexUp", jumpUp); set("ScalarUp", getScalarValue(jumpUp));
  set("IndexBroad", jumpBroad); set("ScalarBroad", getScalarValue(jumpBroad));
  set("IndexDown", jumpDown); set("ScalarDown", getScalarValue(jumpDown));

  const dm = (field: string): number => numberValue(getDMByValue(get(field)));
  const hitpoints = Math.max(1, 10 + pml * 3 + dm("REF") + dm("POW") + dm("PRE") + dm("MOV"));
  const recovery = Math.max(1, dm("POW") + dm("FOR") + 3);
  const endurance = Math.floor(pml / 2) + Math.floor(fortitude + 3);
  const resilience = Math.floor(pml / 2) + Math.floor((2 / 3) * get("POW") + 3);
  const resistance = Math.floor(pml / 2) + Math.floor((4 / 3) * size + 3);
  set("Hitpoints", overrideOr(source.Hitpoints, hitpoints));
  set("Bodypoints", overrideOr(source.Bodypoints, Math.max(1, size)));
  set("Recovery", overrideOr(source.Recovery, Math.floor(pml / 3) + recovery));
  set("Endurance", overrideOr(source.Endurance, endurance), TOOLTIP_ENDURANCE);
  set("Resilience", overrideOr(source.Resilience, resilience), TOOLTIP_RESILIENCE);
  set("Resistance", overrideOr(source.Resistance, resistance), TOOLTIP_RESISTANCE);

  const concern = (field: string, capacity: string, tooltip: string): void => {
    const actual = get(field);
    const divisor = Math.max(1, get(capacity));
    const penalty = -Math.floor(actual / divisor);
    const fear = field === "Stress" ? ` > ${getDegreeOfFear(-penalty)}` : "";
    set(field, actual, `${tooltip}\n\n${getShowDM(penalty, actual)}${fear}`);
  };
  concern("Fatigue", "Endurance", TOOLTIP_FATIGUE);
  concern("Weariness", "Endurance", TOOLTIP_WEARINESS);
  concern("Stress", "Resilience", TOOLTIP_STRESS);
  concern("Rads", "Resistance", TOOLTIP_RADS);

  set("FavorDice", pml + getDeityRating(source));
  set("Cellburn", overrideOr(source.Cellburn, Math.max(1, 1 + dm("PRE") + dm("KNO") + dm("POW"))));
  set("Manapool", overrideOr(source.Manapool, Math.max(0, get("ZED") + dm("SIZ"))));
  set("BackName", String(source.Name ?? ""));
  set("Profile", Math.floor(stature / 2 + get("Build") / 2));
  set("HastyActions", `+${Math.max(0, Math.floor(dm("REF") / 3))}`);
  set("MeleeAttack", getDMByValue(get("CCA"), true));
  set("MeleeDefend", getDMByValue(get("CCA"), true));
  set("RangeAttack", getDMByValue(get("RCA"), true));
  set("RangeDefend", getDMByValue(get("REF"), true));
  set("MaxAdvantage", `+${Math.max(0, Math.floor((pml - 1) / 3) + 1)}`);

  return { values, display };
}

export function serializeCharacterSheet(values: CharacterValues): string {
  const textbox = Object.fromEntries(
    SAVED_TEXT_FIELDS.map((field) => [field, values[field] ?? ""]),
  );
  return JSON.stringify({ checkbox: {}, counter: {}, textbox } satisfies SavedCharacterSheet);
}

export function deserializeCharacterSheet(serialized: string): CharacterValues {
  if (serialized.trim() === "") return {};
  const saved = JSON.parse(serialized) as Partial<SavedCharacterSheet>;
  return { ...(saved.textbox ?? {}) };
}
