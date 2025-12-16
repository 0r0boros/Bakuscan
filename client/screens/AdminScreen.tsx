import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface CatalogEntry {
  id: string;
  name: string;
  series: string;
  generation: string;
  type: string;
  referenceCount: number;
  description: string | null;
}

interface ReferenceImage {
  id: string;
  bakuganId: string;
  imageData: string;
  angle: string;
  lighting: string;
  source: string;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: catalogData, isLoading: catalogLoading } = useQuery<{ catalog: CatalogEntry[] }>({
    queryKey: ["/api/admin/catalog"],
  });

  const { data: entryData, isLoading: entryLoading } = useQuery<{ 
    entry: CatalogEntry; 
    images: ReferenceImage[] 
  }>({
    queryKey: ["/api/admin/catalog", selectedEntry?.id],
    enabled: !!selectedEntry?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { bakuganId: string; imageData: string; angle: string }) => {
      return apiRequest("POST", "/api/admin/reference-images", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/catalog"] });
      if (selectedEntry) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/catalog", selectedEntry.id] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("DELETE", `/api/admin/reference-images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/catalog"] });
      if (selectedEntry) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/catalog", selectedEntry.id] });
      }
    },
  });

  const generateEmbeddingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/generate-embeddings");
    },
  });

  const filteredCatalog = catalogData?.catalog?.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.series.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePickImage = useCallback(async () => {
    if (!selectedEntry) {
      Alert.alert("Select Entry", "Please select a Bakugan from the catalog first.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const base64 = asset.base64 || "";

      await uploadMutation.mutateAsync({
        bakuganId: selectedEntry.id,
        imageData: base64,
        angle: "front",
      });

      Alert.alert("Success", "Reference image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [selectedEntry, uploadMutation]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (Platform.OS === "web") {
      if (!confirm("Delete this reference image?")) return;
      deleteMutation.mutate(imageId);
    } else {
      Alert.alert(
        "Delete Image",
        "Are you sure you want to delete this reference image?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: () => deleteMutation.mutate(imageId),
          },
        ]
      );
    }
  }, [deleteMutation]);

  const handleGenerateEmbeddings = useCallback(async () => {
    try {
      const result = await generateEmbeddingsMutation.mutateAsync();
      Alert.alert("Embeddings", (result as any).message || "Embeddings generated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to generate embeddings");
    }
  }, [generateEmbeddingsMutation]);

  const renderCatalogItem = ({ item }: { item: CatalogEntry }) => (
    <Pressable
      style={[
        styles.catalogItem,
        { 
          backgroundColor: selectedEntry?.id === item.id 
            ? theme.primary + "20" 
            : theme.backgroundSecondary,
          borderColor: selectedEntry?.id === item.id 
            ? theme.primary 
            : theme.border,
        },
      ]}
      onPress={() => setSelectedEntry(item)}
    >
      <View style={styles.catalogItemContent}>
        <ThemedText style={styles.catalogName}>{item.name}</ThemedText>
        <ThemedText style={[styles.catalogSeries, { color: theme.textSecondary }]}>
          {item.series} - {item.type}
        </ThemedText>
      </View>
      <View style={[styles.refCountBadge, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.refCountText}>{item.referenceCount}</ThemedText>
      </View>
    </Pressable>
  );

  const renderReferenceImage = ({ item }: { item: ReferenceImage }) => (
    <View style={styles.refImageContainer}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${item.imageData}` }}
        style={styles.refImage}
        contentFit="cover"
      />
      <Pressable
        style={[styles.deleteButton, { backgroundColor: theme.error }]}
        onPress={() => handleDeleteImage(item.id)}
      >
        <Feather name="trash-2" size={16} color="#fff" />
      </Pressable>
      <View style={[styles.imageLabel, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText style={styles.imageLabelText}>{item.angle}</ThemedText>
      </View>
    </View>
  );

  if (catalogLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading catalog...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Reference Image Manager</ThemedText>
        <Pressable
          style={[styles.generateButton, { backgroundColor: theme.primary }]}
          onPress={handleGenerateEmbeddings}
          disabled={generateEmbeddingsMutation.isPending}
        >
          {generateEmbeddingsMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="cpu" size={16} color="#fff" />
              <ThemedText style={styles.generateButtonText}>Generate Embeddings</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search Bakugan..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.catalogPanel}>
          <ThemedText style={styles.panelTitle}>
            Catalog ({filteredCatalog.length})
          </ThemedText>
          <FlatList
            data={filteredCatalog}
            renderItem={renderCatalogItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.catalogList}
          />
        </View>

        <View style={styles.detailPanel}>
          {selectedEntry ? (
            <>
              <View style={styles.detailHeader}>
                <View>
                  <ThemedText style={styles.detailName}>{selectedEntry.name}</ThemedText>
                  <ThemedText style={[styles.detailSeries, { color: theme.textSecondary }]}>
                    {selectedEntry.series} - {selectedEntry.generation}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.uploadButton, { backgroundColor: theme.primary }]}
                  onPress={handlePickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="upload" size={18} color="#fff" />
                      <ThemedText style={styles.uploadButtonText}>Upload Image</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>

              {selectedEntry.description ? (
                <Card style={styles.descriptionCard}>
                  <ThemedText style={[styles.descriptionText, { color: theme.textSecondary }]}>
                    {selectedEntry.description}
                  </ThemedText>
                </Card>
              ) : null}

              <ThemedText style={styles.panelTitle}>
                Reference Images ({entryData?.images?.length || 0})
              </ThemedText>

              {entryLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : entryData?.images?.length ? (
                <FlatList
                  data={entryData.images}
                  renderItem={renderReferenceImage}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.imageGrid}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="image" size={48} color={theme.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No reference images yet
                  </ThemedText>
                  <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    Upload images to improve identification accuracy
                  </ThemedText>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="arrow-left" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Select a Bakugan
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Choose from the catalog to manage reference images
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: "700",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Typography.small.fontSize,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.body.fontSize,
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  catalogPanel: {
    width: "35%",
    borderRightWidth: 1,
    borderRightColor: "rgba(128, 128, 128, 0.2)",
    paddingHorizontal: Spacing.md,
  },
  panelTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  catalogList: {
    paddingBottom: Spacing.xl,
  },
  catalogItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  catalogItemContent: {
    flex: 1,
  },
  catalogName: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  catalogSeries: {
    fontSize: Typography.label.fontSize,
  },
  refCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  refCountText: {
    color: "#fff",
    fontSize: Typography.label.fontSize,
    fontWeight: "600",
  },
  detailPanel: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  detailName: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
  },
  detailSeries: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Typography.small.fontSize,
  },
  descriptionCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
  },
  imageGrid: {
    paddingBottom: Spacing.xl,
  },
  refImageContainer: {
    width: "31%",
    aspectRatio: 1,
    margin: "1%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  refImage: {
    width: "100%",
    height: "100%",
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageLabelText: {
    fontSize: Typography.label.fontSize,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
