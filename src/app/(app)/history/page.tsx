
"use client";

import React from "react";
import Image from "next/image";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { History, Info } from "lucide-react";

export default function HistoryPage() {
  const { scanHistory } = useUser();

  const getAlertBadgeProps = (alertLevel?: 'HIGH' | 'MODERATE' | 'SAFE' | null) => {
    switch (alertLevel) {
      case 'HIGH':
        return { variant: 'destructive' as const, className: '', children: 'HIGH RISK' };
      case 'MODERATE':
        return { variant: 'secondary' as const, className: 'border-yellow-500/50', children: 'MODERATE RISK' };
      case 'SAFE':
        return { variant: 'default' as const, className: 'bg-chart-2 text-accent-foreground hover:bg-chart-2/90', children: 'SAFE' };
      default:
        return { variant: 'outline' as const, className: '', children: 'NOT FOOD' };
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
        <p className="text-muted-foreground">
          View your previously scanned food items and their results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Recent Scans</CardTitle>
          <CardDescription>
            Here are the latest items you've analyzed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanHistory.length > 0 ? (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {scanHistory.map((item) => (
                  <Card key={item.timestamp} className="flex flex-col md:flex-row items-start gap-4 p-4">
                    <div className="relative w-full md:w-32 h-32 flex-shrink-0">
                      <Image
                        src={item.imageUri}
                        alt={item.classification}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md border"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold">{item.classification}</h3>
                          <Badge {...getAlertBadgeProps(item.allergenResult?.alert)} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(item.timestamp), "PPP p")}
                      </p>
                      {item.allergenResult?.allergenDetected ? (
                          <p className="text-sm text-destructive font-medium">
                              Detected: {item.allergenResult.detectedAllergens.join(', ')}
                          </p>
                      ) : (
                          item.allergenResult && <p className="text-sm text-green-600 font-medium">No allergens detected.</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Alert className="text-center">
              <History className="h-4 w-4" />
              <AlertTitle>No History Yet</AlertTitle>
              <AlertDescription>
                Your scanned items will appear here. Go to the Dashboard to start scanning!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
