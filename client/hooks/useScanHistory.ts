import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CorrectionInfo {
  name: string;
  attribute: string;
  gPower: string;
  treatment: string;
  correctedAt: string;
}

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
  correction?: CorrectionInfo;
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

    setHistory((prev) => {
      const updated = [newScan, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });

    return newScan;
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

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

  const updateScanCorrection = useCallback(async (
    imageUri: string,
    correction: { name: string; attribute: string; gPower: string; treatment: string }
  ) => {
    setHistory((prev) => {
      const updated = prev.map((item) => {
        if (item.imageUri === imageUri) {
          return {
            ...item,
            name: correction.name,
            attribute: correction.attribute,
            gPower: parseInt(correction.gPower) || item.gPower,
            correction: {
              ...correction,
              correctedAt: new Date().toISOString(),
            },
          };
        }
        return item;
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
    findByImageUri,
    refreshHistory,
    updateScanCorrection,
  };
}
