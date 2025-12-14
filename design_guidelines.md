# Bakugan Scanner App - Design Guidelines

## Architecture Decisions

### Authentication
**No Authentication Required** - This is a utility app with local-first data storage.

**Profile/Settings Screen Required:**
- User-customizable avatar (generate 3 preset Bakugan-themed avatars: battle stance, sphere form, attribute symbol)
- Display name field
- App preferences:
  - Preferred currency for valuations (USD, EUR, GBP, JPY)
  - Theme toggle (light/dark)
  - Measurement units (imperial/metric for condition details)
  - Camera quality settings (standard/high resolution)

### Navigation Structure
**Root Navigation: Tab Bar with Floating Action Button**

The app has 4 distinct areas, so use a 4-tab navigation with a floating scan button:

**Tab Bar (Bottom):**
1. **History** (left) - List of previous scans
2. **Scan** (center FAB) - Camera scanning interface
3. **Guide** (right-center) - Condition assessment reference
4. **Profile** (right) - User settings and preferences

**Stack Navigation:**
- History Stack: History List → Scan Details
- Scan Stack: Camera View → Result Screen → Scan Details
- Guide Stack: Guide List
- Profile Stack: Profile Screen → Settings

**Modal Screens:**
- Image Preview (fullscreen)
- Condition Rating Modal

## Screen Specifications

### 1. History Screen (Default Landing)
**Purpose:** Browse and search previously scanned Bakugans

**Layout:**
- **Header:** Transparent navigation header
  - Title: "My Collection"
  - Right button: Search icon
  - Search bar (appears on tap, slides down from header)
- **Content:** ScrollView with card-based list
  - Each card shows: thumbnail, Bakugan name, attribute icon, valuation, scan date
  - Empty state: Illustration with "Scan your first Bakugan to get started"
  - Pull-to-refresh enabled
- **Safe Area Insets:**
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl (to accommodate tab bar)

**Components:**
- Search bar (expandable)
- History card (reusable component)
- Sort/filter chips (by attribute, value range, date)

### 2. Camera/Scan Screen
**Purpose:** Capture images of Bakugan for identification

**Layout:**
- **Header:** None (fullscreen camera view)
  - Back button: Top-left corner (white with subtle shadow)
  - Flash toggle: Top-right corner
- **Content:** Camera viewport with overlay
  - Center: Circular scanning reticle (animated pulse when detecting object)
  - Bottom overlay: Capture button (large circle), gallery access (small icon)
  - Tips overlay: "Center Bakugan in frame" (dismissible)
- **Safe Area Insets:**
  - Top: insets.top + Spacing.lg
  - Bottom: insets.bottom + 80 (room for capture button)

**Components:**
- Camera viewport (full screen)
- Animated scanning reticle
- Capture button with haptic feedback
- Flash/torch toggle
- Gallery picker

### 3. Result Details Screen
**Purpose:** Display identification results and valuation

**Layout:**
- **Header:** Standard navigation header
  - Left: Back button
  - Right: Share icon, Save/Delete (if from history)
  - Title: Bakugan name (or "Scanning..." during analysis)
