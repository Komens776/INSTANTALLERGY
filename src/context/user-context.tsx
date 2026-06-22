"use client";

import React, { createContext, useState, ReactNode, useCallback } from "react";
import { COMMON_ALLERGENS } from "@/lib/data";
import type { DetectAllergensOutput } from "@/ai/flows/detect-allergens";

interface User {
  name: string;
  email: string;
}

export interface ScanHistoryItem {
  classification: string;
  allergenResult: DetectAllergensOutput | null;
  imageUri: string;
  timestamp: number;
}

interface UserContextType {
  isAuthenticated: boolean;
  user: User | null;
  allergens: string[];
  scanHistory: ScanHistoryItem[];
  login: (email: string, name: string) => void;
  logout: () => void;
  updateAllergens: (newAllergens: string[]) => void;
  addCustomAllergen: (allergen: string) => void;
  addScanToHistory: (item: ScanHistoryItem) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [allergens, setAllergens] = useState<string[]>([]); // Initialize empty so it's not "mocked"
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  const login = useCallback((email: string, name: string) => {
    setUser({ email, name });
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setScanHistory([]);
    setAllergens([]);
  }, []);

  const updateAllergens = useCallback((newAllergens: string[]) => {
    setAllergens(newAllergens);
  }, []);

  const addCustomAllergen = useCallback((allergen: string) => {
    if (allergen && !allergens.includes(allergen)) {
      setAllergens(prev => [...prev, allergen]);
    }
  }, [allergens]);
  
  const addScanToHistory = useCallback((item: ScanHistoryItem) => {
    setScanHistory(prev => [item, ...prev]);
  }, []);

  return (
    <UserContext.Provider
      value={{
        isAuthenticated,
        user,
        allergens,
        scanHistory,
        login,
        logout,
        updateAllergens,
        addCustomAllergen,
        addScanToHistory,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
