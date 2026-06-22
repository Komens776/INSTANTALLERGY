"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { COMMON_ALLERGENS } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";

const profileFormSchema = z.object({
  commonAllergens: z.array(z.string()),
  customAllergens: z.array(z.object({ value: z.string().min(1, "Cannot be empty") })),
});

export default function ProfilePage() {
  const { allergens, updateAllergens } = useUser();
  const { toast } = useToast();
  const [customInput, setCustomInput] = useState("");

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      commonAllergens: [],
      customAllergens: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customAllergens"
  });

  useEffect(() => {
    if (allergens) {
      form.reset({
        commonAllergens: allergens.filter(a => COMMON_ALLERGENS.includes(a)),
        customAllergens: allergens
          .filter(a => !COMMON_ALLERGENS.includes(a))
          .map(a => ({ value: a })),
      });
    }
  }, [allergens, form.reset]);

  const handleAddCustom = () => {
    const currentValues = form.getValues();
    const allCurrentAllergens = [
        ...currentValues.commonAllergens, 
        ...currentValues.customAllergens.map(a => a.value)
    ];
    if (customInput && !allCurrentAllergens.includes(customInput)) {
      append({ value: customInput });
      setCustomInput("");
    }
  }

  function onSubmit(data: z.infer<typeof profileFormSchema>) {
    const allSelected = [
        ...data.commonAllergens,
        ...data.customAllergens.map(a => a.value)
    ];
    updateAllergens(allSelected);
    toast({
      title: "Profile Updated",
      description: "Your allergy information has been saved.",
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Allergy Profile</h1>
        <p className="text-muted-foreground">
          Manage your allergies here. The app will check for these items when you scan food labels or analyze a dish.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Common Allergens</CardTitle>
                    <CardDescription>Select from this common list. The app will use your selections to warn you about potential risks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                    control={form.control}
                    name="commonAllergens"
                    render={() => (
                        <FormItem className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {COMMON_ALLERGENS.map((item) => (
                            <FormField
                            key={item}
                            control={form.control}
                            name="commonAllergens"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item
                                                )
                                            );
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    {item}
                                    </FormLabel>
                                </FormItem>
                                );
                            }}
                            />
                        ))}
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Custom Allergens</CardTitle>
                    <CardDescription>Add any other specific ingredients or substances you need to avoid.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                            control={form.control}
                            name={`customAllergens.${index}.value`}
                            render={({ field }) => (
                                <Input {...field} readOnly className="bg-muted" />
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                   ))}
                   <div className="flex items-center gap-2">
                    <Input 
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="e.g. Agushi"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddCustom}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                   </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">Save Profile</Button>
                </CardFooter>
            </Card>

        </form>
      </Form>
    </div>
  );
}
