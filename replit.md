# BakuScan - Replit.md

## Overview

BakuScan is a mobile utility app built with React Native/Expo that allows users to scan and identify Bakugan toys from the original 2007-2012 run. The app uses AI-powered image recognition (Groq Llama 4 Scout Vision) to identify Bakugan toys, determine their series, attribute, rarity, and estimate market value. Users can sign in with Google or Apple to sync their collection across devices, or continue as a guest for local-only storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54 (new architecture enabled)
- **Navigation**: React Navigation v7 with a hybrid tab/stack structure
  - Bottom tab navigator with 3 tabs (History, Guide, Profile)
  - Floating action button for camera/scan functionality
  - Native stack navigators for each tab section
  - Modal presentations for Camera and Image Preview screens
- **State Management**: 
  - React Query (TanStack Query) for server state and API caching
  - React hooks with AsyncStorage for local persistence
- **Animations**: React Native Reanimated for smooth animations
- **Styling**: Custom theme system with light/dark mode support using the device color scheme

### Backend Architecture
- **Server**: Express.js running on Node.js with TypeScript
- **API Structure**: RESTful endpoints under `/api/` prefix
  - `POST /api/analyze` - Main endpoint for Bakugan image analysis
- **AI Integration**: Groq API (Llama 4 Scout Vision) for image recognition
- **Build System**: esbuild for server bundling, tsx for development

### Data Storage
- **Local Storage**: AsyncStorage for client-side persistence
  - Scan history stored at `@bakuscan/history`
  - User settings stored at `@bakuscan/settings`
- **Database Schema**: Drizzle ORM with PostgreSQL configured (schema defined but primarily using in-memory storage currently)
- **Authentication**: JWT-based auth with Google/Apple OAuth, optional guest mode for local-only usage
- **Design Decision**: Hybrid architecture - authenticated users sync to cloud, guests use local storage only

### Key Design Patterns
- Path aliases (`@/` for client, `@shared/` for shared code) for clean imports
- Error boundaries with development/production fallback UI
- Keyboard-aware components with platform-specific implementations
- Custom hooks for settings, scan history, and theming
- Reusable themed components (ThemedText, ThemedView, Card, Button)

### Navigation Flow
1. App launches to Login screen (if not authenticated/guest)
2. User can sign in with Google/Apple or continue as guest
3. Main app shows History screen (My Collection) with bottom tabs
4. FAB button opens Camera modal for scanning
5. Camera captures image → navigates to ScanResult screen
6. ScanResult calls `/api/analyze` and displays identification
7. Results saved to local history (guest) or synced to cloud (authenticated)

## External Dependencies

### Third-Party Services
- **Groq API**: Llama 4 Scout Vision model for Bakugan image recognition and identification (requires `GROQ_API_KEY` environment variable)

### Key NPM Packages
- **expo-camera**: Native camera access for scanning
- **expo-image-picker**: Gallery image selection
- **expo-file-system**: Reading images as base64 for API transmission
- **@react-native-async-storage/async-storage**: Local data persistence
- **groq-sdk**: Official Groq SDK for vision API calls
- **drizzle-orm** + **pg**: Database ORM (PostgreSQL configured via `DATABASE_URL`)

### Platform Configuration
- iOS: Camera and Photo Library usage permissions configured
- Android: Camera permission, edge-to-edge display enabled
- Web: Single-page output mode supported

### Environment Variables Required
- `GROQ_API_KEY`: For Bakugan image analysis (Groq Llama 4 Scout Vision)
- `EBAY_CLIENT_ID`: eBay Developer API client ID (for real pricing data)
- `EBAY_CLIENT_SECRET`: eBay Developer API client secret (for real pricing data)
- `DATABASE_URL`: PostgreSQL connection string (for Drizzle)
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for Expo and CORS
- `SESSION_SECRET`: JWT signing secret (required in production)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID (optional, for Google Sign-In)

### eBay Integration
- Uses eBay Marketplace Insights API to fetch real sold item prices
- Searches for recently sold Bakugan matching the AI-identified name
- Displays price range, average, and recent sales in the app
- Falls back to AI estimates if eBay API is not configured or returns no results

### Manual Correction System
- Users can correct AI misidentifications via "Not correct? Tap to fix" button
- CorrectionModal with searchable name picker, attribute, G-Power, and treatment pickers
- Corrections are stored locally with useCorrectionHistory hook
- Stats track how often specific Bakugan are corrected to different names
- Smart suggestion banner appears when AI identifies a Bakugan that has been corrected 2+ times before
- HistoryScreen shows "Corrected" badge for corrected items

### AI Learning from Corrections
- The app learns from user corrections to improve future identifications
- useCorrectionHistory.getCorrectionSummary() returns top N corrections with counts
- Correction history is sent with each analyze request to the server
- Server injects "Learned Corrections" section into AI prompt with format: "When image looks like X but corrected to Y (count: N), prefer Y"
- System waits for AsyncStorage to load corrections before analyzing, ensuring learned data is always included
- Client BAKUGAN_NAMES catalog synced with full 143-name server catalog for consistency

### Authentication System
- **Providers**: Google OAuth (via expo-auth-session) and Apple Sign-In (via expo-apple-authentication)
- **Guest Mode**: Users can skip login and use app locally without syncing
- **JWT Tokens**: Server issues JWT tokens with 30-day expiry for session management
- **Token Verification**: 
  - Google: Verifies access token against Google's userinfo API
  - Apple: Verifies identity token signature using Apple's JWKS endpoint
- **Storage**: Auth tokens stored in AsyncStorage at `@bakuscan/auth_token` and `@bakuscan/auth_user`
- **Profile Screen**: Shows account info for authenticated users, sign-in prompt for guests

### Key Auth Files
- `client/hooks/useAuth.tsx`: Auth context with login, logout, guest mode
- `client/screens/LoginScreen.tsx`: Sign-in UI with Google/Apple buttons
- `server/auth.ts`: Token generation, verification, OAuth handling
- `shared/schema.ts`: User and Scan database schemas