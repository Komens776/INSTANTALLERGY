'use server';

/**
 * @fileOverview An AI agent that classifies food items from an image, provides detailed information, and suggests alternatives.
 *
 * - classifyFood - A function that handles the food classification process.
 * - ClassifyFoodInput - The input type for the classifyFood function.
 * - ClassifyFoodOutput - The return type for the classifyFood function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyFoodInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the food item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ClassifyFoodInput = z.infer<typeof ClassifyFoodInputSchema>;

const FoodDetailsSchema = z.object({
    name: z.string().describe("The common name of the food item."),
    ingredients: z.array(z.string()).describe("A list of typical ingredients used to make this food."),
    nutritionalData: z.string().describe("A brief summary of the nutritional profile of the food."),
    region: z.string().describe("The primary region or country associated with the food."),
    history: z.string().describe("A brief cultural or historical note about the food."),
    dataAiHint: z.string().describe("One or two keywords for image search, like 'ghanaian food' or 'caesar salad'.")
});

const ClassifyFoodOutputSchema = z.object({
  isFood: z.boolean().describe("Whether the image contains food or not."),
  foodDetails: FoodDetailsSchema.optional().describe("Detailed information about the food if it is recognized."),
  classification: z.string().describe('The identified food item. If not a food, this should state that.'),
  confidence: z.number().describe('The confidence level of the classification (0-1).'),
  alternativeSuggestions: z.array(z.string()).describe('Alternative food item suggestions if the classification is uncertain.'),
});
export type ClassifyFoodOutput = z.infer<typeof ClassifyFoodOutputSchema>;

export async function classifyFood(input: ClassifyFoodInput): Promise<ClassifyFoodOutput> {
  return classifyFoodFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyFoodPrompt',
  input: {schema: ClassifyFoodInputSchema},
  output: {schema: ClassifyFoodOutputSchema},
  prompt: `You are an expert food classifier and culinary historian with deep knowledge of global cuisines, especially all foods from Ghana. Your task is to identify the food item in the image.

1.  Determine if the image contains food. Set the \`isFood\` boolean field accordingly.
2.  If it is food, identify it and provide the following details:
    *   \`classification\`: The most likely name of the food. If it is a Ghanaian food, provide its local name.
    *   \`confidence\`: Your confidence level (0-1) for this classification.
    *   \`foodDetails\`:
        *   \`name\`: The name of the food.
        *   \`ingredients\`: A list of common ingredients.
        *   \`nutritionalData\`: A brief nutritional summary.
        *   \`region\`: The food's region of origin.
        *   \`history\`: A brief historical or cultural note.
        *   \`dataAiHint\`: One or two keywords (e.g., 'jollof rice', 'thai food') for searching for a stock photo of the food.
3.  If your confidence is below 0.7, provide up to three \`alternativeSuggestions\`.
4.  If the image does not contain food, set \`isFood\` to false, \`classification\` to "Not a food item", and leave \`foodDetails\` and \`alternativeSuggestions\` empty.

Photo: {{media url=photoDataUri}}
  `,
});

const classifyFoodFlow = ai.defineFlow(
  {
    name: 'classifyFoodFlow',
    inputSchema: ClassifyFoodInputSchema,
    outputSchema: ClassifyFoodOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
