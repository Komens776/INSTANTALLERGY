import { config } from 'dotenv';
config();

import '@/ai/flows/classify-food.ts';
import '@/ai/flows/detect-allergens.ts';
import '@/ai/flows/recommend-safe-foods.ts';
import '@/ai/flows/extract-text-from-image.ts';
import '@/ai/flows/generate-food-image.ts';
