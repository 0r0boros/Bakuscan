import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AttributeColors, Colors } from "@/constants/theme";
import { useScanHistory, ScanResult } from "@/hooks/useScanHistory";
import { analyzeBakugan, BakuganAnalysis } from "@/lib/bakugan-api";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "ScanResult">;

function AttributeBadge({ attribute }: { attribute: string }) {
  const color = AttributeColors[attribute.toLowerCase() as keyof typeof AttributeColors] || "#6C757D";
  
  return (
    <View style={[styles.attributeBadge, { backgroundColor: color }]}>
      <ThemedText style={styles.attributeText} lightColor="#FFF" darkColor="#FFF">
        {attribute}
      </ThemedText>
    </View>
  );
}

function InfoCard({ 
  title, 
  icon, 
  children 
}: { 
  title: string; 
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  
  return (
    <Card style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={[styles.infoIcon, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
        <ThemedText type="h4">{title}</ThemedText>
      </View>
      {children}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="body">{value}</ThemedText>
    </View>
  );
}

export default function ScanResultScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { addToHistory, findByImageUri } = useScanHistory();
  
  const [analysis, setAnalysis] = useState<BakuganAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { imageUri } = route.params;

  useEffect(() => {
    const existingScan = findByImageUri(imageUri);
    if (existingScan) {
      setAnalysis({
        name: existingScan.name,
        series: existingScan.series,
        attribute: existingScan.attribute,
        gPower: existingScan.gPower,
        releaseYear: existingScan.releaseYear,
        rarity: existingScan.rarity,
        specialFeatures: existingScan.specialFeatures,
        estimatedValue: existingScan.estimatedValue,
        confidence: existingScan.confidence,
      });
      setIsSaved(true);
      setIsLoading(false);
      return;
    }

    async function analyze() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await analyzeBakugan(imageUri);
        setAnalysis(result);
        
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze image");
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    analyze();
  }, [imageUri]);

  const handleSave = async () => {
    if (!analysis) return;
    
    await addToHistory({
      imageUri,
      ...analysis,
    });
    setIsSaved(true);
    
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleShare = async () => {
    if (!analysis) return;
    
    try {
      await Share.share({
        message: `Check out my ${analysis.name}! Estimated value: $${analysis.estimatedValue.low} - $${analysis.estimatedValue.high}. Scanned with BakuScan.`,
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleImagePress = () => {
    navigation.navigate("ImagePreview", { imageUri, title: analysis?.name });
  };

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeBakugan(imageUri);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="h4" style={styles.loadingText}>
            Analyzing Bakugan...
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This may take a few seconds
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="alert-circle" size={48} color={theme.error} />
          </View>
          <ThemedText type="h3" style={styles.errorTitle}>
            Analysis Failed
          </ThemedText>
          <ThemedText type="body" style={[styles.errorText, { color: theme.textSecondary }]}>
            {error}
          </ThemedText>
          <Button onPress={handleRetry} style={styles.retryButton}>
            Try Again
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (!analysis) return null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Pressable onPress={handleImagePress}>
          <Image
            source={{ uri: imageUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Feather name="maximize-2" size={20} color="#FFF" />
          </View>
        </Pressable>

        <View style={styles.titleSection}>
          <ThemedText type="h2">{analysis.name}</ThemedText>
          <View style={styles.badgeRow}>
            <AttributeBadge attribute={analysis.attribute} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {analysis.series}
            </ThemedText>
          </View>
        </View>

        <InfoCard title="Valuation" icon="dollar-sign">
          <View style={styles.valueContainer}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              ${analysis.estimatedValue.low} - ${analysis.estimatedValue.high}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Based on recent sales data
            </ThemedText>
          </View>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${analysis.confidence * 100}%`,
                  backgroundColor: theme.primary,
                }
              ]} 
            />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {Math.round(analysis.confidence * 100)}% confidence
          </ThemedText>
        </InfoCard>

        <InfoCard title="Details" icon="info">
          <InfoRow label="G-Power" value={`${analysis.gPower}G`} />
          <InfoRow label="Release Year" value={analysis.releaseYear} />
          <InfoRow label="Rarity" value={analysis.rarity} />
          {analysis.specialFeatures.length > 0 ? (
            <InfoRow label="Special Features" value={analysis.specialFeatures.join(", ")} />
          ) : null}
        </InfoCard>

        <View style={styles.actionButtons}>
          {!isSaved ? (
            <Button onPress={handleSave} style={styles.saveButton}>
              Save to Collection
            </Button>
          ) : (
            <View style={[styles.savedBadge, { backgroundColor: theme.success }]}>
              <Feather name="check" size={18} color="#FFF" />
              <ThemedText style={styles.savedText} lightColor="#FFF" darkColor="#FFF">
                Saved to Collection
              </ThemedText>
            </View>
          )}
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareButton,
              { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="share-2" size={20} color={theme.text} />
            <ThemedText type="body">Share</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  loadingText: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  errorText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  retryButton: {
    width: "100%",
  },
  heroImage: {
    width: "100%",
    height: 280,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#E6E6E6",
  },
  imageOverlay: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    marginVertical: Spacing.xl,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  attributeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  attributeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  valueContainer: {
    marginBottom: Spacing.md,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: "#E6E6E6",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  saveButton: {
    width: "100%",
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
  },
  savedText: {
    fontWeight: "600",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
