'use server';

import { suggestRelevantTalents } from '@/ai/flows/suggest-relevant-talents';
import { generateImage } from '@/ai/flows/generate-image-flow';
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

const ImageActionInputSchema = z.object({
    prompt: z.string().min(1, { message: 'Prompt cannot be empty.' }),
});

export async function getImageFromPrompt(input: z.infer<typeof ImageActionInputSchema>) {
    const parsedInput = ImageActionInputSchema.safeParse(input);
    if (!parsedInput.success) {
        return { error: 'Invalid input.' };
    }

    try {
        const result = await generateImage(parsedInput.data);
        return { imageUrl: result.imageUrl };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to generate image from AI. Please try again later.' };
    }
}
