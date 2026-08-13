import fs from "node:fs";
import path from "node:path";

const [sourceDir, destinationDir, enginePath] = process.argv.slice(2);
if (!sourceDir || !destinationDir || !enginePath) {
  throw new Error("Usage: convert-character-data.mjs SOURCE_DIR DESTINATION_DIR CHARACTER_SHEET_JS");
}

const engineSource = fs.readFileSync(enginePath, "utf8");
const engineUrl = `data:text/javascript;base64,${Buffer.from(engineSource).toString("base64")}`;
const { calculateCharacterSheet, parseHistoryNotes } = await import(engineUrl);

const ERROR = "ERROR";
const clean = (value) => String(value ?? "").replace(/\r/g, "").trim();
const numeric = (value, fallback = ERROR) => {
  const text = clean(value).replace(/,/g, "");
  if (!text) return fallback;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};
const compareText = (left, right) => left.replace(/^[^a-z0-9]+/i, "").localeCompare(
  right.replace(/^[^a-z0-9]+/i, ""),
  "en",
  {
  numeric: true,
  sensitivity: "base",
  },
);
const sortText = (values) => [...values].sort(compareText);
const emptyIfNone = (values) => sortText(
  values.filter((value) => value && !/^none(?: revealed)?$/i.test(value)),
);

function lines(value) {
  return clean(value).split(/\n+/).map(clean).filter(Boolean);
}

function splitTopLevel(value, includePeriods = false) {
  const output = [];
  let token = "";
  let braces = 0;
  let brackets = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "{") braces += 1;
    if (character === "}") braces = Math.max(0, braces - 1);
    if (character === "[") brackets += 1;
    if (character === "]") brackets = Math.max(0, brackets - 1);
    const periodDelimiter = includePeriods && character === "." && /\s/.test(value[index + 1] ?? "");
    if (braces === 0 && brackets === 0 && (character === "," || character === "\n" || periodDelimiter)) {
      if (clean(token)) output.push(clean(token));
      token = "";
    } else {
      token += character;
    }
  }
  if (clean(token)) output.push(clean(token));
  return output;
}

function rankedTerm(value) {
  const text = clean(value);
  const match = text.match(/^(.*?)(?:[-\s]+(-?\d+))?$/);
  return {
    name: clean(match?.[1]) || ERROR,
    rank: match?.[2] === undefined ? 0 : Number(match[2]),
  };
}

function parseSkill(value) {
  let text = clean(value).replace(/^§-?/, "");
  const disability = text.startsWith("[") && text.endsWith("]");
  if (disability) text = text.slice(1, -1).trim();
  const canonical = text.match(/^(.*?)\s*\{\s*(.*?)\s*\}$/);
  const parts = canonical ? [] : text.split(/\s*>\s*/);
  const base = rankedTerm(canonical?.[1] ?? parts.shift() ?? "");
  const specializationText = canonical?.[2]
    ?? parts.join(" > ").replace(/^\{\s*|\s*\}$/g, "");
  const specializations = specializationText
    ? splitTopLevel(specializationText).map(rankedTerm)
    : [];
  return { ...base, specializations, disability };
}

function parseSkills(value) {
  return emptyIfNone(splitTopLevel(clean(value), true)).map(parseSkill);
}

function parseTrait(value) {
  const skill = parseSkill(value);
  return {
    name: skill.name,
    rank: skill.rank,
    specializations: skill.specializations,
    disability: skill.disability,
  };
}

function parseLanguages(value) {
  let text = clean(value);
  const tokens = [];
  let current = "";
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "[") depth += 1;
    if (character === "]") depth -= 1;
    current += character;
    const next = text[index + 1] ?? "";
    if (depth === 0 && (character === "," || character === "\n" || (character === "]" && next === "["))) {
      current = current.replace(/,$/, "");
      if (clean(current)) tokens.push(clean(current));
      current = "";
    }
  }
  if (clean(current)) tokens.push(clean(current));

  return emptyIfNone(tokens).map((raw) => {
    let token = raw;
    const isDefault = token.startsWith("+");
    token = token.replace(/^\+/, "").trim();
    const incompatibleBiology = token.startsWith("[[") && token.endsWith("]]" );
    const accented = token.startsWith("[") && token.endsWith("]");
    token = token.replace(/^\[\[?/, "").replace(/\]\]?$/, "").replace(/,$/, "").trim();
    const ranked = rankedTerm(token);
    return { ...ranked, isDefault, accented, incompatibleBiology };
  });
}

