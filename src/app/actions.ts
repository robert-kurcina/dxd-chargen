'use server';

import { suggestRelevantTalents } from '@/ai/flows/suggest-relevant-talents';
import { generateImageFlow } from '@/ai/flows/generate-image-flow';
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

export async function getImageFromPrompt(prompt: string) {
  if (!prompt) {
    return { error: 'Prompt cannot be empty.' };
  }
  try {
    const result = await generateImageFlow(prompt);
    return { imageUrl: result };
  } catch (e: any) {
    console.error(e);
    return { error: e.message || 'Failed to generate image. Please try again later.' };
  }
}
