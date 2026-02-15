# MediScan

AI-powered prescription scanner — snap a photo or type a shorthand like `Bruffen 1x3`, and get extracted medication details, drug interaction checks, and plain-language explanations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Routing | Expo Router 6 (file-based) |
| Backend | Convex (serverless functions + real-time database) |
| AI | OpenAI GPT-4o (vision + text completions) |
| Drug Data | OpenFDA API (public, no key needed) |
| Language | TypeScript 5.9 (strict) |

---

## Getting Started

### Prerequisites

- Node.js >= 18

### Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd mediscan
npm install

# 2. Create your local env file (get the URL from the team)
cp .env.example .env.local

# 3. Start the app
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` / `a` for simulators.

> **Note:** The Convex backend and API keys are already configured on the shared deployment. You just need the `EXPO_PUBLIC_CONVEX_URL` value in your `.env.local` — ask a team member or check the pinned message in chat.

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | `.env.local` | Connects the app to the shared Convex deployment |
| `OPENAI_API_KEY` | Convex env (already set) | Used server-side by Convex actions — no local setup needed |

> The OpenFDA API is public and requires no key.

---

## Project Structure

```
mediscan/
├── app/                              # Screens (file-based routing)
│   ├── _layout.tsx                   # Root layout, Convex provider
│   ├── +not-found.tsx                # 404
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar (Scan, My Meds, Reminders)
│   │   ├── index.tsx                 # Scan screen
│   │   ├── medications.tsx           # Medication list + add form
│   │   └── reminders.tsx             # Reminder list + add form
│   └── results/
│       └── [id].tsx                  # Scan results detail
│
├── components/
│   ├── CameraCapture.tsx             # Image picker (camera + gallery)
│   ├── MedicationCard.tsx            # Medication display card
│   ├── InteractionWarning.tsx        # Drug interaction banner
│   ├── ReminderItem.tsx              # Reminder row with toggle
│   ├── LoadingSpinner.tsx            # Activity indicator
│   └── EmptyState.tsx                # Empty list placeholder
│
├── convex/                           # Backend (deployed to Convex)
│   ├── schema.ts                     # Database schema
│   ├── ai.ts                         # OpenAI actions
│   ├── drugApi.ts                    # OpenFDA interaction check
│   ├── scans.ts                      # Scan CRUD
│   ├── medications.ts                # Medication CRUD
│   ├── reminders.ts                  # Reminder CRUD
│   ├── users.ts                      # User management
│   └── _generated/                   # Auto-generated (do not edit)
│
├── lib/
│   ├── utils.ts                      # Date formatting, helpers
│   └── notifications.ts              # Notification scheduling helpers
│
├── hooks/
│   └── useNotifications.ts           # Push notification hook
│
└── constants/
    └── Colors.ts                     # Color palette
```

---

## What's Implemented

### Scan Screen (`app/(tabs)/index.tsx`)

- **Text input** — type a shorthand like `Bruffen 1x3` or `Amoxicillin 500mg twice daily`
- **Image scanning** — take a photo with camera or pick from gallery
- **Processing pipeline**: extract meds (GPT-4o) → check interactions (OpenFDA) → generate explanation (GPT-4o) → navigate to results
- **Recent scans** section (shows when connected to Convex with a user ID)

### Results Screen (`app/results/[id].tsx`)

- Displays extracted medications with confidence badges (high/medium/low)
- Drug interaction warnings color-coded by severity
- AI-generated plain-language explanation rendered as markdown
- "Add to My Meds" button per medication
- Works in local mode (data via route params) or database mode (Convex query)

### My Meds Screen (`app/(tabs)/medications.tsx`)

- List medications with Active / All filter toggle
- Pause/resume and delete individual medications
- Add medications manually via modal form (name, dosage, frequency, purpose, instructions)
- Deleting a medication cascades to its reminders

### Reminders Screen (`app/(tabs)/reminders.tsx`)

- List reminders with medication name, time, days
- Toggle reminders on/off, delete with confirmation
- Add reminders via modal: pick a medication, set time (24h), choose days (daily or specific)

### Convex Backend

| File | Functions |
|------|-----------|
| `ai.ts` | `extractMedications` (image → meds), `extractFromText` (text → meds), `generateExplanation` (meds + interactions → summary) |
| `drugApi.ts` | `checkInteractions` (queries OpenFDA `/drug/label.json`, parses severity from keywords) |
| `scans.ts` | `list`, `get`, `save`, `remove` |
| `medications.ts` | `list`, `listActive`, `get`, `add`, `update`, `toggleActive`, `remove` |
| `reminders.ts` | `list` (enriches with medication name/dosage), `add`, `update`, `toggleActive`, `remove` |
| `users.ts` | `getOrCreate`, `get`, `updatePushToken` |

---

## Current State & What to Know

A few things to be aware of before working on this:

**`DEMO_USER_ID` is `null`** — Every screen sets `const DEMO_USER_ID = null`. This means Convex queries and mutations that require a user ID won't fire until a real user ID is wired in. Scanning still works because results are passed via route params (local mode), but saving to the database, listing medications/reminders, etc. require replacing this placeholder with an actual user flow.

**Notifications are disabled** — The `useNotifications()` hook call is commented out in `app/_layout.tsx`, and notification scheduling is commented out in `reminders.tsx`. The helper functions in `lib/notifications.ts` are fully written but require a development build (not Expo Go) to work.

**No auth** — `users.ts` has a `getOrCreate` mutation for anonymous users, but no login/signup flow or session management exists yet.

**Graceful degradation** — The app is designed to work without Convex configured. The root layout conditionally wraps with `<ConvexProvider>` only if `EXPO_PUBLIC_CONVEX_URL` is set. Convex hooks are imported inside try/catch blocks so the app compiles even with stub `_generated/` files.

---

## Database Schema

Four tables defined in `convex/schema.ts`:

**users** — `name?`, `pushToken?`, `createdAt`

**medications** — `userId`, `name`, `dosage`, `frequency`, `instructions?`, `purpose?`, `isActive`, `startDate?`, `endDate?`, `createdAt`
  - Indexes: `by_user`, `by_user_active`

**reminders** — `userId`, `medicationId`, `time` (HH:MM), `days` (string[]), `isActive`, `notificationId?`, `createdAt`
  - Indexes: `by_user`, `by_medication`

**scans** — `userId`, `imageStorageId?`, `extractedMedications` (array), `interactions` (array), `explanation`, `scannedAt`
  - Index: `by_user`

---

## Scripts

```bash
npm start          # expo start
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
```

---

> **Disclaimer:** MediScan is for informational purposes only — not a substitute for professional medical advice.
