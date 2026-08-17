import type { StaticData } from '@/data';
import type { CharacterDraft } from '@/lib/character-draft';
import { assessBackgroundStep, isBackgroundStep } from './background';
import { assessIntrinsicStep, isIntrinsicStep } from './intrinsics';
import { assessProficiencyStep, isProficiencyStep } from './proficiencies';
import { assessPropertyStep, isPropertyStep } from './properties';
import { assessUtilityStep, isUtilityStep } from './utilities';

export type ValidationSeverity = 'error' | 'warning';

export type CharacterValidationIssue = {
  severity: ValidationSeverity;
  step: string;
  stepTitle: string;
  message: string;
};

export type CharacterValidation = {
  ready: boolean;
  totalSteps: number;
  completeSteps: number;
  warningSteps: number;
  incompleteSteps: number;
  issues: CharacterValidationIssue[];
};

function assess(stepValue: string, draft: CharacterDraft, data: StaticData) {
  if (isBackgroundStep(stepValue)) return assessBackgroundStep(stepValue, draft, data);
  if (isIntrinsicStep(stepValue)) return assessIntrinsicStep(stepValue, draft, data);
  if (isProficiencyStep(stepValue)) return assessProficiencyStep(stepValue, draft, data);
  if (isPropertyStep(stepValue)) return assessPropertyStep(stepValue, draft, data);
  if (isUtilityStep(stepValue)) return assessUtilityStep(stepValue, draft, data);
  return { status: 'incomplete' as const, messages: ['This creation step has no validation implementation.'] };
}

function catalogIntegrityIssues(draft: CharacterDraft, data: StaticData): CharacterValidationIssue[] {
  const issues: CharacterValidationIssue[] = [];
  const push = (step: string, stepTitle: string, message: string) => issues.push({ severity: 'error', step, stepTitle, message });

  for (const spell of draft.utilities.spells) {
    if (spell.catalogId && !data.spells.some((entry) => entry.catalogId === spell.catalogId)) {
      push('utilities-spells', 'Assign Spells', `Spell selection “${spell.name}” no longer resolves to the current catalogue.`);
    }
  }
  for (const item of draft.utilities.magicItems) {
    if (item.catalogId && !data.magicItems.some((entry) => entry.catalogId === item.catalogId)) {
      push('utilities-magic-items', 'Assign Magic Items', `Magic Item selection “${item.name}” no longer resolves to the complete-data catalogue.`);
    }
  }
  const inventoryGroups = [
    ['weapons', 'Customize Weapons', data.itemWeapons],
    ['armor', 'Customize Armor', data.itemArmors],
    ['equipment', 'Customize Equipment', data.itemEquipments],
  ] as const;
  for (const [key, customizeTitle, catalogue] of inventoryGroups) {
    for (const item of draft.utilities[key]) {
      if (item.catalogId && !catalogue.some((entry) => entry.catalogId === item.catalogId)) {
        const canonical = item.sourceDetail === 'Canonical Starting Gear';
        const step = canonical ? 'utilities-starting-gear' : `customize-${key}`;
        const title = canonical ? 'Assign Starting Gear' : customizeTitle;
        push(step, title, `Inventory selection “${item.name}” no longer resolves to the current ${key} catalogue.`);
      }
    }
  }
  for (const language of draft.proficiencies.languages) {
    if (language.catalogId && !data.languages.some((entry) => entry.id === language.catalogId)) {
      push('proficiencies-languages', 'Assign Languages', `Language selection “${language.name}” no longer resolves to the current language catalogue.`);
    }
  }

  return issues;
}

export function validateCharacterDraft(draft: CharacterDraft, data: StaticData): CharacterValidation {
  const steps = data.steps.flatMap((phase) => phase.substeps);
  const requiredSteps = steps.filter((step) => !('optional' in step && step.optional));
  const issues: CharacterValidationIssue[] = [];
  let completeSteps = 0;
  let warningSteps = 0;
  let incompleteSteps = 0;

  for (const step of requiredSteps) {
    const result = assess(step.value, draft, data);
    if (result.status === 'complete') completeSteps += 1;
    else if (result.status === 'warning') { warningSteps += 1; completeSteps += 1; }
    else incompleteSteps += 1;

    if (result.status !== 'complete') {
      const severity: ValidationSeverity = result.status === 'warning' ? 'warning' : 'error';
      const messages = result.messages.length ? result.messages : ['This step is incomplete.'];
      for (const message of messages) {
        issues.push({ severity, step: step.value, stepTitle: step.title, message });
      }
    }
  }

  issues.push(...catalogIntegrityIssues(draft, data));
  for (const warning of draft.warnings) {
    issues.push({ severity: 'warning', step: warning.step, stepTitle: warning.step, message: warning.message });
  }

  return {
    ready: incompleteSteps === 0 && !issues.some((issue) => issue.severity === 'error'),
    totalSteps: requiredSteps.length,
    completeSteps,
    warningSteps,
    incompleteSteps,
    issues,
  };
}
