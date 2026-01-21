'use server';

import { suggestRelevantTalents } from '@/ai/flows/suggest-relevant-talents';
import { z } from 'zod';

const TalentActionInputSchema = z.object({
  attributes: z.record(z.number()),
  skills: z.record(z.number()),
});

export async function getTalentSuggestions(input: z.infer<typeof TalentActionInputSchema>) {
  const parsedInput = TalentActionInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { error: 'Invalid input.' };
  }

  try {
    const result = await suggestRelevantTalents(parsedInput.data);
    return { talents: result.talents };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to get suggestions from AI. Please try again later.' };
  }
}
