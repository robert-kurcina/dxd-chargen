import ageBrackets from './ageBrackets.json';
import attributeModifiers from './attributeModifiers.json';
import characteristicModifiers from './characteristicModifiers.json';
import ageGroups from './ageGroups.json';
import attributeArrays from './attributeArrays.json';
import attributeDefinitions from './attributeDefinitions.json';
import attributeCreationRules from './attributeCreationRules.json';
import beliefs from './beliefs.json';
import calculatedAbilities from './calculatedAbilities.json';
import itemWeaponsRaw from './itemWeapons.json';
import itemArmorsRaw from './itemArmors.json';
import itemEquipmentsRaw from './itemEquipments.json';
import spellsRaw from './spells.json';
import magicItemsRaw from './magicItems.json';
import characteristicCosts from './characteristicCosts.json';
import citystatesRaw from './citystates.json';
import deitiesRaw from './deities.json';
import descriptors from './descriptors.json';
import disabilities from './disabilities.json';
import economicStatuses from './economicStatuses.json';
import empires from './empires.json';
import environs from './environs.json';
import favoredTradesByLineage from './favoredTradesByLineage.json';
import culturalHeritage from './culturalHeritage.json';
import environHeritage from './environHeritage.json';
import societalHeritage from './societalHeritage.json';
import heritagePackages from './heritagePackages.json';
import languages from './languages.json';
import namingPracticeTitles from './namingPracticeTitles.json';
import notableFeatures from './notableFeatures.json';
import physicalBlemishes from './physicalBlemishes.json';
import pmlTitles from './pmlTitles.json';
import pmlAgeMinimums from './pmlAgeMinimums.json';
import pmlRules from './pmlRules.json';
import pointBuyCosts from './pointBuyCosts.json';
import professionsRaw from './professions.json';
import randomPersonItemDeity from './randomPersonItemDeity.json';
import salaryByTradeRank from './salaryByTradeRank.json';
import salaryAdjustmentsByTrade from './salaryAdjustmentsByTrade.json';
import settlements from './settlements.json';
import socialGroups from './socialGroups.json';
import socialRanks from './socialRanks.json';
import speciesRaw from './species.json';
import tragedySeeds from './tragedySeeds.json';
import traitsRaw from './traits.json';
import universalTable from './universal-table.json';
import wealthTitles from './wealthTitles.json';
import steps from './steps.json';
import adjustmentsAttributesAlef from './adjustments-attributes-alef.json';
import adjustmentsCharacteristicsAlef from './adjustments-characteristics-alef.json';
import adjustmentsAttributesBabbita from './adjustments-attributes-babbita.json';
import adjustmentsCharacteristicsBabbita from './adjustments-characteristics-babbita.json';
import adjustmentsAttributesCherigili from './adjustments-attributes-cherigili.json';
import adjustmentsCharacteristicsCherigili from './adjustments-characteristics-cherigili.json';
import adjustmentsAttributesDrauf from './adjustments-attributes-drauf.json';
import adjustmentsCharacteristicsDrauf from './adjustments-characteristics-drauf.json';
import adjustmentsAttributesGnoan from './adjustments-attributes-gnoan.json';
import adjustmentsCharacteristicsGnoan from './adjustments-characteristics-gnoan.json';
import adjustmentsAttributesHuman from './adjustments-attributes-human.json';
import adjustmentsCharacteristicsHuman from './adjustments-characteristics-human.json';
import adjustmentsAttributesKlenari from './adjustments-attributes-klenari.json';
import adjustmentsCharacteristicsKlenari from './adjustments-characteristics-klenari.json';
import adjustmentsAttributesKriket from './adjustments-attributes-kriket.json';
import adjustmentsCharacteristicsKriket from './adjustments-characteristics-kriket.json';
import adjustmentsAttributesStonefolk from './adjustments-attributes-stonefolk.json';
import adjustmentsCharacteristicsStonefolk from './adjustments-characteristics-stonefolk.json';
import militaryHierarchy from './militaryHierarchy.json';
import { isCompleteMagicItem, makeCatalogId, withCatalogIds } from './catalog-policy';

