import { getApiUrl, apiRequest } from "@/lib/query-client";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export interface EbayRecentSale {
  title: string;
  price: number;
  soldDate: string;
}

export interface EbayData {
  available: boolean;
  average?: number;
  recentSales?: EbayRecentSale[];
  source: string;
}

export interface BakuganAnalysis {
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
  ebayData?: EbayData;
}

export interface CorrectionHint {
  originalName: string;
  correctedName: string;
  count: number;
}

export interface AnalyzeOptions {
  corrections?: CorrectionHint[];
}

export async function analyzeBakugan(
  imageUri: string,
  options?: AnalyzeOptions
): Promise<BakuganAnalysis> {
  try {
    let base64Image: string;

    if (Platform.OS === "web") {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const response = await apiRequest("POST", "/api/analyze", {
      image: base64Image,
      corrections: options?.corrections,
    });

    const result = await response.json();
    return result as BakuganAnalysis;
  } catch (error) {
    console.error("Failed to analyze Bakugan:", error);
    throw new Error("Unable to identify this Bakugan. Please try again with a clearer image.");
  }
}
