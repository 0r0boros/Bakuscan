# BakuScan - Replit.md

## Overview

BakuScan is a mobile utility app built with React Native/Expo that allows users to scan and identify Bakugan toys from the original 2007-2012 run. The app uses AI-powered image recognition (OpenAI GPT-5 vision) to identify Bakugan toys, determine their series, attribute, rarity, and estimate market value. Users can maintain a local scan history and customize their experience through profile settings.

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
- **AI Integration**: OpenAI API (GPT-5 with vision capabilities) for image recognition
- **Build System**: esbuild for server bundling, tsx for development

### Data Storage
- **Local Storage**: AsyncStorage for client-side persistence
  - Scan history stored at `@bakuscan/history`
  - User settings stored at `@bakuscan/settings`
- **Database Schema**: Drizzle ORM with PostgreSQL configured (schema defined but primarily using in-memory storage currently)
- **Design Decision**: Local-first architecture without authentication - the app is a utility tool where data stays on the device

### Key Design Patterns
- Path aliases (`@/` for client, `@shared/` for shared code) for clean imports
- Error boundaries with development/production fallback UI
- Keyboard-aware components with platform-specific implementations
- Custom hooks for settings, scan history, and theming
- Reusable themed components (ThemedText, ThemedView, Card, Button)

### Navigation Flow
1. App launches to History screen (My Collection)
2. FAB button opens Camera modal for scanning
3. Camera captures image → navigates to ScanResult screen
4. ScanResult calls `/api/analyze` and displays identification
5. Results saved to local history

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-5 model for Bakugan image recognition and identification (requires `OPENAI_API_KEY` environment variable)

### Key NPM Packages
- **expo-camera**: Native camera access for scanning
- **expo-image-picker**: Gallery image selection
- **expo-file-system**: Reading images as base64 for API transmission
- **@react-native-async-storage/async-storage**: Local data persistence
- **openai**: Official OpenAI SDK for vision API calls
- **drizzle-orm** + **pg**: Database ORM (PostgreSQL configured via `DATABASE_URL`)

### Platform Configuration
- iOS: Camera and Photo Library usage permissions configured
- Android: Camera permission, edge-to-edge display enabled
- Web: Single-page output mode supported

### Environment Variables Required
- `OPENAI_API_KEY`: For Bakugan image analysis
- `DATABASE_URL`: PostgreSQL connection string (for Drizzle)
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for Expo and CORS