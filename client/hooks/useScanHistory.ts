import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ScanResult {
  id: string;
  imageUri: string;
  name: string;
  series: string;
  attribute: string;
  gPower: number;
  releaseYear: string;
  rarity: string;
  specialFeatures: string[];
  estimatedValue: {
    low: number;
    high: number;
  };
  confidence: number;
  scannedAt: string;
}

const STORAGE_KEY = "@bakuscan/history";

export function useScanHistory() {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScanResult[];
        setHistory(parsed.sort((a, b) => 
          new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
        ));
      }
    } catch (error) {
      console.error("Failed to load scan history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (scan: Omit<ScanResult, "id" | "scannedAt">) => {
    const newScan: ScanResult = {
      ...scan,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scannedAt: new Date().toISOString(),
    };

    const updated = [newScan, ...history];
    setHistory(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save scan:", error);
    }

    return newScan;
  }, [history]);

  const removeFromHistory = useCallback(async (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to remove scan:", error);
    }
  }, [history]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }, []);

  const findByImageUri = useCallback((uri: string) => {
    return history.find((item) => item.imageUri === uri);
  }, [history]);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    await loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
    findByImageUri,
    refreshHistory,
  };
}
