"use client";

import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  Check,
  Dices,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
} from "lucide-react";

import type { StaticData } from "@/data";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { MobileNavigationOverlay } from "@/components/mobile-navigation-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyCharacterDraft,
  type CharacterDraft,
} from "@/lib/character-draft";
import {
  geographicRegionName,
  regionByDraft,
  selectedSettlementDisplayName,
} from "@/lib/settlement-context";
import PersistentAccordionSection from "@/components/persistent-accordion-section";
import {
  assessBackgroundStep,
  heritageWealthAdjustment,
  isBackgroundStep,
  syncHeritageGrantedSelections,
} from "@/lib/rules/background";
import {
  assessIntrinsicStep,
  getFinalAttributeValue,
  getLineageName,
  getSpeciesChoice,
  getTradePackage,
  getTradeSpecialization,
  isIntrinsicStep,
  nonPlayerAdjustmentsForAttribute,
  syncIntrinsics,
  getStrifePairing,
  strifeParents,
} from "@/lib/rules/intrinsics";
import BackgroundStep from "./forge/background-step";
import IntrinsicsStep from "./forge/intrinsics-step";
import ProficienciesStep from "./forge/proficiencies-step";
import PropertiesStep from "./forge/properties-step";
import UtilitiesStep from "./forge/utilities-step";
import PortraitStep from "./forge/portrait-step";
import {
  assessProficiencyStep,
  isProficiencyStep,
  compressedCapabilities,
  formatLanguageRecord,
  skillpointBudget,
} from "@/lib/rules/proficiencies";
import {
  assessPropertyStep,
  calculateProperties,
  isPropertyStep,
  syncProperties,
} from "@/lib/rules/properties";
import {
  assessUtilityStep,
  displayInventoryName,
  displayInventoryQuantity,
  displaySpellName,
  isUtilityStep,
  magicItemInventoryForm,
  personalWealthGp,
  startingGearTotals,
} from "@/lib/rules/utilities";
import { canGenerateStep, generateStep } from "@/lib/rules/generate-step";
import { cn, formatNumberWithCommas } from "@/lib/utils";

type CreationPhase = StaticData["steps"][number];
type CreationStep = CreationPhase["substeps"][number] & {
  phaseTitle: string;
  phaseValue: string;
};

function purifyNotes(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .slice(0, 1000);
}

function strifeSummary(draft: CharacterDraft, data: StaticData) {
  const pairing = getStrifePairing(draft);
  const parents = strifeParents(draft);
  if (
    !draft.intrinsics.childOfStrife ||
    !parents ||
    (!pairing && !draft.intrinsics.strifeMixedLineage)
  )
    return null;
  const lineage = (group: string, id: string | null) =>
    data.species
      .flatMap((family) => family.groups)
      .find((item) => item.name === group)
      ?.lineages.find(
        (name) =>
          `lineage-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` === id,
      ) ?? "unassigned";
  const identity = draft.intrinsics.strifeMixedLineage
    ? `Mixed Lineage ${parents.fatherGroup}`
    : `${pairing?.exonym} (${pairing?.meaning})`;
  return `Child of Strife: ${identity}. Father is ${lineage(parents.fatherGroup, draft.intrinsics.strifeFatherLineageId)} ${parents.fatherGroup}. Mother is ${lineage(parents.motherGroup, draft.intrinsics.strifeMotherLineageId)} ${parents.motherGroup}.`;
}

function bodyFrameSummary(draft: CharacterDraft) {
  const statureLabels: Record<number, string> = {
    [-2]: "Shorter",
    [-1]: "Short",
    0: "Average",
    1: "Tall",
    2: "Taller",
  };
  const buildLabels: Record<number, string> = {
    [-2]: "Gracile",
    [-1]: "Slim",
    0: "Average",
    1: "Stout",
    2: "Robust",
  };
  const stature = draft.properties.statureAdjustment ?? 0;
  const build = draft.properties.buildAdjustment ?? 0;
  const weight = draft.properties.weightAdjustment ?? 0;
  return `Body Frame: ${statureLabels[stature]} Stature (${stature >= 0 ? "+" : ""}${stature}); ${buildLabels[build]} Build (${build >= 0 ? "+" : ""}${build}); ${weight < 0 ? `Underweight ${Math.abs(weight)}` : weight > 0 ? `Overweight ${weight}` : "Average Weight"}`;
}

function NotesEditor({
  draft,
  data,
  setDraft,
}: {
  draft: CharacterDraft;
  data: StaticData;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
}) {
  const generated = [
    `Personality: ${draft.background.personality.map((item) => item.name).join(", ") || "—"}`,
    `Blemishes: ${
      draft.background.demographicSelections
        .filter((item) => /blemish/i.test(item.sourceDetail ?? ""))
        .map((item) => item.name)
        .join(", ") || "—"
    }`,
    `Notable features: ${
      draft.background.demographicSelections
        .filter((item) => /notable/i.test(item.sourceDetail ?? ""))
        .map((item) => item.name)
        .join(", ") || "—"
    }`,
    `Tragedy seed: ${draft.background.tragedySeedText ?? "—"}`,
    bodyFrameSummary(draft),
    strifeSummary(draft, data),
  ].filter(Boolean) as string[];
  const update = (field: "notes" | "backstory", value: string) =>
    setDraft((current) => ({
      ...current,
      utilities: { ...current.utilities, [field]: purifyNotes(value) },
    }));
  const names = (items: Array<{ name: string }>, separator = ", ") =>
    [...items]
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((item) => item.name)
      .join(separator) || "—";
  return (
    <div className="grid gap-4">
      <section className="rounded-lg border p-4">
        {generated.map((line) => (
          <div key={line} className="text-sm">
            {line}
          </div>
        ))}
      </section>
      <section className="rounded-lg border p-4">
        <div className="font-medium">Possessions and Spells</div>
        <dl className="mt-3 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Weapons</dt>
          <dd>{names(draft.utilities.weapons, "; ")}</dd>
          <dt className="text-muted-foreground">Armor</dt>
          <dd>{names(draft.utilities.armor, "; ")}</dd>
          <dt className="text-muted-foreground">Equipment</dt>
          <dd>{names(draft.utilities.equipment, "; ")}</dd>
          <dt className="text-muted-foreground">Spells</dt>
          <dd>{names(draft.utilities.spells)}</dd>
        </dl>
      </section>
      <section className="space-y-2 rounded-lg border p-4">
        <div className="flex justify-between">
          <label htmlFor="misc-notes" className="font-medium">Notes</label>
          <span id="misc-notes-count" className="text-xs text-muted-foreground">
            {formatNumberWithCommas(draft.utilities.notes.length)}/1,000
          </span>
        </div>
        <Textarea
          id="misc-notes"
          aria-describedby="misc-notes-count"
          maxLength={1000}
          value={draft.utilities.notes}
          onChange={(event) => update("notes", event.target.value)}
          className="min-h-40"
        />
      </section>
      <section className="space-y-2 rounded-lg border p-4">
        <div className="flex justify-between">
          <label htmlFor="misc-backstory" className="font-medium">Backstory</label>
          <span id="misc-backstory-count" className="text-xs text-muted-foreground">
            {formatNumberWithCommas(draft.utilities.backstory.length)}/1,000
          </span>
        </div>
        <Textarea
          id="misc-backstory"
          aria-describedby="misc-backstory-count"
          maxLength={1000}
          value={draft.utilities.backstory}
          onChange={(event) => update("backstory", event.target.value)}
          className="min-h-40"
        />
      </section>
    </div>
  );
}

