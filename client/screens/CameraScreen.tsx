import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const RETICLE_SIZE = 250;

async function cropToReticle(imageUri: string): Promise<string> {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  
  const manipResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    { format: ImageManipulator.SaveFormat.JPEG }
  );
  
  const imageWidth = manipResult.width;
  const imageHeight = manipResult.height;
  
  const screenAspect = screenWidth / screenHeight;
  const imageAspect = imageWidth / imageHeight;
  
  let visibleWidth: number;
  let visibleHeight: number;
  let offsetX = 0;
  let offsetY = 0;
  
  if (imageAspect > screenAspect) {
    visibleHeight = imageHeight;
    visibleWidth = imageHeight * screenAspect;
    offsetX = (imageWidth - visibleWidth) / 2;
  } else {
    visibleWidth = imageWidth;
    visibleHeight = imageWidth / screenAspect;
    offsetY = (imageHeight - visibleHeight) / 2;
  }
  
  const reticleInImageWidth = (RETICLE_SIZE / screenWidth) * visibleWidth;
  const reticleInImageHeight = (RETICLE_SIZE / screenHeight) * visibleHeight;
  
  const cropSize = Math.floor(Math.min(reticleInImageWidth, reticleInImageHeight));
  
  const originX = Math.floor(offsetX + (visibleWidth - cropSize) / 2);
  const originY = Math.floor(offsetY + (visibleHeight - cropSize) / 2);
  
  const safeOriginX = Math.max(0, Math.min(originX, imageWidth - cropSize));
  const safeOriginY = Math.max(0, Math.min(originY, imageHeight - cropSize));
  const safeCropSize = Math.min(cropSize, imageWidth - safeOriginX, imageHeight - safeOriginY);
  
  const croppedResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      {
        crop: {
          originX: safeOriginX,
          originY: safeOriginY,
          width: safeCropSize,
          height: safeCropSize,
        },
      },
    ],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
  );
  
  return croppedResult.uri;
}

function ScanReticle() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.7, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.reticle, animatedStyle]}>
      <View style={styles.reticleCorner} />
      <View style={[styles.reticleCorner, styles.reticleTopRight]} />
      <View style={[styles.reticleCorner, styles.reticleBottomLeft]} />
      <View style={[styles.reticleCorner, styles.reticleBottomRight]} />
    </Animated.View>
  );
}

function CaptureButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.captureButton, animatedStyle, disabled && { opacity: 0.5 }]}
    >
      <View style={styles.captureButtonInner} />
    </AnimatedPressable>
  );
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (photo?.uri) {
        const croppedUri = await cropToReticle(photo.uri);
        navigation.replace("ScanResult", { imageUri: croppedUri });
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGalleryPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.replace("ScanResult", { imageUri: result.assets[0].uri });
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="camera-off" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText type="body" style={[styles.permissionText, { color: theme.textSecondary }]}>
            BakuScan needs camera access to scan and identify your Bakugan toys.
          </ThemedText>
          <Button onPress={requestPermission} style={styles.permissionButton}>
            Enable Camera
          </Button>
          <Pressable onPress={handleClose} style={styles.cancelButton}>
            <ThemedText type="body" style={{ color: theme.primary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="smartphone" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Use Expo Go
          </ThemedText>
          <ThemedText type="body" style={[styles.permissionText, { color: theme.textSecondary }]}>
            Camera scanning works best in the Expo Go app. You can still upload an image from your gallery.
          </ThemedText>
          <Button onPress={handleGalleryPick} style={styles.permissionButton}>
            Choose from Gallery
          </Button>
          <Pressable onPress={handleClose} style={styles.cancelButton}>
            <ThemedText type="body" style={{ color: theme.primary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
      />
      
      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.topControls}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="x" size={24} color="#FFF" />
          </Pressable>
          
          <Pressable
            onPress={() => setFlash(flash === "off" ? "on" : "off")}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name={flash === "off" ? "zap-off" : "zap"} size={24} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.centerArea}>
          <ScanReticle />
          <ThemedText style={styles.tipText} lightColor="#FFF" darkColor="#FFF">
            Center Bakugan in frame
          </ThemedText>
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable
            onPress={handleGalleryPick}
            style={({ pressed }) => [styles.galleryButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="image" size={28} color="#FFF" />
          </Pressable>
          
          <CaptureButton onPress={handleCapture} disabled={isCapturing} />
          
          <View style={styles.spacer} />
        </View>
      </View>

      {isCapturing ? (
        <View style={styles.capturingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: "relative",
  },
  reticleCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.light.primary,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
    top: 0,
    left: 0,
  },
  reticleTopRight: {
    borderTopWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 12,
    top: 0,
    left: undefined,
    right: 0,
  },
  reticleBottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 12,
    top: undefined,
    bottom: 0,
  },
  reticleBottomRight: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 12,
    top: undefined,
    left: undefined,
    bottom: 0,
    right: 0,
  },
  tipText: {
    marginTop: Spacing.xl,
    fontSize: 15,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing["2xl"],
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  captureButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
    backgroundColor: Colors.light.primary,
  },
  spacer: {
    width: 56,
    height: 56,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  cancelButton: {
    padding: Spacing.md,
  },
});
