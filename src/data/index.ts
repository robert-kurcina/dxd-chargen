import ageBrackets from './ageBrackets.json';
import attributeModifiers from './attributeModifiers.json';
import characteristicModifiers from './characteristicModifiers.json';
import ageGroups from './ageGroups.json';
import attributeArrays from './attributeArrays.json';
import attributeDefinitions from './attributeDefinitions.json';
import attributeCreationRules from './attributeCreationRules.json';
import beliefsRaw from './beliefs.json';
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
import disabilitiesRaw from './disabilities.json';
import economicStatuses from './economicStatuses.json';
import empiresRaw from './empires.json';
import environs from './environs.json';
import favoredTradesByLineage from './favoredTradesByLineage.json';
import culturalHeritage from './culturalHeritage.json';
import environHeritage from './environHeritage.json';
import societalHeritage from './societalHeritage.json';
import heritagePackages from './heritagePackages.json';
import tradePackages from './tradePackages.json';
import languages from './languages.json';
import languageDefaults from './languageDefaults.json';
import nameGenerators from './nameGenerators.json';
import namingPracticeTitles from './namingPracticeTitles.json';
import notableFeatures from './notableFeatures.json';
import physicalBlemishes from './physicalBlemishes.json';
import physicalScale from './physicalScale.json';
import heritageCharacteristicAdjustments from './heritageCharacteristicAdjustments.json';
import pmlTitles from './pmlTitles.json';
import pmlAgeMinimums from './pmlAgeMinimums.json';
import pmlRules from './pmlRules.json';
import pointBuyCosts from './pointBuyCosts.json';
import professionsRaw from './professions.json';
import randomPersonItemDeity from './randomPersonItemDeity.json';
import salaryByTradeRank from './salaryByTradeRank.json';
import salaryAdjustmentsByTrade from './salaryAdjustmentsByTrade.json';
import settlements from './settlements.json';
import settlementProfiles from './settlementProfiles.json';
import localeProfiles from './localeProfiles.json';
import socialGroups from './socialGroups.json';
import socialRanksRaw from './socialRanks.json';
import speciesRaw from './species.json';
import tragedySeedsRaw from './tragedySeeds.json';
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
const beliefs = withCatalogIds(beliefsRaw, 'belief', (item) => item.keyword);
const disabilities = withCatalogIds(disabilitiesRaw, 'disability', (item) => `${item.d66}-${item.disability}`);
const empires = withCatalogIds(empiresRaw, 'region', (item) => item.name);
const socialRanks = withCatalogIds(socialRanksRaw, 'social-rank', (item) => item.society);
const tragedySeeds = withCatalogIds(tragedySeedsRaw, 'tragedy', (item) => `${item.d66}-${item.seed}`);

// Keep the canonical Species -> Group -> Lineage hierarchy intact.  Selection policy is
// applied by the Forge UI/rules rather than deleting source families from the runtime data.
// Humaniki is currently selectable; Cherigili Group plus Kriket and Stonefolk remain visible but disabled.
const species = speciesRaw.map((family) => ({
  ...family,
  displayName: family.name === 'Kriketai' ? 'Kriket' : family.name,
  catalogId: makeCatalogId('species-family', family.name),
  selectable: family.name === 'Humaniki',
  groups: family.groups.map((group) => ({
    ...group,
    catalogId: makeCatalogId('species', group.name),
    selectable: family.name === 'Humaniki' && group.name !== 'Cherigili',
    lineageCatalogIds: group.lineages.map((lineage) => makeCatalogId('lineage', lineage)),
    hasAgeBrackets: Object.prototype.hasOwnProperty.call(ageBrackets, group.name),
  })),
}));

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
  tradePackages,
  languages,
  languageDefaults,
  nameGenerators,
  namingPracticeTitles,
  notableFeatures,
  physicalBlemishes,
  physicalScale,
  heritageCharacteristicAdjustments,
  pmlTitles,
  pmlAgeMinimums,
  pmlRules,
  pointBuyCosts,
  professions,
  randomPersonItemDeity,
  salaryByTradeRank,
  salaryAdjustmentsByTrade,
  settlements,
  settlementProfiles,
  localeProfiles,
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