function catalogueSummary(stepValue: string, data: StaticData) {
  if (stepValue.includes("region-settlement")) {
    return [
      `${data.citystates.length} citystates`,
      `${data.settlementProfiles.length} detailed settlements + ${Object.values(data.settlements).reduce((total, entries) => total + entries.length, 0)} legacy weighted entries`,
      `${data.empires.length} political regions`,
      `${data.localeProfiles.length} detailed locale${data.localeProfiles.length === 1 ? "" : "s"}`,
    ];
  }
  if (stepValue.includes("heritage")) {
    return [
      `${data.culturalHeritage.length} cultural entries`,
      `${data.environHeritage.length} environmental entries`,
      `${data.societalHeritage.length} societal entries`,
    ];
  }
  if (stepValue.includes("social-rank"))
    return [`${data.socialRanks.length} social-rank entries`];
  if (stepValue.includes("tragedy"))
    return [`${data.tragedySeeds.length} tragedy seeds`];
  if (stepValue.includes("disabilities"))
    return [`${data.disabilities.length} disability entries`];
  if (stepValue.includes("belief")) {
    return [`${data.beliefs.length} beliefs`, `${data.deities.length} deities`];
  }
  if (stepValue.includes("species"))
    return [
      `${data.species.reduce((total, family) => total + family.groups.length, 0)} Sophont species entries`,
    ];
  if (stepValue.includes("attributes")) {
    return [
      `${Object.keys(data.attributeArrays).length} attribute arrays`,
      `${data.attributeDefinitions.length} attribute definitions`,
    ];
  }
  if (stepValue.includes("trade-specialization"))
    return [`${data.tradePackages.length} complete playable Trade packages`];
  if (stepValue.includes("wealth"))
    return [`${data.wealthTitles.length} wealth titles`];
  if (stepValue.includes("pml"))
    return [
      `${data.pmlTitles.length} PML titles`,
      `${data.pmlAgeMinimums.length} PML age rules`,
    ];
  if (
    stepValue.includes("skills-abilities-talents") ||
    stepValue.includes("additional-skills")
  ) {
    return [`${data.traits.length} trait/skill/talent entries`];
  }
  if (stepValue.includes("languages"))
    return [`${data.languages.length} languages`];
  if (stepValue.includes("height-weight"))
    return [
      `${data.physicalScale.length} physical-scale rows`,
      `${data.heritageCharacteristicAdjustments.length} Heritage body rules`,
    ];
  if (stepValue.includes("calculations"))
    return [
      `${data.calculatedAbilities.reduce((total, group) => total + group.abilities.length, 0)} calculated ability definitions`,
    ];
  if (stepValue.includes("spells")) return [`${data.spells.length} spells`];
  if (stepValue.includes("starting-gear")) {
    return [
      `${data.itemWeapons.length} weapons`,
      `${data.itemArmors.length} armor entries`,
      `${data.itemEquipments.length} equipment entries`,
    ];
  }
  if (stepValue.includes("magic-items"))
    return [`${data.magicItems.length} magic items`];
  return [];
}

