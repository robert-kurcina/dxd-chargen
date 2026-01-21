'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt,
    });
    if (!media) {
      throw new Error('The image generation model did not return an image. This may be due to safety filters or prompt complexity.');
    }
    return media.url;
  }
);
