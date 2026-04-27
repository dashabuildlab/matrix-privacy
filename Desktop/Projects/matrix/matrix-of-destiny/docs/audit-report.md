# Matrix of Destiny — Звіт аудиту

> Дата: 2026-04-27  
> Аудит: App Store / Google Play compliance + TypeScript

---

## 1. App Store / Google Play Compliance

### Критичні блокери (виправлено)

| # | Проблема | Файл | Статус |
|---|---------|------|--------|
| C-1 | Apple Sign-In nonce через `Math.random()` — незахищений, може бути відтворений | `lib/firebaseAuth.ts:92` | ✅ Виправлено |
| C-2 | Hardcoded test account `reviewer@yourmatrixofdestiny.com` з premium bypass | `lib/purchases.ts:199` | ✅ Видалено |
| C-3 | ATT (App Tracking Transparency) не реалізовано — iOS відхилить | `app/_layout.tsx` | ✅ Додано |
| C-4 | `NSUserTrackingUsageDescription` відсутній в `app.json` | `app.json` | ✅ Додано |
| C-5 | Delete Account не реалізовано (обов'язково з червня 2023) | `app/profile/account.tsx` | ✅ Додано |
| C-6 | Paywall без обов'язкового auto-renewal disclosure | `app/paywall.tsx` | ✅ Додано |

### Деталі виправлень

#### C-1: Apple Sign-In nonce
**До:**
```typescript
const nonce = Math.random().toString(36).substring(2, 18);
// nonce не передавався у signInAsync взагалі
```
**Після:**
```typescript
const rawNonce = Crypto.randomUUID();                           // криптографічно безпечний
const hashedNonce = await Crypto.digestStringAsync(             // SHA256
  Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
await AppleAuthentication.signInAsync({ nonce: hashedNonce });  // хеш → Apple
credential(identityToken, rawNonce);                            // raw → Firebase
```

#### C-3: ATT Prompt
```typescript
// app/_layout.tsx — виконується перед initAnalytics()
const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
await requestTrackingPermissionsAsync();
```

#### C-5: Delete Account
```typescript
// app/profile/account.tsx
const user = getCurrentUser();
await user.delete();          // Firebase видаляє акаунт
await signOut();              // очищення Firebase local state
logout();                     // очищення Zustand store
router.replace('/welcome');   // редирект
// обробляє auth/requires-recent-login для federated auth
```

#### C-6: Paywall Disclosure
- Додано рядок перед CTA: `"$49.99 / рік · автоматичне поновлення"`
- Розширено `legalText` у `locales/uk.ts` та `locales/en.ts` з повним описом: ціна, 24 год скасування, платіжний акаунт

---

## 2. TypeScript Errors (14 → 0)

### Виправлені помилки

| # | Файл | Рядок | Помилка | Виправлення |
|---|------|-------|---------|-------------|
| T-1 | `app/(tabs)/index.tsx` | 223–256 | Temporal dead zone: `closeModal` використовував `startPlayer/loopPlayer/crystalPlayer` до їх оголошення | Переміщено `useVideoPlayer()` виклики вище `closeModal` |
| T-2 | `components/ui/Button.tsx` | 13–20 | `testID` не існує в `ButtonProps` | Додано `testID?: string` у інтерфейс та передано у всі три `TouchableOpacity` |
| T-3 | `app/share.tsx` | 268–291 | Дублікат `closeBtn` в `StyleSheet.create` | Видалено перший неповний дублікат |
| T-4 | `lib/analytics.ts` | 81 | `d < signs[m-1][0]`: `string\|number` не порівнюється без приведення | Додано `as number` cast |
| T-5 | `app/learn/memory.tsx` | 450 | `perspective: 800` — не є полем `ViewStyle` | Перенесено у `transform: [{ perspective: 800 }]` |
| T-6 | `app/profile/account.tsx` | 269 | `outlineStyle: 'none'` — веб-only CSS, невалідний для RN `TextStyle` | Загорнуто у `Platform.OS === 'web'` spread + `as any` |
| T-7 | `app/welcome.tsx` | 152, 231 | `Colors.gradientGold as unknown as string[]` — хибне приведення | Видалено cast (`as const` tuple сумісний з LinearGradient) |
| T-8 | `components/ui/StarBackground.tsx` | 195 | `BreathingNebula` `colors: string[]` несумісний з LinearGradient | Змінено на `colors as [string, string, ...string[]]` в JSX |
| T-9 | `app/profile/privacy.tsx` | 31 | `chatSessions` не існує в `AppState` (silent no-op) | Видалено; замінено на `clearAllSessionsSync()` для SQLite |
| T-10 | `app/profile/privacy.tsx` | 37 | `lastActiveDate` не існує в `AppState` (правильне — `lastVisitDate`) | Виправлено назву поля |
| T-11 | `lib/purchases.ts` | 186, 209 | `null` не присвоюваний до `undefined` в `setPremium()` | Додано `?? undefined` в обох місцях |
| T-12 | `lib/textToSpeech.ts` | 58–59 | `FileSystem.cacheDirectory` та `EncodingType` відсутні в новому API | Змінено імпорт на `expo-file-system/legacy` |

---

## 3. Логічні баги (виявлено та виправлено)

| # | Файл | Проблема | Статус |
|---|------|---------|--------|
| L-1 | `app/profile/privacy.tsx` | «Очистити дані» не видаляла чати (SQLite) — `chatSessions` в Zustand не існує | ✅ Виправлено: `clearAllSessionsSync()` |
| L-2 | `app/share.tsx` | Перший `closeBtn` style перекривався другим — стилі ніколи не застосовувались | ✅ Виправлено |

---

## 4. Низький пріоритет (не виправлено, задокументовано)

| # | Проблема | Рекомендація |
|---|---------|-------------|
| LOW-1 | Google Client IDs hardcoded у `lib/firebaseAuth.ts` | Безпечні публічні ідентифікатори OAuth, але можна перенести в env для зручності ротації |
| LOW-2 | RevenueCat keys hardcoded у `lib/purchases.ts` | Публічні SDK keys, безпечно в source. Рекомендація: EAS Secrets для production |
| LOW-3 | `expo-av` + `expo-audio` обидва в `package.json` | Не конфліктують, але зайва залежність. `expo-audio` не використовується прямо |
| LOW-4 | iOS `deploymentTarget: "15.1"` | Рекомендовано підняти до 16.0+ для ширшої підтримки нових APIs |
| LOW-5 | Delete Account не робить re-auth для Google/Apple | Показує інструкцію вийти/увійти. Повна реалізація потребує `reauthenticateWithCredential()` |

---

## 5. Безпека файлів (оновлено .gitignore)

Додано до `.gitignore`:

```
credentials.json          # keystore passwords
credentials/              # директорія з ключами
GoogleService-Info.plist  # iOS Firebase config
google-services.json      # Android Firebase config
*.ipa / *.apk / *.aab     # збірки
seo-website/.next/        # Next.js build
.idea/ / .vscode/         # IDE
.claude/                  # Claude Code internal
```
