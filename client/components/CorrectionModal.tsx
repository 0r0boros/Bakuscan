import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  BAKUGAN_NAMES,
  ATTRIBUTES,
  G_POWER_OPTIONS,
  TREATMENTS,
} from "@/lib/bakugan-catalog";
import type { CorrectionData } from "@/hooks/useCorrectionHistory";

interface CorrectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (correction: CorrectionData) => void;
  initialValues?: {
    name: string;
    attribute: string;
    gPower: string | number;
    treatment?: string;
  };
}

type PickerType = "name" | "attribute" | "gPower" | "treatment" | null;

function OptionPicker({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
}: {
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [options, searchQuery, searchable]);

  return (
    <View style={[styles.pickerContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.pickerHeader}>
        <ThemedText type="h4">{title}</ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>
      {searchable ? (
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={filteredOptions}
        keyExtractor={(item) => item}
        style={styles.optionsList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              onSelect(item);
              onClose();
            }}
            style={({ pressed }) => [
              styles.optionItem,
              { borderBottomColor: theme.border },
              selectedValue === item && {
                backgroundColor: theme.primaryLight,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText
              type="body"
              style={
                selectedValue === item
                  ? { fontWeight: "600", color: theme.primary }
                  : undefined
              }
            >
              {item}
            </ThemedText>
            {selectedValue === item ? (
              <Feather name="check" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No matches found
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

export function CorrectionModal({
  visible,
  onClose,
  onSubmit,
  initialValues,
}: CorrectionModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initialValues?.name || "");
  const [attribute, setAttribute] = useState(initialValues?.attribute || "");
  const [gPower, setGPower] = useState(() => {
    if (!initialValues?.gPower) return "";
    const gPowerStr = String(initialValues.gPower);
    return gPowerStr.endsWith("G") ? gPowerStr : `${gPowerStr}G`;
  });
  const [treatment, setTreatment] = useState(initialValues?.treatment || "Standard");
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  useEffect(() => {
    if (visible && initialValues) {
      setName(initialValues.name || "");
      setAttribute(initialValues.attribute || "");
      const gPowerStr = String(initialValues.gPower || "");
      setGPower(gPowerStr.endsWith("G") ? gPowerStr : gPowerStr ? `${gPowerStr}G` : "");
      setTreatment(initialValues.treatment || "Standard");
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    if (!name || !attribute || !gPower || !treatment) return;

    onSubmit({
      name,
      attribute,
      gPower: gPower.replace("G", ""),
      treatment,
    });
  };

  const isValid = name && attribute && gPower && treatment;

  const renderPickerButton = (
    label: string,
    value: string,
    pickerType: PickerType,
    placeholder: string
  ) => (
    <View style={styles.fieldContainer}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setActivePicker(pickerType)}
        style={({ pressed }) => [
          styles.fieldButton,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={!value ? { color: theme.textSecondary } : undefined}
        >
          {value || placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="h4">Correct Identification</ThemedText>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
        >
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="info" size={18} color={theme.primary} />
              <ThemedText
                type="small"
                style={{ flex: 1, color: theme.textSecondary }}
              >
                Select the correct details for this Bakugan. Your corrections
                help improve future identifications.
              </ThemedText>
            </View>
          </Card>

          {renderPickerButton("Bakugan Name", name, "name", "Select name...")}
          {renderPickerButton(
            "Attribute",
            attribute,
            "attribute",
            "Select attribute..."
          )}
          {renderPickerButton("G-Power", gPower, "gPower", "Select G-Power...")}
          {renderPickerButton(
            "Treatment/Variant",
            treatment,
            "treatment",
            "Select treatment..."
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + Spacing.md,
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Button
            onPress={handleSubmit}
            disabled={!isValid}
            style={[styles.submitButton, !isValid && { opacity: 0.5 }]}
          >
            Save Correction
          </Button>
        </View>

        <Modal
          visible={activePicker !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setActivePicker(null)}
        >
          <ThemedView style={styles.container}>
            {activePicker === "name" ? (
              <OptionPicker
                title="Select Bakugan"
                options={BAKUGAN_NAMES}
                selectedValue={name}
                onSelect={setName}
                onClose={() => setActivePicker(null)}
                searchable
              />
            ) : null}
            {activePicker === "attribute" ? (
              <OptionPicker
                title="Select Attribute"
                options={ATTRIBUTES}
                selectedValue={attribute}
                onSelect={setAttribute}
                onClose={() => setActivePicker(null)}
              />
            ) : null}
            {activePicker === "gPower" ? (
              <OptionPicker
                title="Select G-Power"
                options={G_POWER_OPTIONS}
                selectedValue={gPower}
                onSelect={setGPower}
                onClose={() => setActivePicker(null)}
              />
            ) : null}
            {activePicker === "treatment" ? (
              <OptionPicker
                title="Select Treatment"
                options={TREATMENTS}
                selectedValue={treatment}
                onSelect={setTreatment}
                onClose={() => setActivePicker(null)}
              />
            ) : null}
          </ThemedView>
        </Modal>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
  },
  content: {
    flex: 1,
  },
  infoCard: {
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  submitButton: {
    width: "100%",
  },
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    ...Platform.select({
      web: { outlineStyle: "none" as any },
    }),
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  emptyList: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