const HISTORY_HEADINGS = {
  allies: "allies", tragedy: "tragedies", tragedies: "tragedies",
  equipment: "equipment", weapons: "weapons", armor: "armor",
  "magic item": "magicItems", "magic items": "magicItems",
  skills: "skills", traits: "traits", spells: "spells",
  languages: "languages", langages: "languages",
  organization: "organizations", organizations: "organizations", notes: "notes",
};

function historySections(value) {
  const text = clean(value);
  const pattern = /(?:^|\n)\s*(Allies|Traged(?:y|ies)|Equipment|Weapons|Armor|Magic Items?|Skills|Traits|Spells|Languages|Langages|Organizations?|NOTES)\s*[;:]/gim;
  const matches = [...text.matchAll(pattern)];
  const result = {};
  matches.forEach((match, index) => {
    const key = HISTORY_HEADINGS[match[1].toLowerCase()];
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const content = clean(text.slice(start, end));
    result[key] = result[key] ? `${result[key]}\n${content}` : content;
  });
  return result;
}

function parseDetails(value) {
  const detailLines = lines(value);
  const formative = (detailLines[0] ?? "").split(/\s*>\s*/).map(clean);
  const ancestry = (detailLines[1] ?? "").split(/\s*>\s*/).map(clean);
  const biologyLine = detailLines.find((line) =>
    /\bage\b/i.test(line) || (/\s*>\s*/.test(line) && /\d+(?:\.\d+)?\s*$/.test(line)),
  ) ?? "";
  const biologyParts = biologyLine.split(/\s*>\s*/).map(clean);
  const sex = biologyParts.length > 1 ? biologyParts[0] : ERROR;
  const ageText = biologyParts.at(-1) ?? "";
  const ageMatch = ageText.match(/^(.*?)\s+(?:age\s+)?(\d+(?:\.\d+)?)$/i);
  const dimensions = detailLines.find((line) => /(?:feet|foot|['’]).*(?:pounds?|#)/i.test(line)) ?? detailLines[3] ?? "";
  const height = dimensions.match(/(\d+\s*['’]\s*\d*\s*"?)/)?.[1]?.replace(/\s/g, "") ?? ERROR;
  const weight = dimensions.match(/(?:and\s+)?(\d+(?:\.\d+)?)\s*(?:-?pounds?|#)/i)?.[1];
  return {
    formative: { environ: formative[0] || ERROR, society: formative[1] || ERROR, culture: formative[2] || ERROR },
    ancestry: { group: ancestry[0] || ERROR, lineage: ancestry[1] || ERROR },
    biology: {
      sex,
      ageGroup: clean(ageMatch?.[1]) || ERROR,
      ageYearsMonth: ageMatch?.[2] ? Number(ageMatch[2]) : ERROR,
      heightFeetInches: height,
      weightPounds: weight ? Number(weight) : ERROR,
    },
  };
}

function parseProfession(value, rankValue) {
  const professionLines = lines(value);
  const roles = (professionLines[0] ?? "").split(/\s*(?:>|-)\s*/).map(clean);
  const title = (professionLines[1] ?? "").split(/\s*>\s*/).at(-1);
  return {
    trade: roles[0] || ERROR,
    profession: roles[1] || ERROR,
    rank: numeric(rankValue),
    title: clean(title) || ERROR,
  };
}

function parseReligion(value) {
  const religionLines = lines(value);
  const identity = (religionLines[0] ?? "").split(/\s*>\s*/).map(clean);
  const classifications = new Set(["atheism", "gnostic", "deist", "agnostic"]);
  const first = identity[0] || ERROR;
  const practice = classifications.has(first.toLowerCase()) ? first : "Theist";
  const deityName = identity[1] || (practice === "Theist" ? first : "");
  const domainText = religionLines.slice(1).join(", ");
  const domains = splitTopLevel(domainText).map((entry) => {
    const opposed = entry.startsWith("[") && entry.endsWith("]");
    const ranked = rankedTerm(entry.replace(/^\[|\]$/g, ""));
    return { ...ranked, opposed };
  });
  return { practice, deity: { name: deityName, domains } };
}

function personalityFeatures(personality, sections) {
  const entries = splitTopLevel(clean(personality), true);
  const disabilities = entries.filter((entry) => entry.startsWith("[")).map(parseTrait);
  const personalities = sortText(entries.filter((entry) => !entry.startsWith("[")).map(clean));
  return {
    personality: personalities,
    blemishes: [],
    descriptors: [],
    tragedies: emptyIfNone(splitTopLevel(sections.tragedies ?? "", true)),
    disabilities,
    other: [],
  };
}

function resource(value, unit) {
  const entry = lines(value).find((line) => new RegExp(unit, "i").test(line));
  if (!entry) return 0;
  if (/\bzero\b/i.test(entry)) return 0;
  return numeric(entry, ERROR);
}

function convert(source) {
  const detail = parseDetails(source.Details);
  const sections = parseHistoryNotes(source.HistoryNotes);
  const names = lines(source.Name);
  const settlement = lines(source.Settlement);
  const stature = numeric(source.Stature);
  const build = numeric(source.Build);
  const scalar = (key) => numeric(source[key]);
  const pmlSource = [source.PML, source.CharacterLevel, source.FavorDice]
    .map((value) => numeric(value, null))
    .find((value) => value !== null);
  const level = Math.max(0, pmlSource ?? 0);
  const decals = Array.from({ length: level }, () => ({ name: "star" }));
  const calculated = calculateCharacterSheet(source, decals).values;
  const output = (key) => numeric(calculated[key]);

  return {
    name: { exonym: names[0] || ERROR, endonym: clean(names[1]).replace(/^[{\[]\s*|\s*[}\]]$/g, "") || ERROR },
    details: {
      background: {
        formative: detail.formative,
        ethnicity: { region: settlement[0] || ERROR, settlement: settlement[1] || ERROR },
        religion: parseReligion(source.Religion),
        personalityFeatures: personalityFeatures(source.Personality, {
          tragedies: sections.Tragedy.join(", "),
        }),
        profession: parseProfession(source.Profession, source.ProfessionRank),
      },
      genebase: { species: "Humaniki", group: detail.ancestry.group, lineage: detail.ancestry.lineage },
      biology: { ...detail.biology, stature, build, profile: output("Profile"), pml: output("PML"), affinity: "ZED" },
    },
    attributes: {
      cca: scalar("CCA"), rca: scalar("RCA"), ref: scalar("REF"), int: scalar("INT"),
      kno: scalar("KNO"), pre: scalar("PRE"), pow: scalar("POW"), str: scalar("STR"),
      for: scalar("FOR"), mov: output("MOV"), siz: scalar("SIZ"), zed: scalar("ZED"),
    },
    historyNotes: {
      allies: sections.Allies,
      equipment: sections.Equipment,
      weapons: sections.Weapons,
      armor: sections.Armor,
      magicItems: sections["Magic Items"],
      skills: sections.Skills.map(parseSkill),
      traits: sections.Traits.map(parseTrait),
      spells: sections.Spells,
      languages: parseLanguages(sections.Languages.join(", ")),
      organizations: [],
      sourceNotes: [],
      notes: clean(source.BackNotes),
    },
    calculatedScores: {
      performance: {
        hitpoints: output("Hitpoints"), bodypoints: output("Bodypoints"),
        recoveryRate: output("Recovery"), endurance: output("Endurance"),
        resilience: output("Resilience"), resistance: output("Resistance"),
      },
      misc: {
        wealthRank: scalar("WealthRank"), socialRank: scalar("SocialRank"),
        professionRank: scalar("ProfessionRank"), favorDice: output("FavorDice"),
        cellburnLimit: output("Cellburn"), manapool: output("Manapool"),
      },
      combat: {
        actions: output("HastyActions"), meleeAttack: output("MeleeAttack"),
        meleeDefend: output("MeleeDefend"), rangeAttack: output("RangeAttack"),
        rangeDefend: output("RangeDefend"), maxAdvantage: output("MaxAdvantage"),
      },
      resources: { gold: resource(source.GMNotes, "gp"), xp: resource(source.GMNotes, "xp") },
    },
    concerns: { superficial: 0, injury: 0, fatigue: 0, weariness: 0, stress: 0, rads: 0 },
    items: { itemWeapons: [], itemArmors: [], itemEquipments: [] },
    calculate: {
      carrying: { lift: output("IndexLift"), shoulder: output("IndexShoulder"), carry: output("IndexCarry") },
      movement: { walk: output("IndexWalk"), jog: output("IndexJog"), run: output("IndexRun") },
      throwing: { lob: output("IndexLob"), pitch: output("IndexPitch"), hurl: output("IndexHurl") },
      jumping: { upward: output("IndexUp"), broadjump: output("IndexBroad"), downward: output("IndexDown") },
    },
  };
}

fs.mkdirSync(destinationDir, { recursive: true });
const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".json")).sort();
for (const file of files) {
  const source = JSON.parse(fs.readFileSync(path.join(sourceDir, file), "utf8"));
  const destination = path.join(destinationDir, file);
  const temporary = `${destination}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(convert(source), null, 2)}\n`);
  fs.renameSync(temporary, destination);
  process.stdout.write(`Converted ${file}\n`);
}
process.stdout.write(`Converted ${files.length} characters into ${destinationDir}\n`);
