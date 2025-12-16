import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useScanHistory } from "@/hooks/useScanHistory";
import { useAuth } from "@/hooks/useAuth";

const AVATARS = [
  { id: "sphere", icon: "circle" as const },
  { id: "battle", icon: "zap" as const },
  { id: "attribute", icon: "hexagon" as const },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

function AvatarSelector({ selected, onSelect }: { 
  selected: string; 
  onSelect: (id: string) => void;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.avatarContainer}>
      {AVATARS.map((avatar) => (
        <Pressable
          key={avatar.id}
          onPress={() => onSelect(avatar.id)}
          style={[
            styles.avatarOption,
            { 
              backgroundColor: selected === avatar.id ? theme.primary : theme.backgroundSecondary,
              borderColor: selected === avatar.id ? theme.primary : theme.border,
            },
          ]}
        >
          <Feather 
            name={avatar.icon} 
            size={32} 
            color={selected === avatar.id ? "#FFF" : theme.textSecondary} 
          />
        </Pressable>
      ))}
    </View>
  );
}

function SettingsRow({ 
  icon, 
  title, 
  value, 
  onPress,
  rightElement,
}: { 
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  const { theme } = useTheme();
  
  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.settingsRow,
        { opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
        <ThemedText type="body">{title}</ThemedText>
      </View>
      {rightElement ? rightElement : value ? (
        <View style={styles.settingsRowRight}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {value}
          </ThemedText>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      ) : null}
    </Pressable>
  );
}

function StatCard({ title, value, icon }: { 
  title: string; 
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name={icon} size={20} color={theme.primary} />
      <ThemedText type="h3" style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>{title}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { settings, updateSettings } = useUserSettings();
  const { history } = useScanHistory();
  const { user, logout, isGuest } = useAuth();
  
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    setDisplayName(settings.displayName);
  }, [settings.displayName]);

  const handleNameChange = (name: string) => {
    setDisplayName(name);
    updateSettings({ displayName: name });
  };

  const handleAvatarSelect = (avatar: string) => {
    updateSettings({ avatar });
  };

  const handleCurrencySelect = (currency: string) => {
    updateSettings({ currency });
    setShowCurrencyPicker(false);
  };

  const totalValue = history.reduce(
    (sum, item) => sum + (item.estimatedValue.low + item.estimatedValue.high) / 2,
    0
  );

  const currencySymbol = CURRENCIES.find(c => c.code === settings.currency)?.symbol || "$";

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + 80 + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <AvatarSelector 
            selected={settings.avatar} 
            onSelect={handleAvatarSelect}
          />
          <TextInput
            style={[
              styles.nameInput,
              { 
                color: theme.text,
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            value={displayName}
            onChangeText={handleNameChange}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.statsContainer}>
          <StatCard 
            title="Scanned" 
            value={history.length} 
            icon="camera"
          />
          <StatCard 
            title="Collection Value" 
            value={`${currencySymbol}${Math.round(totalValue)}`} 
            icon="dollar-sign"
          />
          <StatCard 
            title="Rarest" 
            value={history.length > 0 ? "1" : "0"} 
            icon="star"
          />
        </View>

        <Card style={styles.settingsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>Preferences</ThemedText>
          
          <SettingsRow
            icon="dollar-sign"
            title="Currency"
            value={settings.currency}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          />
          
          {showCurrencyPicker ? (
            <View style={styles.currencyPicker}>
              {CURRENCIES.map((currency) => (
                <Pressable
                  key={currency.code}
                  onPress={() => handleCurrencySelect(currency.code)}
                  style={[
                    styles.currencyOption,
                    { 
                      backgroundColor: settings.currency === currency.code 
                        ? theme.primary 
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText 
                    style={{ 
                      color: settings.currency === currency.code ? "#FFF" : theme.text,
                    }}
                  >
                    {currency.symbol} {currency.code}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          
          <SettingsRow
            icon="camera"
            title="High Quality Camera"
            rightElement={
              <Switch
                value={settings.highQualityCamera}
                onValueChange={(value) => updateSettings({ highQualityCamera: value })}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFF"
              />
            }
          />
        </Card>

        <Card style={styles.settingsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>About</ThemedText>
          <SettingsRow icon="info" title="Version" value="1.0.0" />
          <SettingsRow icon="shield" title="Privacy Policy" />
          <SettingsRow icon="file-text" title="Terms of Service" />
        </Card>

        <Card style={styles.settingsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>Account</ThemedText>
          {user ? (
            <>
              <SettingsRow 
                icon="user" 
                title={user.email || user.displayName || "User"} 
                value={user.provider === "google" ? "Google" : user.provider === "apple" ? "Apple" : ""} 
              />
              <Pressable
                style={[styles.logoutButton, { backgroundColor: theme.error }]}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={18} color="#FFF" />
                <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
              </Pressable>
            </>
          ) : isGuest ? (
            <>
              <SettingsRow 
                icon="user" 
                title="Guest User" 
                value="Local only" 
              />
              <View style={styles.guestInfo}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Sign in to sync your collection across devices
                </ThemedText>
              </View>
              <Pressable
                style={[styles.signInButton, { backgroundColor: theme.primary }]}
                onPress={handleLogout}
              >
                <Feather name="log-in" size={18} color="#FFF" />
                <ThemedText style={styles.logoutText}>Sign In</ThemedText>
              </Pressable>
            </>
          ) : null}
        </Card>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avatarOption: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nameInput: {
    width: "100%",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    textAlign: "center",
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  statValue: {
    marginVertical: Spacing.xs,
  },
  settingsCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  currencyPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  currencyOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "600",
  },
  guestInfo: {
    paddingVertical: Spacing.md,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
});
