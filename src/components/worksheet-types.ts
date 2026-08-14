import type { StaticData } from '@/data';

export type CreationPhase = StaticData['steps'][number];
export type CreationStep = CreationPhase['substeps'][number] & {
  phaseTitle: string;
  phaseValue: string;
};
