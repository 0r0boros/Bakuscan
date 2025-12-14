import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AttributeColors } from "@/constants/theme";
import { useScanHistory, ScanResult } from "@/hooks/useScanHistory";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

function HistoryCard({ item, onPress }: { item: ScanResult; onPress: () => void }) {
  const { theme } = useTheme();
  
  return (
    <Card style={styles.historyCard} onPress={onPress}>
      <View style={styles.cardContent}>
        <Image
          source={{ uri: item.imageUri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.cardInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <View style={styles.cardMeta}>
            <AttributeBadge attribute={item.attribute} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {item.series}
            </ThemedText>
          </View>
          <View style={styles.valueRow}>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              ${item.estimatedValue.low} - ${item.estimatedValue.high}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {new Date(item.scannedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
    </Card>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="camera" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Bakugans Scanned Yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Tap the scan button below to identify and value your first Bakugan
      </ThemedText>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { history, refreshHistory, isLoading } = useScanHistory();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  }, [refreshHistory]);

  const handleItemPress = (item: ScanResult) => {
    navigation.navigate("ScanResult", { imageUri: item.imageUri });
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + 80 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryCard item={item} onPress={() => handleItemPress(item)} />
        )}
        ListEmptyComponent={!isLoading ? EmptyState : null}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      />
    </ThemedView>
  );
}

export function HistoryHeaderTitle() {
  return <HeaderTitle title="My Collection" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  historyCard: {
    padding: Spacing.md,
  },
  cardContent: {
    flexDirection: "row",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#E6E6E6",
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "space-between",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  attributeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  attributeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
});
