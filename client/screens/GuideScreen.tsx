import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ConditionGuide {
  grade: string;
  title: string;
  valueImpact: string;
  description: string;
  checklist: string[];
}

const conditionGuides: ConditionGuide[] = [
  {
    grade: "M",
    title: "Mint",
    valueImpact: "100%",
    description: "Perfect condition with no visible wear. Appears as if it just came out of the package.",
    checklist: [
      "No scratches or scuffs",
      "Perfect paint application",
      "Mechanism works flawlessly",
      "All stickers intact and not peeling",
      "Original packaging if applicable",
    ],
  },
  {
    grade: "NM",
    title: "Near Mint",
    valueImpact: "85-95%",
    description: "Almost perfect with only minimal wear that requires close inspection to notice.",
    checklist: [
      "Minor surface wear only visible up close",
      "Paint is 95%+ intact",
      "Mechanism works perfectly",
      "Stickers may have minimal edge wear",
    ],
  },
  {
    grade: "EX",
    title: "Excellent",
    valueImpact: "70-85%",
    description: "Light wear evident but still presents very well. Great for display.",
    checklist: [
      "Light scratches or scuffs visible",
      "Paint is 85%+ intact",
      "Mechanism works correctly",
      "Some sticker wear acceptable",
    ],
  },
  {
    grade: "GD",
    title: "Good",
    valueImpact: "50-70%",
    description: "Moderate wear but all features are functional. Shows clear signs of play.",
    checklist: [
      "Noticeable scratches and wear",
      "Paint may have chips or fading",
      "Mechanism works but may stick slightly",
      "Stickers may be worn or partially missing",
    ],
  },
  {
    grade: "FR",
    title: "Fair",
    valueImpact: "30-50%",
    description: "Heavy wear with significant cosmetic issues. May have functional concerns.",
    checklist: [
      "Heavy scratches and scuffs",
      "Significant paint loss",
      "Mechanism may not work perfectly",
      "Stickers mostly missing or damaged",
    ],
  },
  {
    grade: "PR",
    title: "Poor",
    valueImpact: "10-30%",
    description: "Major damage or defects. Value is primarily for parts or as a placeholder.",
    checklist: [
      "Severe damage or missing parts",
      "Major paint loss or discoloration",
      "Mechanism may be broken",
      "Only for collectors completing sets",
    ],
  },
];

function AccordionItem({ guide, isExpanded, onToggle }: { 
  guide: ConditionGuide; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);
  
  React.useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded]);
  
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Card style={styles.accordionCard}>
      <Pressable onPress={onToggle} style={styles.accordionHeader}>
        <View style={styles.gradeContainer}>
          <View style={[styles.gradeBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.gradeText} lightColor="#FFF" darkColor="#FFF">
              {guide.grade}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="h4">{guide.title}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Value: {guide.valueImpact}
            </ThemedText>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={24} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>
      
      {isExpanded ? (
        <View style={styles.accordionContent}>
          <ThemedText type="body" style={styles.description}>
            {guide.description}
          </ThemedText>
          <ThemedText type="h4" style={styles.checklistTitle}>
            Checklist
          </ThemedText>
          {guide.checklist.map((item, index) => (
            <View key={index} style={styles.checklistItem}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText type="small" style={styles.checklistText}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + 80 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText type="body" style={[styles.intro, { color: theme.textSecondary }]}>
          Use this guide to accurately assess the condition of your Bakugan. 
          Condition significantly affects market value.
        </ThemedText>
        
        {conditionGuides.map((guide, index) => (
          <AccordionItem
            key={guide.grade}
            guide={guide}
            isExpanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  intro: {
    marginBottom: Spacing.xl,
  },
  accordionCard: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  gradeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  gradeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  accordionContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: 0,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  checklistTitle: {
    marginBottom: Spacing.sm,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  checklistText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
});