// Stable runtime IDs for catalogues stored by CharacterDraft.
const traits = withCatalogIds(traitsRaw, 'trait', (item) => item.trait);
const itemWeapons = withCatalogIds(itemWeaponsRaw, 'weapon', (item) => item.name);
const itemArmors = withCatalogIds(itemArmorsRaw, 'armor', (item) => item.name);
const itemEquipments = withCatalogIds(itemEquipmentsRaw, 'equipment', (item) => item.name);
const spells = withCatalogIds(spellsRaw, 'spell', (item) => item.name);
const magicItems = withCatalogIds(
  magicItemsRaw.filter(isCompleteMagicItem),
  'magic-item',
  (item) => item.name,
);
const citystates = withCatalogIds(citystatesRaw, 'citystate', (item) => item.name);
const deities = withCatalogIds(deitiesRaw, 'deity', (item) => item.deity);
const professions = withCatalogIds(professionsRaw, 'trade', (item) => item.trade);

// A playable Species needs an age-bracket table because Age is a required chargen step.
// Kriket remains in the source files and XLSX ancestry tables, but is intentionally not
// selectable until canonical Kriket age brackets exist.
const species = speciesRaw
  .map((family) => ({
    ...family,
    catalogId: makeCatalogId('species-family', family.name),
    groups: family.groups
      .filter((group) => Object.prototype.hasOwnProperty.call(ageBrackets, group.name))
      .map((group) => ({
        ...group,
        catalogId: makeCatalogId('species', group.name),
        lineageCatalogIds: group.lineages.map((lineage) => makeCatalogId('lineage', lineage)),
      })),
  }))
  .filter((family) => family.groups.length > 0);

const sarnaLenData = {
  ageBrackets,
  attributeModifiers,
  characteristicModifiers,
  ageGroups,
  attributeArrays,
  attributeDefinitions,
  attributeCreationRules,
  beliefs,
  calculatedAbilities,
  itemWeapons,
  itemArmors,
  itemEquipments,
  spells,
  magicItems,
  characteristicCosts,
  citystates,
  deities,
  descriptors,
  disabilities,
  economicStatuses,
  empires,
  environs,
  favoredTradesByLineage,
  culturalHeritage,
  environHeritage,
  societalHeritage,
  heritagePackages,
  languages,
  namingPracticeTitles,
  notableFeatures,
  physicalBlemishes,
  pmlTitles,
  pmlAgeMinimums,
  pmlRules,
  pointBuyCosts,
  professions,
  randomPersonItemDeity,
  salaryByTradeRank,
  salaryAdjustmentsByTrade,
  settlements,
  socialGroups,
  socialRanks,
  species,
  tragedySeeds,
  traits,
  universalTable,
  wealthTitles,
  steps,
  'adjustments-attributes-alef': adjustmentsAttributesAlef,
  'adjustments-characteristics-alef': adjustmentsCharacteristicsAlef,
  'adjustments-attributes-babbita': adjustmentsAttributesBabbita,
  'adjustments-characteristics-babbita': adjustmentsCharacteristicsBabbita,
  'adjustments-attributes-cherigili': adjustmentsAttributesCherigili,
  'adjustments-characteristics-cherigili': adjustmentsCharacteristicsCherigili,
  'adjustments-attributes-drauf': adjustmentsAttributesDrauf,
  'adjustments-characteristics-drauf': adjustmentsCharacteristicsDrauf,
  'adjustments-attributes-gnoan': adjustmentsAttributesGnoan,
  'adjustments-characteristics-gnoan': adjustmentsCharacteristicsGnoan,
  'adjustments-attributes-human': adjustmentsAttributesHuman,
  'adjustments-characteristics-human': adjustmentsCharacteristicsHuman,
  'adjustments-attributes-klenari': adjustmentsAttributesKlenari,
  'adjustments-characteristics-klenari': adjustmentsCharacteristicsKlenari,
  'adjustments-attributes-kriket': adjustmentsAttributesKriket,
  'adjustments-characteristics-kriket': adjustmentsCharacteristicsKriket,
  'adjustments-attributes-stonefolk': adjustmentsAttributesStonefolk,
  'adjustments-characteristics-stonefolk': adjustmentsCharacteristicsStonefolk,
  militaryHierarchy,
};

export type StaticData = typeof sarnaLenData;

export default sarnaLenData;
