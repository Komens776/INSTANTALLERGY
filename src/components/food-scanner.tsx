
"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertTriangle, Info, Loader2, Shield, Sparkles, X, Upload, Scan, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

import { classifyFood, ClassifyFoodOutput } from "@/ai/flows/classify-food";
import { detectAllergensAndGenerateAlert, DetectAllergensOutput } from "@/ai/flows/detect-allergens";
import { extractTextFromImage } from "@/ai/flows/extract-text-from-image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CameraView } from "./camera-view";

const formSchema = z.object({
  image: z.instanceof(File).optional().refine(file => file === undefined || file.size > 0, "Image is required"),
});

type AllergenResult = DetectAllergensOutput;

export function FoodScanner() {
  const [preview, setPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analyze-food");
  
  const [classificationResult, setClassificationResult] = useState<ClassifyFoodOutput | null>(null);
  const [allergenResult, setAllergenResult] = useState<AllergenResult | null>(null);
  const [isClassifyLoading, setIsClassifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyError, setIsApiKeyError] = useState(false);

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [ocrAllergenResult, setOcrAllergenResult] = useState<AllergenResult | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { allergens: userAllergens, addScanToHistory } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: undefined
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        form.setValue("image", file, { shouldValidate: true });
        resetResults();
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCapture = (dataUri: string) => {
    setPreview(dataUri);
    fetch(dataUri)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        form.setValue("image", file, { shouldValidate: true });
        resetResults();
      });
    setIsCameraOpen(false);
  };

  const openCamera = () => {
    resetState();
    setIsCameraOpen(true);
  };
  
  const resetState = () => {
    form.reset();
    setPreview(null);
    resetResults();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsCameraOpen(false);
  }

  const resetResults = () => {
    setClassificationResult(null);
    setAllergenResult(null);
    setError(null);
    setIsApiKeyError(false);
    setExtractedText(null);
    setOcrAllergenResult(null);
  }
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if(!preview) {
      setError("Please select an image first.");
      return;
    }
    setIsClassifyLoading(true);
    resetResults();

    let finalAllergenResult: AllergenResult | null = null;
    let finalClassificationResult: ClassifyFoodOutput | null = null;

    try {
      const cfOutput = await classifyFood({ photoDataUri: preview });
      setClassificationResult(cfOutput);
      finalClassificationResult = cfOutput;

      if (cfOutput.isFood && cfOutput.foodDetails) {
        const daOutput = await detectAllergensAndGenerateAlert({
          ingredients: cfOutput.foodDetails.ingredients.join(', '),
          allergens: userAllergens,
        });
        setAllergenResult(daOutput);
        finalAllergenResult = daOutput;
      }
    } catch (e: any) {
      console.error(e);
      if (e.message && (e.message.includes('403') || e.message.includes('CONSUMER_SUSPENDED') || e.message.includes('permission denied'))) {
        setIsApiKeyError(true);
        setError("The AI API key has expired or been suspended.");
      } else {
        setError("An error occurred during analysis. Please try again.");
      }
    } finally {
      setIsClassifyLoading(false);
      if (finalClassificationResult) {
        addScanToHistory({
          classification: finalClassificationResult.classification,
          allergenResult: finalAllergenResult,
          imageUri: preview,
          timestamp: Date.now()
        });
      }
    }
  };

  const handleScanLabel = async () => {
    if (!preview) {
        setError("Please select an image first.");
        return;
    }

    setIsOcrLoading(true);
    resetResults();

    let finalOcrResult: AllergenResult | null = null;
    let finalExtractedText = "";

    try {
        const { extractedText: text } = await extractTextFromImage({ photoDataUri: preview });
        setExtractedText(text);
        finalExtractedText = text;

        if (text) {
            const daOutput = await detectAllergensAndGenerateAlert({
                ingredients: text,
                allergens: userAllergens,
            });
            setOcrAllergenResult(daOutput);
            finalOcrResult = daOutput;
        }
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes('403') || e.message.includes('CONSUMER_SUSPENDED') || e.message.includes('permission denied'))) {
          setIsApiKeyError(true);
          setError("The AI API key has expired or been suspended.");
        } else {
          setError("An error occurred during label analysis.");
        }
    } finally {
        setIsOcrLoading(false);
        if (finalExtractedText) {
          addScanToHistory({
              classification: `Label Scan: ${finalExtractedText.substring(0, 30)}...`,
              allergenResult: finalOcrResult,
              imageUri: preview,
              timestamp: Date.now()
          })
        }
    }
  };
  
  const getAlertBadgeProps = (alertLevel?: 'HIGH' | 'MODERATE' | 'SAFE') => {
    switch(alertLevel) {
        case 'HIGH': 
            return { variant: 'destructive' as const, className: '', children: 'HIGH RISK' };
        case 'MODERATE': 
            return { variant: 'secondary' as const, className: 'border-yellow-500/50', children: 'MODERATE RISK' };
        case 'SAFE': 
            return { variant: 'default' as const, className: 'bg-chart-2 text-accent-foreground hover:bg-chart-2/90', children: 'SAFE' };
        default: 
            return { variant: 'outline' as const, className: '', children: 'UNKNOWN' };
    }
  }
  
  const classifyBadgeProps = allergenResult ? getAlertBadgeProps(allergenResult.alert) : getAlertBadgeProps();
  const ocrBadgeProps = ocrAllergenResult ? getAlertBadgeProps(ocrAllergenResult.alert) : getAlertBadgeProps();

  return (
    <Card className="w-full bg-white border border-zinc-100 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="space-y-1 pb-1 pt-6 px-6">
        <CardTitle className="text-2xl font-bold text-zinc-900 leading-tight font-sans">Food Scanner</CardTitle>
        <CardDescription className="text-sm text-zinc-500 font-normal mt-0.5">Analyze a dish or scan an ingredient label.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-6 px-6">
             <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                resetResults();
            }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 bg-zinc-100/80 p-1 rounded-lg">
                    <TabsTrigger value="analyze-food" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-zinc-200/40 rounded-md transition-all text-sm font-semibold text-zinc-500 flex items-center justify-center gap-2 cursor-pointer h-9">
                        <Sparkles className="h-4 w-4 text-zinc-600" /> Analyze Food
                    </TabsTrigger>
                    <TabsTrigger value="scan-label" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-zinc-200/40 rounded-md transition-all text-sm font-semibold text-zinc-500 flex items-center justify-center gap-2 cursor-pointer h-9">
                        <Scan className="h-4 w-4 text-zinc-600" /> Scan Label
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="w-full">
                      {preview ? (
                        <div className="relative group w-full h-80 bg-black/5 rounded-2xl border-2 border-primary/10 overflow-hidden shadow-inner">
                          <Image src={preview} alt="Food preview" fill className="object-contain p-4" />
                           <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full shadow-lg"
                            onClick={(e) => { e.stopPropagation(); resetState(); }}
                            disabled={isClassifyLoading || isOcrLoading}
                           >
                            <X className="h-5 w-5" />
                           </Button>
                        </div>
                      ) : isCameraOpen ? (
                        <CameraView 
                          onCapture={handleCapture}
                          onClose={() => setIsCameraOpen(false)}
                        />
                      ) : (
                        <div
                          className="relative group flex flex-col justify-center items-center w-full h-[320px] border-2 border-dashed border-emerald-500/40 rounded-xl cursor-pointer bg-white hover:bg-emerald-50/[0.04] transition-all duration-300 p-6"
                          onClick={() => !(isClassifyLoading || isOcrLoading) && fileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isClassifyLoading || isOcrLoading}
                          />
                          <div className="text-center space-y-4 flex flex-col items-center justify-center w-full">
                            <div className="mx-auto flex justify-center items-center">
                                <Upload className="h-14 w-14 text-emerald-500 stroke-[1.5]" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="font-bold text-lg text-emerald-500 leading-tight">Click to upload image</p>
                                <p className="text-emerald-500/80 font-normal text-sm">or drag and drop</p>
                            </div>
                            <div className="relative flex items-center py-2 w-48 justify-center">
                                <div className="flex-grow border-t border-zinc-100"></div>
                                <span className="flex-shrink mx-3 text-zinc-300 text-[11px] font-semibold tracking-wider">OR</span>
                                <div className="flex-grow border-t border-zinc-100"></div>
                            </div>
                            <Button type="button" variant="outline" className="h-10 px-8 border border-emerald-500/30 text-emerald-600 bg-white hover:bg-emerald-50/20 shadow-sm rounded-lg font-medium text-xs flex items-center justify-center gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); openCamera(); }} disabled={isClassifyLoading || isOcrLoading}>
                                Use Camera
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            
            {(isClassifyLoading || isOcrLoading) && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary/50 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary animate-pulse">
                    {activeTab === 'analyze-food' ? 'Consulting our AI Chef...' : 'Scanning Ingredients...'}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">This usually takes just a few seconds.</p>
                </div>
              </div>
            )}
            
            {error && (
                <Alert variant="destructive" className={cn("border-destructive/50 rounded-xl", isApiKeyError ? "bg-destructive/10" : "")}>
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="font-bold">{isApiKeyError ? "Action Required: API Key Error" : "Analysis Error"}</AlertTitle>
                    <AlertDescription className="mt-1 font-medium">
                      {isApiKeyError ? (
                        <div className="space-y-3">
                          <p>{error} You need to add your own personal API key to continue.</p>
                          <div className="bg-background/50 p-3 rounded-lg border border-destructive/20 text-xs font-mono space-y-1">
                            <p>1. Get key at aistudio.google.com</p>
                            <p>2. Add to .env file:</p>
                            <p className="font-bold">GOOGLE_API_KEY="YOUR_KEY"</p>
                          </div>
                        </div>
                      ) : error}
                    </AlertDescription>
                </Alert>
            )}

            {classificationResult && activeTab === 'analyze-food' && (
              <Card className="border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-primary leading-tight">{classificationResult.classification}</CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                                <span className="uppercase tracking-wider">AI Confidence</span>
                                <Progress value={classificationResult.confidence * 100} className="w-24 h-2 rounded-full" />
                                <span className="font-mono">{Math.round(classificationResult.confidence * 100)}%</span>
                            </div>
                        </div>
                        {allergenResult && (
                            <Badge 
                              variant={classifyBadgeProps.variant}
                              className={cn("text-sm px-4 py-1.5 rounded-full font-bold shadow-sm", classifyBadgeProps.className)}
                            >
                              {classifyBadgeProps.children}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {allergenResult && (
                    <Alert variant={allergenResult.allergenDetected ? 'destructive' : 'default'} className={cn("rounded-xl border-2", allergenResult.allergenDetected ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20")}>
                      <Shield className={cn("h-5 w-5", !allergenResult.allergenDetected && "text-green-600")} />
                      <AlertTitle className={cn("font-bold text-base", allergenResult.allergenDetected ? "" : "text-green-700")}>
                        {allergenResult.allergenDetected ? `Caution: Allergens Detected` : 'Allergen Safe'}
                      </AlertTitle>
                      <AlertDescription className="mt-1 text-sm font-bold">
                        {allergenResult.allergenDetected ? 
                          `This food likely contains: ${allergenResult.detectedAllergens.join(', ')}.` :
                          'No allergens from your profile were detected in this dish.'
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {classificationResult.isFood && classificationResult.foodDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary flex items-center gap-2 text-base uppercase tracking-wide">
                                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                Ingredients
                            </h4>
                            <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-muted font-medium">{classificationResult.foodDetails.ingredients.join(', ')}</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary flex items-center gap-2 text-base uppercase tracking-wide">
                                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                Nutrition
                            </h4>
                            <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-muted font-medium">{classificationResult.foodDetails.nutritionalData}</p>
                        </div>
                         <div className="md:col-span-2 space-y-2">
                            <h4 className="font-bold text-primary flex items-center gap-2 text-base uppercase tracking-wide">
                                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                Origin & History
                            </h4>
                            <div className="bg-muted/30 p-4 rounded-xl border border-muted/50">
                                <span className="font-bold text-primary block mb-2">{classificationResult.foodDetails.region}</span>
                                <p className="text-muted-foreground leading-relaxed italic font-medium">"{classificationResult.foodDetails.history}"</p>
                            </div>
                        </div>
                    </div>
                  ) : (
                    !isClassifyLoading && <Alert className="bg-muted rounded-xl">
                      <Info className="h-5 w-5" />
                      <AlertTitle className="font-bold">Partial Results</AlertTitle>
                      <AlertDescription className="font-medium">
                        {classificationResult.isFood ? "We identified the food but couldn't retrieve full details." : "This doesn't look like a known food item."}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {classificationResult.alternativeSuggestions.length > 0 && (
                    <div className="pt-6 border-t border-dashed border-muted">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Possible Alternatives</h4>
                        <div className="flex flex-wrap gap-2">
                        {classificationResult.alternativeSuggestions.map(alt => (
                            <Badge key={alt} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full font-bold">{alt}</Badge>
                        ))}
                        </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {extractedText !== null && activeTab === 'scan-label' && (
              <Card className="border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-2xl font-bold text-primary leading-tight">Label Analysis</CardTitle>
                      {ocrAllergenResult && (
                          <Badge 
                            variant={ocrBadgeProps.variant}
                            className={cn("text-sm px-4 py-1.5 rounded-full font-bold shadow-sm", ocrBadgeProps.className)}
                          >
                            {ocrBadgeProps.children}
                          </Badge>
                      )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {ocrAllergenResult && (
                    <Alert variant={ocrAllergenResult.allergenDetected ? 'destructive' : 'default'} className={cn("rounded-xl border-2", ocrAllergenResult.allergenDetected ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20")}>
                      <Shield className={cn("h-5 w-5", !ocrAllergenResult.allergenDetected && "text-green-600")} />
                      <AlertTitle className={cn("font-bold text-base", ocrAllergenResult.allergenDetected ? "" : "text-green-700")}>
                        {ocrAllergenResult.allergenDetected ? `Warning: Allergens Detected` : 'Label Safe'}
                      </AlertTitle>
                      <AlertDescription className="mt-1 text-sm font-bold">
                        {ocrAllergenResult.allergenDetected ? 
                          `Detected ingredients of concern: ${ocrAllergenResult.detectedAllergens.join(', ')}.` :
                          'We checked the scanned text and found no allergens from your profile.'
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                      <h4 className="text-sm font-bold text-primary uppercase tracking-widest">Extracted Text</h4>
                      <div className="rounded-2xl overflow-hidden border border-primary/5">
                        <Textarea readOnly value={extractedText} rows={8} className="text-xs bg-muted/[0.15] border-none resize-none focus-visible:ring-0 font-mono p-4" />
                      </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </CardContent>
          <CardFooter className="pt-2 pb-6 px-6">
            {activeTab === 'analyze-food' ? (
                <Button 
                  type="submit" 
                  disabled={isClassifyLoading || !preview} 
                  className="w-full h-12 text-sm font-semibold tracking-wide shadow-sm rounded-xl transition-all duration-200 bg-[#a7f3d0] hover:bg-emerald-300 text-emerald-900 border-none disabled:bg-[#a7f3d0]/65 disabled:text-emerald-950/65 cursor-pointer flex items-center justify-center gap-2"
                >
                {isClassifyLoading ? (
                    <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-900" />
                    Analyzing Dish...
                    </>
                ) : (
                  "Analyze Food"
                )}
                </Button>
            ) : (
                <Button 
                  type="button" 
                  onClick={handleScanLabel} 
                  disabled={isOcrLoading || !preview} 
                  className="w-full h-12 text-sm font-semibold tracking-wide shadow-sm rounded-xl transition-all duration-200 bg-[#a7f3d0] hover:bg-emerald-300 text-emerald-900 border-none disabled:bg-[#a7f3d0]/65 disabled:text-emerald-950/65 cursor-pointer flex items-center justify-center gap-2"
                >
                {isOcrLoading ? (
                    <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-900" />
                    Scanning Label...
                    </>
                ) : (
                  "Scan Label"
                )}
                </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
