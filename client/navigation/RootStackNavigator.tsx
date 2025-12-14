import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator, { ScanTabButton } from "@/navigation/MainTabNavigator";
import ScanResultScreen from "@/screens/ScanResultScreen";
import CameraScreen from "@/screens/CameraScreen";
import ImagePreviewScreen from "@/screens/ImagePreviewScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
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

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