- **Content:** Scrollable view
  - Hero image (user's captured photo, tappable for fullscreen)
  - Attribute badge (fire, water, earth, etc. - color-coded)
  - Information cards:
    - **Identity Card:** Name, series, G-Power, attribute
    - **Valuation Card:** Estimated value range, condition factor, last updated
    - **Details Card:** Release year, rarity, special features
  - Condition assessment CTA: "Rate condition for accurate valuation"
  - Historical price chart (line graph, last 6 months)
- **Safe Area Insets:**
  - Top: Spacing.xl (below header)
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Image carousel (if multiple photos)
- Info cards with icons
- Price range slider
- Condition rating stars
- Line chart
- Share sheet integration

### 4. Condition Guide Screen
**Purpose:** Educational reference for assessing Bakugan condition

**Layout:**
- **Header:** Standard navigation header
  - Title: "Condition Guide"
  - Search icon (right)
- **Content:** Scrollable list/accordion
  - Condition categories: Mint, Near Mint, Excellent, Good, Fair, Poor
  - Each section expands to show:
    - Definition
    - Visual examples (reference photos)
    - Value impact percentage
    - Checklist items
- **Safe Area Insets:**
  - Top: Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Accordion sections
- Image grid (reference photos)
- Expandable checklists
- Value impact indicator

### 5. Profile Screen
**Purpose:** User customization and app settings

**Layout:**
- **Header:** Transparent navigation header
  - Title: "Profile"
  - Right: Settings gear icon
- **Content:** Scrollable form
  - Avatar picker (3 preset options, centered)
  - Display name field
  - Stats section: Total scans, collection value, rarest find
  - Preferences list:
    - Currency preference
    - Theme
    - Units
    - Camera quality
  - App info: Version, privacy policy, terms
- **Safe Area Insets:**
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Avatar selector (horizontal scroll)
- Text input (display name)
- Settings list items
- Toggle switches

## Design System

### Color Palette
**Primary Colors:**
- Primary: #E63946 (Bakugan red - energetic, action-focused)
- Primary Dark: #C5303D
- Primary Light: #FF5A67

**Attribute Colors (for Bakugan types):**
- Pyrus (Fire): #E63946
- Aquos (Water): #1D3557
- Haos (Light): #F1FAEE
- Darkus (Dark): #2B2D42
- Subterra (Earth): #8D6B45
- Ventus (Wind): #06D6A0

**Neutral Colors:**
- Background: #FFFFFF (light) / #1A1A1A (dark)
- Surface: #F8F9FA (light) / #2B2B2B (dark)
- Text Primary: #212529 (light) / #F8F9FA (dark)
- Text Secondary: #6C757D
- Border: #DEE2E6 (light) / #3A3A3A (dark)

**Semantic Colors:**
- Success: #06D6A0
- Warning: #FFB703
- Error: #E63946
- Info: #1D3557

### Typography
**Font Family:** System default (San Francisco on iOS, Roboto on Android)

**Type Scale:**
- Heading 1: 32px, Bold (screen titles)
- Heading 2: 24px, Semibold (section headers)
- Heading 3: 20px, Semibold (card titles)
- Body Large: 17px, Regular (main content)
- Body: 15px, Regular (standard text)
- Caption: 13px, Regular (metadata, timestamps)
- Label: 11px, Medium, Uppercase (tags, badges)

### Spacing System
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px

### Component Specifications

**Floating Action Button (Scan):**
- Size: 64x64px circle
- Background: Primary gradient (top-left #E63946 to bottom-right #C5303D)
- Icon: Camera (white, 28px)
- Position: Bottom center, 16px above tab bar
- Shadow:
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Press state: Scale to 0.95, increase shadow opacity to 0.15

**Cards:**
- Border radius: 12px
- Background: Surface color
- Padding: lg
- Border: 1px solid Border color (optional)
- Press feedback: Opacity 0.7 (for tappable cards)

**Buttons:**
- Primary: Background Primary, text white, border radius 8px, height 48px
- Secondary: Background transparent, border 1px Primary, text Primary
- Text button: No background, text Primary
- All buttons: Press feedback via opacity 0.7

**Tab Bar:**
- Height: 56px (+ safe area)
- Background: Surface with slight blur
- Active tab: Primary color
- Inactive tab: Text Secondary
- Icons: Feather icons, 24px

### Visual Design

**Icons:**
- Use Feather icons from @expo/vector-icons
- Navigation: ChevronLeft, ChevronRight, X
- Actions: Camera, Share2, Search, Settings, Plus
- Attributes: Custom attribute icons (generate 6 unique icons for each Bakugan attribute)

**Critical Assets:**
- 3 preset user avatars (Bakugan-themed illustrations)
- 6 attribute icons (Pyrus, Aquos, Haos, Darkus, Subterra, Ventus)
- Empty state illustration (Bakugan sphere with scanning lines)

**Visual Feedback:**
- All touchable elements: Opacity 0.7 on press
- Floating scan button: Scale + shadow as specified above
- Loading states: Skeleton screens for cards, spinner for full-screen loads
- Success animations: Gentle scale pulse on scan completion

### Accessibility
- Minimum touch target: 44x44px
- Color contrast ratio: 4.5:1 for body text, 3:1 for large text
- Screen reader labels for all interactive elements
- Haptic feedback on scan capture and successful identification
- Support for Dynamic Type (iOS) / font scaling (Android)
- Keyboard navigation support where applicable