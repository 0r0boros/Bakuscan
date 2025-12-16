import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator, { ScanTabButton } from "@/navigation/MainTabNavigator";
import ScanResultScreen from "@/screens/ScanResultScreen";
import CameraScreen from "@/screens/CameraScreen";
import ImagePreviewScreen from "@/screens/ImagePreviewScreen";
import LoginScreen from "@/screens/LoginScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/hooks/useAuth";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Camera: undefined;
  ScanResult: { imageUri: string };
  ImagePreview: { imageUri: string; title?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainWithFAB() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <>
      <MainTabNavigator />
      <ScanTabButton onPress={() => navigation.navigate("Camera")} />
    </>
  );
}

function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const canAccessApp = isAuthenticated || isGuest;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!canAccessApp ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainWithFAB}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="ScanResult"
            component={ScanResultScreen}
            options={{
              headerTitle: "Scan Result",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="ImagePreview"
            component={ImagePreviewScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
