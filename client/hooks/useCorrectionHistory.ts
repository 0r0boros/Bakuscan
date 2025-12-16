import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CorrectionData {
  name: string;
  attribute: string;
  gPower: string;
  treatment: string;
}

export interface CorrectionEntry {
  scanId: string;
  imageUri: string;
  originalName: string;
  correctedData: CorrectionData;
  timestamp: string;
}

export interface CorrectionStats {
  [originalName: string]: {
    [correctedName: string]: number;
  };
}

export interface CorrectionSummaryItem {
  originalName: string;
  correctedName: string;
  count: number;
}

export interface CorrectionSummary {
  corrections: CorrectionSummaryItem[];
  totalCorrections: number;
}

const CORRECTIONS_KEY = "@bakuscan/corrections";
const STATS_KEY = "@bakuscan/correction_stats";

export function useCorrectionHistory() {
  const [corrections, setCorrections] = useState<CorrectionEntry[]>([]);
  const [stats, setStats] = useState<CorrectionStats>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [correctionsData, statsData] = await Promise.all([
        AsyncStorage.getItem(CORRECTIONS_KEY),
        AsyncStorage.getItem(STATS_KEY),
      ]);

      if (correctionsData) {
        setCorrections(JSON.parse(correctionsData));
      }
      if (statsData) {
        setStats(JSON.parse(statsData));
      }
    } catch (error) {
      console.error("Failed to load correction data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addCorrection = useCallback(async (
    scanId: string,
    imageUri: string,
    originalName: string,
    correctedData: CorrectionData
  ) => {
    const newCorrection: CorrectionEntry = {
      scanId,
      imageUri,
      originalName,
      correctedData,
      timestamp: new Date().toISOString(),
    };

    const updatedCorrections = [...corrections, newCorrection];
    setCorrections(updatedCorrections);

    const updatedStats = { ...stats };
    if (!updatedStats[originalName]) {
      updatedStats[originalName] = {};
    }
    const correctedName = correctedData.name;
    updatedStats[originalName][correctedName] = (updatedStats[originalName][correctedName] || 0) + 1;
    setStats(updatedStats);

    try {
      await Promise.all([
        AsyncStorage.setItem(CORRECTIONS_KEY, JSON.stringify(updatedCorrections)),
        AsyncStorage.setItem(STATS_KEY, JSON.stringify(updatedStats)),
      ]);
    } catch (error) {
      console.error("Failed to save correction:", error);
    }

    return newCorrection;
  }, [corrections, stats]);

  const getCorrectionForScan = useCallback((scanId: string) => {
    return corrections.find(c => c.scanId === scanId);
  }, [corrections]);

  const getSuggestedCorrection = useCallback((originalName: string): string | null => {
    const nameStats = stats[originalName];
    if (!nameStats) return null;

    let maxCount = 0;
    let suggestedName: string | null = null;

    for (const [name, count] of Object.entries(nameStats)) {
      if (count > maxCount && count >= 2) {
        maxCount = count;
        suggestedName = name;
      }
    }

    return suggestedName;
  }, [stats]);

  const clearAllCorrections = useCallback(async () => {
    setCorrections([]);
    setStats({});
    try {
      await Promise.all([
        AsyncStorage.removeItem(CORRECTIONS_KEY),
        AsyncStorage.removeItem(STATS_KEY),
      ]);
    } catch (error) {
      console.error("Failed to clear corrections:", error);
    }
  }, []);

  const getCorrectionSummary = useCallback((maxItems: number = 10): CorrectionSummary => {
    const items: CorrectionSummaryItem[] = [];
    
    for (const [originalName, correctedNames] of Object.entries(stats)) {
      for (const [correctedName, count] of Object.entries(correctedNames)) {
        if (originalName !== correctedName && count >= 1) {
          items.push({ originalName, correctedName, count });
        }
      }
    }
    
    items.sort((a, b) => b.count - a.count);
    
    return {
      corrections: items.slice(0, maxItems),
      totalCorrections: corrections.length,
    };
  }, [stats, corrections.length]);

  return {
    corrections,
    stats,
    isLoading,
    addCorrection,
    getCorrectionForScan,
    getSuggestedCorrection,
    clearAllCorrections,
    getCorrectionSummary,
  };
}
