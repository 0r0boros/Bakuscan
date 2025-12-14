import { Platform } from "react-native";

const tintColorLight = "#E63946";
const tintColorDark = "#FF5A67";

export const Colors = {
  light: {
    text: "#212529",
    textSecondary: "#6C757D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6C757D",
    tabIconSelected: tintColorLight,
    link: "#E63946",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F9FA",
    backgroundSecondary: "#F2F2F2",
    backgroundTertiary: "#E6E6E6",
    border: "#DEE2E6",
    primary: "#E63946",
    primaryDark: "#C5303D",
    primaryLight: "#FF5A67",
    success: "#06D6A0",
    warning: "#FFB703",
    error: "#E63946",
    info: "#1D3557",
  },
  dark: {
    text: "#F8F9FA",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: "#FF5A67",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2B2B2B",
    backgroundSecondary: "#353535",
    backgroundTertiary: "#404040",
    border: "#3A3A3A",
    primary: "#E63946",
    primaryDark: "#C5303D",
    primaryLight: "#FF5A67",
    success: "#06D6A0",
    warning: "#FFB703",
    error: "#E63946",
    info: "#1D3557",
  },
};

export const AttributeColors = {
  pyrus: "#E63946",
  aquos: "#1D3557",
  haos: "#F1FAEE",
  darkus: "#2B2D42",
  subterra: "#8D6B45",
  ventus: "#06D6A0",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  inputHeight: 48,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 11,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
