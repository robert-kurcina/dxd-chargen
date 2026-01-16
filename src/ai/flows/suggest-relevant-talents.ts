'use server';
/**
 * @fileOverview Provides AI-powered suggestions for relevant talents based on character attributes and skills.
 *
 * - suggestRelevantTalents - A function that suggests talents based on character attributes and skills.
 * - SuggestRelevantTalentsInput - The input type for the suggestRelevantTalents function.
 * - SuggestRelevantTalentsOutput - The return type for the suggestRelevantTalents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelevantTalentsInputSchema = z.object({
  attributes: z
    .record(z.number())
    .describe('A map of character attributes to their values.'),
  skills: z
    .record(z.number())
    .describe('A map of character skills to their levels.'),
});
export type SuggestRelevantTalentsInput = z.infer<typeof SuggestRelevantTalentsInputSchema>;

const SuggestRelevantTalentsOutputSchema = z.object({
  talents: z.array(z.string()).describe('An array of suggested talents.'),
});
export type SuggestRelevantTalentsOutput = z.infer<typeof SuggestRelevantTalentsOutputSchema>;

export async function suggestRelevantTalents(
  input: SuggestRelevantTalentsInput
): Promise<SuggestRelevantTalentsOutput> {
  return suggestRelevantTalentsFlow(input);
}

const talentSuggesterPrompt = ai.definePrompt({
  name: 'talentSuggesterPrompt',
  input: {schema: SuggestRelevantTalentsInputSchema},
  output: {schema: SuggestRelevantTalentsOutputSchema},
  prompt: `You are a role-playing game master, skilled at suggesting character talents.

  Based on the character's attributes and skills, suggest a list of relevant talents.
  Attributes: {{attributes}}
  Skills: {{skills}}
  Talents:`, // keep open ended to encourage suggestions
});

const suggestRelevantTalentsFlow = ai.defineFlow(
  {
    name: 'suggestRelevantTalentsFlow',
    inputSchema: SuggestRelevantTalentsInputSchema,
    outputSchema: SuggestRelevantTalentsOutputSchema,
  },
  async input => {
    const {output} = await talentSuggesterPrompt(input);
    return output!;
  }
);
