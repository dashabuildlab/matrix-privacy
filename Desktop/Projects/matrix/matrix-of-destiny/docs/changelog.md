# Changelog

Усі значущі зміни в проєкті Matrix of Destiny.

Формат базується на [Keep a Changelog](https://keepachangelog.com/uk/1.0.0/).

---

## [Unreleased] — 2026-04-27

### Security
- **Apple Sign-In nonce**: замінено `Math.random()` на `expo-crypto` SHA256 (`lib/firebaseAuth.ts`)
  - rawNonce → `Crypto.randomUUID()`; hashedNonce → `digestStringAsync(SHA256)`
  - Apple отримує хеш, Firebase — raw (для server-side верифікації)
- **Видалено hardcoded test account** `reviewer@yourmatrixofdestiny.com` з `lib/purchases.ts`
  - Разом з `isTestAccount()` та premium bypass у `checkSubscriptionStatus()`

### Compliance (App Store / Google Play)
- **ATT prompt** (iOS 14.5+): `app/_layout.tsx` → `requestTrackingPermissionsAsync()` перед `initAnalytics()`
- **`NSUserTrackingUsageDescription`** додано до `app.json` `infoPlist`
- **Delete Account**: `app/profile/account.tsx` — секція «Небезпечна зона»
  - `user.delete()` → `signOut()` → `store.logout()` → `/welcome`
  - Обробляє `auth/requires-recent-login` з інструкцією
- **Paywall disclosure**: `app/paywall.tsx`
  - Рядок перед CTA: `"$X.XX / рік · автоматичне поновлення"` (змінюється при перемиканні плану)
  - Розширено `legalText` у `locales/uk.ts` та `locales/en.ts` (ціна, 24h скасування, акаунт)

### Fixed (TypeScript — 14 → 0 помилок)
- `app/(tabs)/index.tsx`: переміщено `useVideoPlayer()` declarations перед `closeModal` (temporal dead zone)
- `components/ui/Button.tsx`: додано `testID?: string` prop до `ButtonProps` та трьох `TouchableOpacity`
- `app/share.tsx`: видалено дублікат `closeBtn` у `StyleSheet.create`
- `lib/analytics.ts:81`: cast `as number` для `signs[m-1][0]` (type `string|number`)
- `app/learn/memory.tsx`: `perspective: 800` → `transform: [{ perspective: 800 }]`
- `app/profile/account.tsx`: `outlineStyle: 'none'` загорнуто у `Platform.OS === 'web'` + `as any`
- `app/welcome.tsx`: видалено `as unknown as string[]` cast для `Colors.gradientGold`
- `components/ui/StarBackground.tsx`: `colors as [string, string, ...string[]]` в `BreathingNebula`
- `app/profile/privacy.tsx`:
  - Видалено неіснуюче поле `chatSessions` з Zustand setState
  - Виправлено `lastActiveDate` → `lastVisitDate`
  - Додано `clearAllSessionsSync()` для очищення SQLite
- `lib/purchases.ts`: `detectPlanFromEntitlements()` результат → `?? undefined` (×2)
- `lib/textToSpeech.ts`: `expo-file-system` → `expo-file-system/legacy` (cacheDirectory, EncodingType)

### Added
- `.gitignore`: розширено — `credentials.json`, `credentials/`, `GoogleService-Info.plist`, `google-services.json`, build artifacts, IDE, Next.js `.next/`
- `docs/` папка:
  - `docs/test-cases.md` — 131 тест-кейс (P0/P1/P2), покриває mobile + web
  - `docs/architecture.md` — повна технічна архітектура проєкту
  - `docs/audit-report.md` — звіт compliance + TS аудиту
  - `docs/changelog.md` — цей файл

### Web E2E тести (seo-website/e2e/)
- `HeaderComponent.ts`: всі локатори перероблено `header →` `nav` (після редизайну `Header.tsx`)
- `AuthModalPage.ts`: новий локатор `div.fixed.inset-0`, Tailwind-based error/success selectors
- `fixtures/testData.ts`: `invalidEmail` виправлено на валідний формат (HTML5 validation bypass)
- `auth.spec.ts`: `test.describe.configure({ mode: 'serial' })` проти Firebase rate-limiting; 2 тести `skip` (Firebase security feature)
- `AiChatPage.ts`: виправлено сигнатуру `mockApiError` (TS2416)
- `playwright.config.ts`: `retries: 1` для локальних запусків

---

## [0.2.0] — 2026-04-20

### Added
- Firebase Auth (email/password, Google Sign-In, Apple Sign-In)
- AI Chat сторінка (web)
- Матриця дня (web)
- Оновлено головну сторінку та Header

### Fixed
- Privacy URL для Apple Review
- Delete account endpoint
- Auth sign-out flow

---

## [0.1.0] — Initial

- Базова функціональність Матриці долі
- Калькулятор матриці (web + mobile)
- AI провідник (Claude API)
- RevenueCat підписки
- Гейміфікація (XP, streak, досягнення)