function keyDrivers(
  stepValue: string,
  draft: CharacterDraft,
  data: StaticData,
): string[] {
  const region = regionByDraft(draft, data);
  const settlement = selectedSettlementDisplayName(draft, data);
  const species = getSpeciesChoice(draft, data);
  const lineage = getLineageName(draft, data);
  const trade = getTradePackage(draft, data);
  const heritage = [
    draft.background.culturalHeritageId,
    draft.background.environHeritageId,
    draft.background.societalHeritageId,
  ]
    .map((id) => data.heritagePackages.find((pkg) => pkg.id === id)?.name)
    .filter(Boolean)
    .join(" / ");
  const attributeState = draft.intrinsics.attributes.length
    ? "assigned"
    : "unassigned";
  const kno = getFinalAttributeValue("KNO", draft);
  const budget = skillpointBudget(draft, data);

  switch (stepValue) {
    case "background-demographics":
      return [
        `Species age brackets: ${species?.group.name ?? "Species unassigned"}`,
      ];
    case "background-heritage":
      return [
        `Region: ${region ? `${region.region} — ${region.name}` : "unassigned"}`,
        `Settlement: ${settlement ?? "unassigned"}`,
      ];
    case "background-social-rank":
      return [
        `Society Heritage: ${data.heritagePackages.find((pkg) => pkg.id === draft.background.societalHeritageId)?.name ?? "unassigned"}`,
      ];
    case "background-disabilities":
      return [
        `Age Group: ${draft.background.ageGroup ?? "unassigned"}`,
        `PML: ${draft.proficiencies.pml ?? "unassigned"}`,
      ];
    case "background-belief-worship":
      return [
        `Belief: ${data.beliefs.find((item) => item.catalogId === draft.background.beliefId)?.keyword ?? "unassigned"} (controls deity requirement)`,
      ];
    case "intrinsics-species":
      return [
        "Playable scope: Humaniki; Cherigili, Kriket, and Stonefolk unavailable",
      ];
    case "intrinsics-attributes":
      return [
        `Biology: ${[species?.group.name, lineage].filter(Boolean).join(" / ") || "unassigned"}`,
        `Age Group: ${draft.background.ageGroup ?? "unassigned"}`,
        "Creation budget: 75 point-buy; +4 purchased increases",
      ];
    case "intrinsics-trade-specialization":
      return [
        `Age Group: ${draft.background.ageGroup ?? "unassigned"}`,
        `Species / Lineage: ${[species?.group.name, lineage].filter(Boolean).join(" / ") || "unassigned"}`,
        `Attributes: ${attributeState}`,
      ];
    case "intrinsics-zed":
      return [
        `Critical Attribute Rolls: ${attributeState}`,
        `Trade: ${trade?.trade ?? "unassigned"}`,
      ];
    case "intrinsics-wealth":
      return [
        `Heritage: ${heritage || "unassigned"}`,
        `Settlement: ${settlement ?? "unassigned"}`,
        `KNO: ${kno ?? "unassigned"}`,
      ];
    case "proficiencies-pml":
      return [
        `Age Group: ${draft.background.ageGroup ?? "unassigned"} (sets minimum age)`,
      ];
    case "proficiencies-skills-abilities-talents":
      return [
        `Granted packages: ${[heritage && "Heritage", species && "Species", trade && "Trade"].filter(Boolean).join(", ") || "none"}`,
        `PML: ${draft.proficiencies.pml ?? "unassigned"}`,
      ];
    case "proficiencies-additional-skills":
      return [
        `Skillpoints: ${budget.remaining ?? "unresolved"} remaining`,
        `Age: ${draft.background.ageYears ?? "unresolved"}`,
        `Trade: ${trade?.trade ?? "unassigned"}`,
      ];
    case "proficiencies-languages":
      return [
        `Settlement: ${settlement ?? "unassigned"}`,
        `Heritage: ${heritage || "unassigned"}`,
        `INT / KNO: ${getFinalAttributeValue("INT", draft) ?? "—"} / ${kno ?? "—"}`,
      ];
    case "properties-height-weight":
      return [
        `Species / Lineage: ${[species?.group.name, lineage].filter(Boolean).join(" / ") || "unassigned"}`,
        `Age: ${draft.background.ageYears ?? "unresolved"}`,
        `Heritage / Trade: ${heritage || "unassigned"} / ${trade?.trade ?? "unassigned"}`,
      ];
    case "properties-calculations":
      return [
        `Attributes: ${attributeState}`,
        `Physical profile: ${draft.properties.profile ?? "unresolved"}`,
        `PML: ${draft.proficiencies.pml ?? "unassigned"}`,
      ];
    case "utilities-spells":
      return [
        `v-Magic access: ${draft.proficiencies.granted.some((item) => item.name.replace(/\s+X$/, "") === "v-Magic") ? "present" : "not present"}`,
      ];
    case "utilities-starting-gear":
      return [
        `Personal Wealth: ${personalWealthGp(draft, data)?.toLocaleString() ?? "unresolved"} gp`,
      ];
    case "utilities-magic-items":
      return [
        "Canonical entitlement or GM approval; only complete records are available",
      ];
    case "utilities-name":
      return [
        `Naming language: ${data.languages.find((item) => item.id === draft.utilities.nameLanguageId)?.name ?? "suggested from origin / known languages"}`,
      ];
    default:
      return [];
  }
}

