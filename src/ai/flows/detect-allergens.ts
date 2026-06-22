// src/ai/flows/detect-allergens.ts
'use server';
/**
 * @fileOverview Detects allergens in food ingredients based on a user's allergy profile and generates a risk alert.
 *
 * - detectAllergensAndGenerateAlert - A function that handles the allergen detection and alert generation process.
 * - DetectAllergensInput - The input type for the detectAllergensAndGenerateAlert function.
 * - DetectAllergensOutput - The return type for the detectAllergensAndGenerateAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAllergensInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A list of ingredients identified from a food label or scan.'),
  allergens: z
    .array(z.string())
    .describe('A list of allergens from the user profile.'),
});
export type DetectAllergensInput = z.infer<typeof DetectAllergensInputSchema>;

const AllergenAlertSchema = z.enum(['HIGH', 'MODERATE', 'SAFE']);

const DetectAllergensOutputSchema = z.object({
  allergenDetected: z
    .boolean()
    .describe('Whether any of the user-specified allergens were detected in the ingredients.'),
  alert: AllergenAlertSchema.describe(
    'The risk alert level based on the presence of allergens.'
  ),
  detectedAllergens: z
    .array(z.string())
    .describe('List of detected allergens'),
});
export type DetectAllergensOutput = z.infer<typeof DetectAllergensOutputSchema>;

export async function detectAllergensAndGenerateAlert(
  input: DetectAllergensInput
): Promise<DetectAllergensOutput> {
  return detectAllergensFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectAllergensPrompt',
  input: {schema: DetectAllergensInputSchema},
  output: {schema: DetectAllergensOutputSchema},
  prompt: `You are an AI assistant specialized in detecting allergens in food ingredients.
  Compare the following list of ingredients against the user's allergy profile to identify potential allergens.
  Generate a risk alert indicating the severity of the risk (HIGH, MODERATE, or SAFE).

  Ingredients: {{{ingredients}}}
  Allergens: {{{allergens}}}

  Output:
  - allergenDetected: true if any of the user-specified allergens are present in the ingredients, false otherwise.
  - alert: HIGH if multiple allergens are detected or if a critical allergen is detected, MODERATE if one allergen is detected, SAFE if no allergens are detected.
  - detectedAllergens: array of allergens found in ingredients
  `,
});

const detectAllergensFlow = ai.defineFlow(
  {
    name: 'detectAllergensFlow',
    inputSchema: DetectAllergensInputSchema,
    outputSchema: DetectAllergensOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
