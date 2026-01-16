'use server';

import { suggestRelevantTalents } from '@/ai/flows/suggest-relevant-talents';
import { z } from 'zod';

const ActionInputSchema = z.object({
  attributes: z.record(z.number()),
  skills: z.record(z.number()),
});

export async function getTalentSuggestions(input: z.infer<typeof ActionInputSchema>) {
  const parsedInput = ActionInputSchema.safeParse(input);
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
