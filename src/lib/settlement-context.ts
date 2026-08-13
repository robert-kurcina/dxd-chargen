import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import type { CharacterDraft } from '@/lib/character-draft';

export type SettlementOption = {
  id: string;
  name: string;
  displayName: string;
  workingGloss: string | null;
  population: number | null;
  settlementType: string | null;
  currentDeity: string | null;
  environs: string[];
  cultureRecommendations: string[];
  societyRecommendations: string[];
  defaultLanguageId: string | null;
  heritageLanguageIds: string[];
  languageLayers: string[];
  nameStatus: string;
  originWeight: number;
  detailed: boolean;
};

export function settlementCatalogId(regionName: string, settlementName: string) {
  return makeCatalogId('settlement', `${regionName}-${settlementName}`);
}

export function regionByDraft(draft: CharacterDraft, data: StaticData) {
  return data.empires.find((entry) => entry.catalogId === draft.background.regionId) ?? null;
}

export function geographicRegionName(draft: CharacterDraft, data: StaticData) {
  return regionByDraft(draft, data)?.region ?? draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Custom region')?.name ?? draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Imported region')?.name ?? null;
}

export function localeForRegion(regionName: string, data: StaticData) {
  return data.localeProfiles.find((entry) => entry.regionName === regionName) ?? null;
}

export function settlementOptionsForRegion(regionName: string, data: StaticData): SettlementOption[] {
  const detailed = data.settlementProfiles.filter((entry) => entry.regionName === regionName);
  if (detailed.length) {
    return detailed.map((entry) => ({
      id: settlementCatalogId(regionName, entry.name),
      name: entry.name,
      displayName: entry.displayName,
      workingGloss: entry.workingGloss,
      population: entry.population,
      settlementType: entry.settlementType,
      currentDeity: entry.currentDeity,
      environs: [...entry.environs],
      cultureRecommendations: [...entry.cultureRecommendations],
      societyRecommendations: [...entry.societyRecommendations],
      defaultLanguageId: entry.defaultLanguageId,
      heritageLanguageIds: [...entry.heritageLanguageIds],
      languageLayers: [...entry.languageLayers],
      nameStatus: entry.nameStatus,
      originWeight: Math.max(1, Number(entry.originWeight) || 1),
      detailed: true,
    }));
  }

  const names = Array.from(new Set(data.settlements[regionName as keyof typeof data.settlements] ?? []));
  return names.map((name) => {
    const citystate = data.citystates.find((entry) => entry.name === name);
    const languageDefault = data.languageDefaults.find((entry) => entry.settlement === name);
    return {
      id: settlementCatalogId(regionName, name),
      name,
      displayName: name,
      workingGloss: null,
      population: null,
      settlementType: citystate ? 'Citystate' : 'Settlement',
      currentDeity: null,
      environs: [...(citystate?.environs ?? [])],
      cultureRecommendations: [],
      societyRecommendations: [],
      defaultLanguageId: languageDefault?.languageId ?? null,
      heritageLanguageIds: [],
      languageLayers: [],
      nameStatus: 'LEGACY_CATALOGUE',
      originWeight: Math.max(1, (data.settlements[regionName as keyof typeof data.settlements] ?? []).filter((entry) => entry === name).length),
      detailed: false,
    };
  });
}

export function selectedSettlementOption(draft: CharacterDraft, data: StaticData): SettlementOption | null {
  const region = regionByDraft(draft, data);
  if (!region || !draft.background.settlementId) return null;
  return settlementOptionsForRegion(region.name, data).find((entry) => entry.id === draft.background.settlementId) ?? null;
}

export function selectedSettlementName(draft: CharacterDraft, data: StaticData) {
  return selectedSettlementOption(draft, data)?.name ?? null;
}

export function selectedSettlementDisplayName(draft: CharacterDraft, data: StaticData) {
  return selectedSettlementOption(draft, data)?.displayName ?? selectedSettlementName(draft, data) ?? draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Custom settlement')?.name ?? draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Imported settlement')?.name ?? null;
}

export function allowedEnvironNames(draft: CharacterDraft, data: StaticData) {
  return selectedSettlementOption(draft, data)?.environs ?? [];
}

export function locationContextLabel(draft: CharacterDraft, data: StaticData) {
  const region = regionByDraft(draft, data);
  const settlement = selectedSettlementOption(draft, data);
  if (!region) return null;
  const base = `${region.region} / ${region.name}`;
  if (!settlement) return base;
  return `${base} / ${settlement.displayName}`;
}

export function weightedSettlementPick(regionName: string, data: StaticData, random: () => number = Math.random) {
  const options = settlementOptionsForRegion(regionName, data);
  if (!options.length) return null;
  const total = options.reduce((sum, entry) => sum + Math.max(1, entry.originWeight), 0);
  let roll = random() * total;
  for (const entry of options) {
    roll -= Math.max(1, entry.originWeight);
    if (roll < 0) return entry;
  }
  return options[options.length - 1] ?? null;
}
