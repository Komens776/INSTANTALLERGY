'use server';
/**
 * @fileOverview A Genkit flow for generating an image of a food item using high-quality image generation.
 *
 * - generateFoodImage - A function that generates an image based on a food name.
 * - GenerateFoodImageInput - The input type for the generateFoodImage function.
 * - GenerateFoodImageOutput - The return type for the generateFoodImage function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const GenerateFoodImageInputSchema = z.object({
    foodName: z.string().describe("The name of the food to generate an image for, e.g., 'Jollof Rice'."),
});
export type GenerateFoodImageInput = z.infer<typeof GenerateFoodImageInputSchema>;


const GenerateFoodImageOutputSchema = z.object({
    imageDataUri: z.string().describe("The generated image as a data URI."),
});
export type GenerateFoodImageOutput = z.infer<typeof GenerateFoodImageOutputSchema>;


export async function generateFoodImage(input: GenerateFoodImageInput): Promise<GenerateFoodImageOutput> {
  return generateFoodImageFlow(input);
}

const generateFoodImageFlow = ai.defineFlow(
  {
    name: 'generateFoodImageFlow',
    inputSchema: GenerateFoodImageInputSchema,
    outputSchema: GenerateFoodImageOutputSchema,
  },
  async ({ foodName }) => {
    // Using Imagen 4 for higher quality food photography
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `A stunning, professional food photograph of ${foodName}. Cinematic lighting, shallow depth of field, high resolution, 8k, appetizing presentation on a modern plate, vibrant natural colors.`,
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return { imageDataUri: media.url };
  }
);