export default function Worksheet({
  data,
  draft,
  setDraft,
  onReset,
}: {
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  onReset?: () => void;
}) {
  const allSteps = useMemo<CreationStep[]>(
    () =>
      data.steps.flatMap((phase) =>
        phase.substeps.map((step) => ({
          ...step,
          phaseTitle: phase.title,
          phaseValue: phase.value,
        })),
      ),
    [data.steps],
  );

  const [activeStepValue, setActiveStepValue] = useState(
    allSteps[0]?.value ?? "",
  );
  const mobileNav = useMobileNavigation();
  const assignmentPanelRef = useRef<HTMLDivElement>(null);

  const selectStep = (stepValue: string) => {
    setActiveStepValue(stepValue);
    mobileNav.close();
    requestAnimationFrame(() =>
      assignmentPanelRef.current?.scrollTo({ top: 0, behavior: "auto" }),
    );
  };

  const updateDraft: Dispatch<SetStateAction<CharacterDraft>> = setDraft;

  const activeIndex = Math.max(
    0,
    allSteps.findIndex((step) => step.value === activeStepValue),
  );
  const activeStep = allSteps[activeIndex] ?? allSteps[0];
  const stepAssessment = (stepValue: string) => {
    // Persisted completion approves reconstructed legacy values, but it must not
    // hide a concrete Broad Skill/Trait specialization still requiring review.
    if (stepValue === "proficiencies-skills-abilities-talents") {
      const assessment = assessProficiencyStep(stepValue, draft, data);
      if (assessment.status !== "complete") return assessment;
    }
    // A persisted completion is an explicit approval of the recorded values.
    // This is especially important for completed legacy character sheets, whose
    // display values may not have one-to-one IDs in the newer Forge catalogues.
    if (draft.completedSteps.includes(stepValue))
      return { status: "complete" as const, messages: [] as string[] };
    if (stepValue === "notes-overview" || stepValue === "notes-portrait")
      return { status: "complete" as const, messages: [] as string[] };
    if (isBackgroundStep(stepValue))
      return assessBackgroundStep(stepValue, draft, data);
    if (isIntrinsicStep(stepValue))
      return assessIntrinsicStep(stepValue, draft, data);
    if (isProficiencyStep(stepValue))
      return assessProficiencyStep(stepValue, draft, data);
    if (isPropertyStep(stepValue))
      return assessPropertyStep(stepValue, draft, data);
    if (isUtilityStep(stepValue))
      return assessUtilityStep(stepValue, draft, data);
    return {
      status: draft.completedSteps.includes(stepValue)
        ? ("complete" as const)
        : ("incomplete" as const),
      messages: [] as string[],
    };
  };
  const completeCount = allSteps.filter(
    (step) => stepAssessment(step.value).status === "complete",
  ).length;
  const progress =
    allSteps.length === 0 ? 0 : (completeCount / allSteps.length) * 100;
  const activeCatalogue = activeStep
    ? catalogueSummary(activeStep.value, data)
    : [];
  const activeAssessment = activeStep
    ? stepAssessment(activeStep.value)
    : { status: "incomplete" as const, messages: [] as string[] };
  const activeKeyDrivers = activeStep
    ? keyDrivers(activeStep.value, draft, data)
    : [];
  // The Character panel is a live projection. Recompute package grants, Intrinsics,
  // and Properties from the structured inputs rather than waiting for the Player
  // to revisit later steps after an upstream edit.
  const panelDraft = useMemo(
    () =>
      syncProperties(
        syncIntrinsics(syncHeritageGrantedSelections(draft, data), data),
        data,
      ),
    [draft, data],
  );
  const derived = useMemo(() => calculateProperties(panelDraft, data), [panelDraft, data]);
  const compressed = compressedCapabilities(panelDraft, data);
  const compressedSkills = compressed.filter((item) => item.isSkill);
  const compressedTraits = compressed.filter((item) => !item.isSkill);
  const panelLanguages = [...panelDraft.proficiencies.languages].sort(
    (left, right) =>
      left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
  );
  const panelInventory = [
    ...panelDraft.utilities.weapons,
    ...panelDraft.utilities.armor,
    ...panelDraft.utilities.equipment,
  ].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const unresolvedSteps = allSteps
    .map((step) => ({ step, assessment: stepAssessment(step.value) }))
    .filter(({ assessment }) => assessment.status !== "complete");
  const alertCount = unresolvedSteps.filter(
    ({ assessment }) => assessment.status === "incomplete",
  ).length;
  const warningCount = unresolvedSteps.filter(
    ({ assessment }) => assessment.status === "warning",
  ).length;
  const speciesChoice = getSpeciesChoice(panelDraft, data);
  const importedDetail = (detail: string) =>
    panelDraft.background.demographicSelections.find(
      (entry) => entry.sourceDetail === detail,
    )?.name;
  const selectedBelief = data.beliefs.find(
    (item) => item.catalogId === panelDraft.background.beliefId,
  );
  const beliefDisplay = selectedBelief?.isDeity
    ? (data.deities.find(
        (item) => item.catalogId === panelDraft.background.deityId,
      )?.deity ??
      importedDetail("Imported religion detail") ??
      "Theist — Deity required")
    : [selectedBelief?.keyword, importedDetail("Imported religion detail")]
        .filter(Boolean)
        .join(" / ") || "—";
  const calc = (key: string) => {
    const aliases: Record<string, string[]> = {
      Hitpoints: ["hitpoints"],
      Bodypoints: ["bodypoints"],
      Recovery: ["recoveryRate"],
      Resilience: ["resilience"],
      Resistance: ["resistance"],
      Endurance: ["endurance"],
      FavorDice: ["favorDice"],
      Cellburn: ["cellburnLimit"],
      Manapool: ["manapool"],
      MOV: ["mov"],
      HastyActions: ["actions"],
      MeleeAttack: ["meleeAttack"],
      MeleeDefend: ["meleeDefend"],
      RangeAttack: ["rangeAttack"],
      RangeDefend: ["rangeDefend"],
      MaxAdvantage: ["maxAdvantage"],
    };
    const calculated = panelDraft.properties.calculated;
    return (
      calculated[key] ??
      aliases[key]
        ?.map((alias) => calculated[alias])
        .find((value) => value != null) ??
      "—"
    );
  };
  const attributePanelValue = (name: string) => {
    const importedFinal = panelDraft.background.demographicSelections.some(
      (entry) => entry.sourceDetail === "Imported region",
    );
    if (importedFinal) {
      const recorded = panelDraft.intrinsics.attributes.find(
        (entry) => entry.name === name,
      )?.base;
      if (recorded != null) return recorded;
    }
    const final = getFinalAttributeValue(name, panelDraft);
    if (final != null) return final;
    const adjustment = nonPlayerAdjustmentsForAttribute(
      name,
      panelDraft,
      data,
    ).reduce((sum, item) => sum + item.amount, 0);
    return adjustment === 0 ? "—" : `${adjustment > 0 ? "+" : ""}${adjustment}`;
  };

  const setStepCompletion = (stepValue: string, complete: boolean) => {
    setDraft((current) => {
      const completedSteps = complete
        ? Array.from(new Set([...current.completedSteps, stepValue]))
        : current.completedSteps.filter((value) => value !== stepValue);
      return { ...current, completedSteps };
    });
  };

  const resetDraft = () => {
    const empty = createEmptyCharacterDraft();
    if (onReset) onReset();
    else setDraft(empty);
    selectStep(allSteps[0]?.value ?? "");
  };

  const goToIndex = (index: number) => {
    const step = allSteps[index];
    if (step) selectStep(step.value);
  };

  if (!activeStep) {
    return (
      <div className="p-6">No character-creation steps are configured.</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-8">
      <div data-forge-modal-background className="sticky top-14 z-40 flex flex-col gap-3 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              Sarna Len Character Forge
            </h1>
            <Badge variant="outline">v107 QA Corrections</Badge>
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            Canonical DXD creation order with all in-scope phases functional.
            The active structured draft is autosaved into the local Character
            Library and projected into the finished CRS.
          </p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-3 md:w-auto md:min-w-[260px]">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Creation progress</span>
              <span>
                {completeCount}/{allSteps.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" aria-label="Character creation progress" />
          </div>
          <Button variant="outline" size="sm" onClick={resetDraft}>
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>

      <MobileNavigationOverlay
        isOpen={mobileNav.isOpen}
        activeMode={mobileNav.activeMode}
        onClose={mobileNav.close}
        onSwitchMode={mobileNav.switchMode}
      />

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <Card
          id="mobile-forge-navigation-panel"
          className={cn(
            mobileNav.isOpen && mobileNav.activeMode === "navigation"
              ? "fixed inset-x-0 bottom-0 top-14 z-[60] block overflow-y-auto rounded-none border-x-0"
              : "hidden",
            "lg:sticky lg:inset-auto lg:top-44 lg:z-auto lg:block lg:h-fit lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-xl lg:border",
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base" role="heading" aria-level={2}>Creation</CardTitle>
            <CardDescription>
              Future steps remain visible. Only genuine rule dependencies should
              lock a choice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.steps.map((phase, phaseIndex) => {
              const phaseComplete = phase.substeps.every(
                (step) => stepAssessment(step.value).status === "complete",
              );
              const phaseActive = phase.value === activeStep.phaseValue;

              return (
                <PersistentAccordionSection
                  key={phase.value}
                  id={`phase-${phase.value}`}
                  title={
                    <span className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                      {phaseComplete ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : phaseActive ? (
                        <Circle className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      {phaseIndex + 1}. {phase.title.replace("ASSIGN ", "")}
                    </span>
                  }
                  defaultOpen={phaseActive || phaseIndex === 0}
                  className="border-0 px-0"
                  triggerClassName="py-2"
                >
                  <div className="space-y-1">
                    {phase.substeps.map((step) => {
                      const active = step.value === activeStep.value;
                      const assessment = stepAssessment(step.value);
                      const complete = assessment.status === "complete";
                      const warning = assessment.status === "warning";
                      return (
                        <button
                          type="button"
                          key={step.value}
                          onClick={() => selectStep(step.value)}
                          aria-current={active ? "step" : undefined}
                          aria-label={`${step.title}. ${complete ? "Complete" : warning ? "Warning: review or approve" : "Alert: fix required"}`}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          {complete ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          ) : warning ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#990000]" />
                          )}
                          <span>{step.title.replace("Assign ", "")}</span>
                        </button>
                      );
                    })}
                  </div>
                </PersistentAccordionSection>
              );
            })}
          </CardContent>
        </Card>

        <Card
          ref={assignmentPanelRef}
          data-forge-modal-background
          role="region"
          aria-labelledby="active-step-title"
          aria-describedby={activeAssessment.messages.length ? "active-step-assessment" : undefined}
          aria-invalid={activeAssessment.status === "incomplete" || undefined}
          className="min-h-[560px] lg:sticky lg:top-44 lg:h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain"
        >
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{activeStep.phaseTitle}</Badge>
              <span className="text-xs text-muted-foreground">
                Step {activeIndex + 1} of {allSteps.length}
              </span>
            </div>
            <CardTitle id="active-step-title" role="heading" aria-level={2}>{activeStep.title}</CardTitle>
            <CardDescription className="text-base">
              {activeStep.description}
            </CardDescription>
            {activeKeyDrivers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Key drivers
                </span>
                {activeKeyDrivers.map((driver) => (
                  <Badge key={driver} variant="outline" className="font-normal">
                    {driver}
                  </Badge>
                ))}
              </div>
            )}
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canGenerateStep(activeStep.value, draft, data)}
                onClick={() =>
                  setDraft((current) =>
                    generateStep(activeStep.value, current, data),
                  )
                }
              >
                <Dices className="h-4 w-4" /> Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PersistentAccordionSection
              id={`active-${activeStep.value}`}
              title="Assignment fields"
              defaultOpen
            >
              {activeStep.value === "notes-overview" ? (
                <NotesEditor draft={draft} data={data} setDraft={setDraft} />
              ) : activeStep.value === "notes-portrait" ? (
                <PortraitStep draft={draft} setDraft={setDraft} />
              ) : isBackgroundStep(activeStep.value) ||
                isIntrinsicStep(activeStep.value) ||
                isProficiencyStep(activeStep.value) ||
                isPropertyStep(activeStep.value) ||
                isUtilityStep(activeStep.value) ? (
                <>
                  {isBackgroundStep(activeStep.value) ? (
                    <BackgroundStep
                      stepValue={activeStep.value}
                      data={data}
                      draft={draft}
                      setDraft={updateDraft}
                    />
                  ) : isIntrinsicStep(activeStep.value) ? (
                    <IntrinsicsStep
                      stepValue={activeStep.value}
                      data={data}
                      draft={draft}
                      setDraft={updateDraft}
                    />
                  ) : isProficiencyStep(activeStep.value) ? (
                    <ProficienciesStep
                      stepValue={activeStep.value}
                      data={data}
                      draft={draft}
                      setDraft={updateDraft}
                    />
                  ) : isPropertyStep(activeStep.value) ? (
                    <PropertiesStep
                      stepValue={activeStep.value}
                      data={data}
                      draft={draft}
                      setDraft={updateDraft}
                    />
                  ) : (
                    <UtilitiesStep
                      stepValue={activeStep.value}
                      data={data}
                      draft={draft}
                      setDraft={updateDraft}
                    />
                  )}

                  {activeAssessment.messages.length > 0 && (
                    <div
                      id="active-step-assessment"
                      role={activeAssessment.status === "incomplete" ? "alert" : "status"}
                      aria-live={activeAssessment.status === "incomplete" ? "assertive" : "polite"}
                      className={cn(
                        "my-[2px] rounded-lg border p-4 text-sm",
                        activeAssessment.status === "warning" &&
                          "border-yellow-400 bg-yellow-100 text-black",
                        activeAssessment.status === "incomplete" &&
                          "border-[#990000] text-[#990000]",
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {activeAssessment.status === "warning" && (
                          <AlertTriangle className="h-4 w-4 text-black" />
                        )}
                        {activeAssessment.status === "incomplete" && (
                          <AlertTriangle className="h-4 w-4 text-[#990000]" />
                        )}
                        {activeAssessment.status === "complete"
                          ? "Current scope"
                          : activeAssessment.status === "warning"
                            ? "Usable with follow-up"
                            : "Still required"}
                      </div>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                        {activeAssessment.messages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="my-[2px] rounded-lg border border-dashed p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#990000]" />
                      <div className="space-y-2">
                        <p className="font-medium">
                          Rule-specific form pending
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This step is not yet implemented. It continues to use
                          the structured CharacterDraft rather than the final
                          sheet as source state.
                        </p>
                      </div>
                    </div>
                  </div>

                  {activeCatalogue.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">
                        Available source data
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {activeCatalogue.map((item) => (
                          <Badge key={item} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold">
                      Temporary completion control
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This manual marker remains only for phases whose real
                      forms have not yet been implemented.
                    </p>
                    <div className="mt-3">
                      {draft.completedSteps.includes(activeStep.value) ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setStepCompletion(activeStep.value, false)
                          }
                        >
                          Mark incomplete
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            setStepCompletion(activeStep.value, true)
                          }
                        >
                          <Check />
                          Mark step complete (temporary)
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </PersistentAccordionSection>
            <div className="sticky bottom-0 z-20 -mx-6 flex items-center justify-between border-t bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_14px_rgba(0,0,0,0.06)] backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-5 lg:shadow-none">
              <Button
                className="h-11 lg:h-10"
                variant="outline"
                disabled={activeIndex === 0}
                onClick={() => goToIndex(activeIndex - 1)}
              >
                <ChevronLeft /> Back
              </Button>
              <span className="text-xs font-medium text-muted-foreground lg:hidden" aria-live="polite">{activeIndex + 1} / {allSteps.length}</span>
              <Button
                className="h-11 lg:h-10"
                disabled={activeIndex >= allSteps.length - 1}
                onClick={() => goToIndex(activeIndex + 1)}
              >
                Continue <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          id="mobile-forge-character-panel"
          className={cn(
            mobileNav.isOpen && mobileNav.activeMode === "character"
              ? "fixed inset-x-0 bottom-0 top-14 z-[60] block w-full overflow-y-auto rounded-none border-x-0"
              : "hidden",
            "lg:sticky lg:inset-auto lg:top-44 lg:z-auto lg:block lg:h-fit lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-xl lg:border",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <img
                src={panelDraft.utilities.portraitDataUrl || "/character-creator/img/portrait-placeholder.png"}
                alt={panelDraft.utilities.portraitDataUrl ? "Character portrait" : "Default character portrait"}
                className="aspect-[294/248] w-28 rounded border object-cover"
              />
              <div>
                <CardTitle className="text-base" role="heading" aria-level={2}>Character</CardTitle>
                <CardDescription>Live compressed draft summary</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <PersistentAccordionSection
              id="character-identity"
              title="Identity"
            >
              <div className="font-medium">
                {panelDraft.utilities.name || "Unnamed character"}
              </div>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Region</dt>
                <dd>
                  {(() => {
                    const region = regionByDraft(panelDraft, data);
                    const geo = geographicRegionName(panelDraft, data);
                    return (
                      [geo, region?.name].filter(Boolean).join(" / ") || "—"
                    );
                  })()}
                </dd>
                <dt className="text-muted-foreground">Settlement</dt>
                <dd>
                  {selectedSettlementDisplayName(panelDraft, data) ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Heritage</dt>
                <dd className="text-left">
                  {[
                    panelDraft.background.culturalHeritageId,
                    panelDraft.background.environHeritageId,
                    panelDraft.background.societalHeritageId,
                  ]
                    .map(
                      (id) =>
                        data.heritagePackages.find((pkg) => pkg.id === id)
                          ?.name,
                    )
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </dd>
                <dt className="text-muted-foreground">Species</dt>
                <dd>
                  {speciesChoice?.family.displayName ??
                    (panelDraft.intrinsics.childOfStrife ? "Humaniki" : "—")}
                </dd>
                <dt className="text-muted-foreground">Group</dt>
                <dd>
                  {speciesChoice?.group.name ??
                    getStrifePairing(panelDraft)?.exonym ??
                    "—"}
                </dd>
                <dt className="text-muted-foreground">Lineage</dt>
                <dd>
                  {getLineageName(panelDraft, data) ??
                    (panelDraft.intrinsics.childOfStrife
                      ? [
                          panelDraft.intrinsics.strifeFatherLineageId,
                          panelDraft.intrinsics.strifeMotherLineageId,
                        ]
                          .map((id) =>
                            id
                              ?.replace(/^lineage-/, "")
                              .replace(
                                /(^|-)([a-z])/g,
                                (_, prefix, letter) =>
                                  `${prefix}${letter.toUpperCase()}`,
                              ),
                          )
                          .filter(Boolean)
                          .join("-")
                      : "—")}
                </dd>
                <dt className="text-muted-foreground">Age Group</dt>
                <dd>
                  {panelDraft.background.ageGroup ?? "—"}
                  {panelDraft.background.ageYears != null
                    ? ` • ${panelDraft.background.ageYears}`
                    : ""}
                </dd>
                <dt className="text-muted-foreground">Belief</dt>
                <dd>{beliefDisplay}</dd>
                <dt className="text-muted-foreground">Trade</dt>
                <dd>
                  {getTradePackage(panelDraft, data)?.trade ?? "—"}
                  {getTradeSpecialization(panelDraft, data)
                    ? ` > ${getTradeSpecialization(panelDraft, data)?.name}`
                    : ""}
                </dd>
              </dl>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-background"
              title="Background"
              defaultOpen={false}
            >
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Sex / Gender</dt>
                <dd>
                  {[panelDraft.background.sex, panelDraft.background.gender]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </dd>
                <dt className="text-muted-foreground">Handedness</dt>
                <dd>{panelDraft.background.handedness ?? "—"}</dd>
                <dt className="text-muted-foreground">Birth Month</dt>
                <dd>{panelDraft.background.birthMonth ?? "—"}</dd>
                <dt className="text-muted-foreground">Personality</dt>
                <dd>
                  {panelDraft.background.personality
                    .map((item) => item.name)
                    .join(", ") || "—"}
                </dd>
                <dt className="text-muted-foreground">Tragedy</dt>
                <dd>{panelDraft.background.tragedySeedText ?? "—"}</dd>
                <dt className="text-muted-foreground">Disabilities</dt>
                <dd>
                  {panelDraft.background.disabilities
                    .map((item) => item.name)
                    .join(", ") ||
                    (panelDraft.background.disabilitiesReviewed ? "None" : "—")}
                </dd>
              </dl>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-attributes"
              title="Attributes"
            >
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    Combat
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["CCA", "RCA", "REF"].map((name) => (
                      <div
                        key={name}
                        className="rounded border p-2 text-center"
                      >
                        <div className="text-xs text-muted-foreground">
                          {name}
                        </div>
                        <div className="font-semibold">
                          {attributePanelValue(name)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    Psychological
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {["INT", "KNO", "PRE", "POW"].map((name) => (
                      <div
                        key={name}
                        className="rounded border p-2 text-center"
                      >
                        <div className="text-xs text-muted-foreground">
                          {name}
                        </div>
                        <div className="font-semibold">
                          {attributePanelValue(name)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    Physical
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {["STR", "FOR", "MOV", "SIZ"].map((name) => (
                      <div
                        key={name}
                        className="rounded border p-2 text-center"
                      >
                        <div className="text-xs text-muted-foreground">
                          {name}
                        </div>
                        <div className="font-semibold">
                          {name === "SIZ"
                            ? (panelDraft.properties.siz ?? "—")
                            : name === "MOV" && derived?.mov != null
                            ? derived.mov
                            : attributePanelValue(name)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    Magic
                  </div>
                  <div className="w-24 rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground">ZED</div>
                    <div className="font-semibold">
                      {panelDraft.intrinsics.zed ?? attributePanelValue("ZED")}
                    </div>
                  </div>
                </div>
              </div>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-calculated"
              title="Calculated Scores"
            >
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                {[
                  ["Stature", panelDraft.properties.stature],
                  ["Build", panelDraft.properties.build],
                  ["Profile", panelDraft.properties.profile],
                  ["Hitpoints", calc("Hitpoints")],
                  ["Bodypoints", calc("Bodypoints")],
                  ["Resilience", calc("Resilience")],
                  ["Resistance", calc("Resistance")],
                  ["Endurance", calc("Endurance")],
                  ["Recovery Rate", calc("Recovery")],
                ].map(([name, value]) => (
                  <Fragment key={String(name)}>
                    <dt className="text-muted-foreground">{name}</dt>
                    <dd>{value ?? "—"}</dd>
                  </Fragment>
                ))}
              </dl>
            </PersistentAccordionSection>
            <PersistentAccordionSection id="character-derived" title="Derived Scores" defaultOpen={false}>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                {[
                  ["Height", derived?.height ?? "—"], ["Weight", derived ? `${formatNumberWithCommas(derived.weightPounds)} lb` : "—"],
                  ["Physicality", derived?.physicality ?? "—"], ["Gasp Limit", derived ? `${derived.gaspTurnsScalar} Turns` : "—"],
                  ["Sleep Limit", derived ? `${derived.sleepHoursScalar} Hours` : "—"], ["Agility", derived ? `${formatNumberWithCommas(Number(derived.agilityFeet.toFixed(2)))} ft` : "—"],
                  ["Run Speed", derived ? `${formatNumberWithCommas(derived.runMph)} mph` : "—"], ["Walk / Jog / Run", derived ? `${derived.walk} / ${derived.jog} / ${derived.run}` : "—"],
                  ["Jump Up / Broad / Down", derived ? `${derived.upward} / ${derived.broad} / ${derived.downward}` : "—"], ["Lob / Pitch / Hurl", derived ? `${derived.lob} / ${derived.pitch} / ${derived.hurl}` : "—"],
                  ["Lift / Shoulder / Carry", derived ? `${derived.lift} / ${derived.shoulder} / ${derived.carry}` : "—"],
                ].map(([name, value]) => <Fragment key={String(name)}><dt className="text-muted-foreground">{name}</dt><dd>{value}</dd></Fragment>)}
              </dl>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-misc"
              title="Miscellaneous"
            >
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                {[
                  ["PML", panelDraft.proficiencies.pml],
                  ["Affinity", panelDraft.intrinsics.affinityAttribute],
                  [
                    "Wealth Rank",
                    panelDraft.intrinsics.wealthRank ?? calc("wealthRank"),
                  ],
                  [
                    "Social Rank",
                    panelDraft.background.socialRank ?? calc("socialRank"),
                  ],
                  ["Trade Rank", panelDraft.intrinsics.tradeRank],
                  ["Favor Dice", calc("FavorDice")],
                  ["Cellburn Limit", calc("Cellburn")],
                  ["Manapool", derived?.manapool ?? calc("Manapool")],
                ].map(([name, value]) => (
                  <Fragment key={String(name)}>
                    <dt className="text-muted-foreground">{name}</dt>
                    <dd>{value ?? "—"}</dd>
                  </Fragment>
                ))}
              </dl>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-languages"
              title={`Languages (${panelLanguages.length})`}
              defaultOpen={false}
            >
              <div className="space-y-1 text-xs">
                {panelLanguages.length
                  ? panelLanguages.map((item) => (
                      <div key={item.id}>
                        {formatLanguageRecord(item)}
                      </div>
                    ))
                  : "—"}
              </div>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-skills"
              title={`Skills (${compressedSkills.length})`}
              defaultOpen={false}
            >
              <div className="space-y-1 text-xs">
                {compressedSkills.length
                  ? compressedSkills.map((item) => (
                      <div key={item.name}>{item.display}</div>
                    ))
                  : "—"}
              </div>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-traits"
              title={`Traits (${compressedTraits.length})`}
              defaultOpen={false}
            >
              <div className="space-y-1 text-xs">
                {compressedTraits.length
                  ? compressedTraits.map((item) => (
                      <div key={item.name}>{item.display}</div>
                    ))
                  : "—"}
              </div>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-utilities"
              title="Utilities"
              defaultOpen={false}
            >
              <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Proper Name</dt>
                <dd>{panelDraft.utilities.properName || "—"}</dd>
                <dt className="text-muted-foreground">Spells</dt>
                <dd>
                  {panelDraft.utilities.spells
                    .map((item) => displaySpellName(item.name))
                    .join(", ") ||
                    (panelDraft.utilities.spellsReviewed ? "None" : "—")}
                </dd>
                <dt className="text-muted-foreground">Gear</dt>
                <dd>
                  {panelInventory
                    .map(
                      (item) =>
                        displayInventoryQuantity(item.name, item.quantity),
                    )
                    .join(", ") ||
                    (panelDraft.utilities.gearReviewed ? "None" : "—")}
                </dd>
                <dt className="text-muted-foreground">Magic Items</dt>
                <dd>
                  {panelDraft.utilities.magicItems
                    .map((item) => {
                      const form = magicItemInventoryForm(item, panelDraft, data);
                      return `${item.name}${form ? ` [${form.displayName}, ${formatNumberWithCommas(form.weight)}#]` : ""}`;
                    })
                    .join(", ") ||
                    (panelDraft.utilities.magicItemsReviewed ? "None" : "—")}
                </dd>
              </dl>
            </PersistentAccordionSection>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Skillpoints:{" "}
              {formatNumberWithCommas(
                skillpointBudget(panelDraft, data).remaining ?? "—",
              )}{" "}
              remaining. Gear:{" "}
              {formatNumberWithCommas(
                startingGearTotals(panelDraft, data).costGp,
                { minimumFractionDigits: 1, maximumFractionDigits: 1 },
              )}{" "}
              / {personalWealthGp(panelDraft, data)?.toLocaleString() ?? "—"}{" "}
              gp.
            </div>
            <PersistentAccordionSection
              id="character-notes"
              title="Notes"
              defaultOpen={false}
            >
              <div className="space-y-3 text-xs">
                <div>
                  {[
                    `Personality: ${panelDraft.background.personality.map((item) => item.name).join(", ") || "—"}`,
                    `Blemishes: ${
                      panelDraft.background.demographicSelections
                        .filter((item) =>
                          /blemish/i.test(item.sourceDetail ?? ""),
                        )
                        .map((item) => item.name)
                        .join(", ") || "—"
                    }`,
                    `Notable features: ${
                      panelDraft.background.demographicSelections
                        .filter((item) =>
                          /notable/i.test(item.sourceDetail ?? ""),
                        )
                        .map((item) => item.name)
                        .join(", ") || "—"
                    }`,
                    `Tragedy seed: ${panelDraft.background.tragedySeedText ?? "—"}`,
                    bodyFrameSummary(panelDraft),
                    strifeSummary(panelDraft, data),
                  ]
                    .filter(Boolean)
                    .map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                </div>
                <dl className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1">
                  {(
                    [
                      ["Weapons", panelDraft.utilities.weapons],
                      ["Armor", panelDraft.utilities.armor],
                      ["Equipment", panelDraft.utilities.equipment],
                      ["Spells", panelDraft.utilities.spells],
                    ] as const
                  ).map(([label, items]) => (
                    <Fragment key={label}>
                      <dt className="font-semibold">{label}</dt>
                      <dd>
                        {[...items]
                          .sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, {
                              sensitivity: "base",
                            }),
                          )
                          .map((item) => label === "Spells" ? displaySpellName(item.name) : displayInventoryQuantity(item.name, "quantity" in item ? item.quantity : 1))
                          .join(label === "Spells" ? ", " : "; ") || "—"}
                      </dd>
                    </Fragment>
                  ))}
                </dl>
                <div>
                  <div className="font-semibold">Notes</div>
                  <div className="whitespace-pre-wrap">
                    {panelDraft.utilities.notes || "—"}
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Backstory</div>
                  <div className="whitespace-pre-wrap">
                    {panelDraft.utilities.backstory || "—"}
                  </div>
                </div>
              </div>
            </PersistentAccordionSection>
            <PersistentAccordionSection
              id="character-status"
              title={
                <span
                  className={cn(
                    "flex items-center gap-2",
                    alertCount
                      ? "text-[#990000]"
                      : warningCount
                        ? "text-black"
                        : "",
                  )}
                >
                  {unresolvedSteps.length ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Status{" "}
                  {unresolvedSteps.length
                    ? `${alertCount} alert${alertCount === 1 ? "" : "s"}${warningCount ? `, ${warningCount} warning${warningCount === 1 ? "" : "s"}` : ""}`
                    : "✓"}
                </span>
              }
              defaultOpen={false}
            >
              <div className="space-y-2">
                {unresolvedSteps.length ? (
                  unresolvedSteps.map(({ step, assessment }) => {
                    const warning = assessment.status === "warning";
                    return (
                      <button
                        type="button"
                        key={step.value}
                        onClick={() => selectStep(step.value)}
                        className={cn(
                          "block w-full rounded border p-2 text-left text-xs",
                          warning
                            ? "border-yellow-400 bg-yellow-100 text-black"
                            : "border-[#990000] text-[#990000]",
                        )}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {step.title}
                        </span>
                        <span className="ml-5">
                          {warning
                            ? "warning — review or approve"
                            : "alert — fix required"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground">
                    All configured steps are complete.
                  </div>
                )}
              </div>
            </PersistentAccordionSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
