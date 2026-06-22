'use server';

/**
 * @fileOverview This file defines a Genkit flow for recommending safe foods based on a user's allergy profile and dietary preferences.
 *
 * - recommendSafeFoods - A function that recommends safe foods for a user.
 * - RecommendSafeFoodsInput - The input type for the recommendSafeFoods function.
 * - RecommendSafeFoodsOutput - The return type for the recommendSafeFoods function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendSafeFoodsInputSchema = z.object({
  allergyProfile: z.object({
    allergens: z.array(z.string()).describe('List of allergens the user is allergic to.'),
    dietaryPreferences: z.string().optional().describe('Dietary preferences of the user (e.g., vegetarian, vegan).'),
  }).describe('The user allergy profile and dietary preferences.'),
  nutritionGoals: z.string().optional().describe('The nutritional goals of the user.'),
  cuisinePreference: z.string().optional().describe('A preferred cuisine type, e.g., "Italian", "Ghanaian", "any".')
});
export type RecommendSafeFoodsInput = z.infer<typeof RecommendSafeFoodsInputSchema>;

const RecommendedFoodSchema = z.object({
  name: z.string().describe("The name of the recommended food/dish."),
  description: z.string().describe("A brief, appetizing description of the food."),
  reasoning: z.string().describe("Why this specific food is a good recommendation based on the user's profile."),
  dataAiHint: z.string().describe("One or two keywords for image search, like 'ghanaian food' or 'caesar salad'.")
});
export type RecommendedFood = z.infer<typeof RecommendedFoodSchema>;

const RecommendSafeFoodsOutputSchema = z.object({
  recommendations: z.array(RecommendedFoodSchema).describe('List of recommended safe foods with details.'),
  overallReasoning: z.string().describe("A summary explanation of why these foods are recommended as a group."),
});

export type RecommendSafeFoodsOutput = z.infer<typeof RecommendSafeFoodsOutputSchema>;

export async function recommendSafeFoods(input: RecommendSafeFoodsInput): Promise<RecommendSafeFoodsOutput> {
  return recommendSafeFoodsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendSafeFoodsPrompt',
  input: {schema: RecommendSafeFoodsInputSchema},
  output: {schema: RecommendSafeFoodsOutputSchema},
  prompt: `You are an AI food recommendation expert and creative chef with deep expertise in global cuisines, especially all foods from Ghana (e.g., Waakye, Banku, Fufu, Kenkey, Red Red). 

Your task is to recommend 3-5 delicious and safe dishes based on a user's profile.

User Profile:
- Allergens to avoid: {{#if allergyProfile.allergens}}{{allergyProfile.allergens}}{{else}}None specified (recommend healthy options){{/if}}
- Dietary Preferences: {{allergyProfile.dietaryPreferences}}
- Nutrition Goals: {{nutritionGoals}}
- Preferred Cuisine: {{cuisinePreference}}

Your task:
1. Generate a list of 3-5 creative and appealing food recommendations. If "Ghanaian" is mentioned or implied, prioritize authentic Ghanaian dishes.
2. If the user HAS NO allergens specified, focus on general healthy and popular recommendations.
3. For each recommendation, provide a name, a short appetizing description, a reason why it's a good choice, and a 1-2 word AI hint for image generation.
4. Crucially, ensure that the typical ingredients DO NOT contain any of the user's specified allergens.
5. Provide a brief 'overallReasoning' summarizing your thought process.

Do not recommend simple ingredients; recommend complete, appetizing dishes.
`,
});

const recommendSafeFoodsFlow = ai.defineFlow(
  {
    name: 'recommendSafeFoodsFlow',
    inputSchema: RecommendSafeFoodsInputSchema,
    outputSchema: RecommendSafeFoodsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
