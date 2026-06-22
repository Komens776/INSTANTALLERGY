"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Loader2, Sparkles, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { recommendSafeFoods, RecommendedFood } from "@/ai/flows/recommend-safe-foods";
import { generateFoodImage } from "@/ai/flows/generate-food-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EnrichedRecommendation = RecommendedFood & {
  imageUrl: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[] | null>(null);
  const [overallReasoning, setOverallReasoning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cuisine, setCuisine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { allergens } = useUser();

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setRecommendations(null);
    setOverallReasoning(null);
    setError(null);

    try {
      const result = await recommendSafeFoods({
        allergyProfile: {
          allergens: allergens,
          dietaryPreferences: "None specified",
        },
        nutritionGoals: "General healthy eating",
        cuisinePreference: cuisine || 'any',
      });
      
      const enrichedRecs = await Promise.all(
        result.recommendations.map(async (rec) => {
          try {
            const { imageDataUri } = await generateFoodImage({ foodName: `${rec.name}, ${rec.dataAiHint}` });
            return { ...rec, imageUrl: imageDataUri };
          } catch (e) {
            console.error(`Failed to generate image for ${rec.name}`, e);
            return { ...rec, imageUrl: `https://placehold.co/600x400.png?text=${encodeURIComponent(rec.name)}` };
          }
        })
      );

      setRecommendations(enrichedRecs);
      setOverallReasoning(result.overallReasoning);

    } catch (err: any) {
      console.error("Failed to get recommendations:", err);
      if (err.message && (err.message.includes('403') || err.message.includes('CONSUMER_SUSPENDED') || err.message.includes('permission denied'))) {
         setError("The default AI API key has expired or been suspended. Please add your own free Google AI API key to the .env file as instructed in the README.md.");
      } else {
        setError("Could not fetch recommendations. Please check your internet connection and try again.");
      }
      toast({
        title: "Error",
        description: "Could not fetch recommendations. Please see the alert above.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Food Recommendations</h1>
        <p className="text-muted-foreground">
          Discover safe and delicious foods tailored to your profile.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Get Personalized Suggestions</CardTitle>
          <CardDescription>
            {allergens.length > 0 
              ? "Based on your current allergy profile, we'll suggest safe options." 
              : "Discover healthy and delicious food suggestions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm p-2 bg-muted rounded-md border">
            <span className="font-semibold">Current Allergens:</span> {allergens.length > 0 ? allergens.join(", ") : "None specified (general mode)"}
          </div>
           <div className="space-y-2">
            <Label htmlFor="cuisine">Preferred Cuisine (optional)</Label>
            <Input 
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="e.g., Ghanaian, Italian, Spicy"
              disabled={isLoading}
            />
           </div>
          <Button onClick={handleGetRecommendations} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Recommend Foods
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-8 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required: API Key Error</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{error}</p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold">Google AI Studio</a> and get a free key.</li>
              <li>Create a file named <code>.env</code> in your project folder.</li>
              <li>Add: <code>GOOGLE_API_KEY="YOUR_KEY_HERE"</code></li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recommended For You</CardTitle>
              <CardDescription>Here are some food items that fit your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((food) => (
                    <Card key={food.name} className="overflow-hidden group flex flex-col h-full">
                      <div className="relative h-48 w-full bg-muted">
                        <Image
                          src={food.imageUrl}
                          alt={food.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          data-ai-hint={food.dataAiHint}
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-xl">{food.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-2">
                          <p className="text-sm text-muted-foreground">{food.description}</p>
                          <p className="text-sm border-t pt-2 mt-2 italic"><span className="font-semibold not-italic">Why this:</span> {food.reasoning}</p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {overallReasoning && (
             <Alert className="bg-primary/5 border-primary/20">
                <Lightbulb className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">Chef's Note</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                    {overallReasoning}
                </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
