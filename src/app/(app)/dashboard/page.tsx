
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FoodScanner } from "@/components/food-scanner";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useUser();
  const displayName = user?.name || "Kennethopokumensah181";

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-xl">
      <div className="mb-6 space-y-1">
        <h1 className="text-[28px] font-bold tracking-tight text-zinc-900 leading-[1.2]">
          Welcome, <br />
          <span className="font-extrabold">{displayName}!</span>
        </h1>
        <p className="text-zinc-500 text-[15px] font-normal">
          Scan a food item to check for allergens and view details.
        </p>
      </div>

      <FoodScanner />
    </div>
  );
}
