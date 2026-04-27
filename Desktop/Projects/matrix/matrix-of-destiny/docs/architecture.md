# Matrix of Destiny — Архітектура проєкту

> Останнє оновлення: 2026-04-27

---

## Огляд

**Matrix of Destiny** — кросплатформовий додаток (iOS / Android / Web) для чисельного розрахунку Матриці долі з AI-провідником, гейміфікацією та медитаціями.

Складається з двох частин:
- **Мобільний додаток** — Expo / React Native (`/`)
- **SEO-сайт** — Next.js 15 App Router (`/seo-website/`)

---

## Мобільний додаток

### Стек

| Шар | Технологія |
|-----|-----------|
| Фреймворк | Expo SDK 54, React Native 0.81.5 |
| Навігація | expo-router (file-based, Stack) |
| Стейт | Zustand + AsyncStorage (persisted) |
| База даних | Expo SQLite (чат-сесії) |
| Авторизація | @react-native-firebase/auth |
| Аналітика | @react-native-firebase/analytics |
| Crash reporting | @react-native-firebase/crashlytics |
| Підписки | react-native-purchases (RevenueCat) |
| AI | Claude API (Sonnet/Haiku) через backend proxy |
| TTS | ElevenLabs multilingual_v2 через backend proxy |
| Відео | expo-video (expo-av/legacy для audio) |
| Tracking | expo-tracking-transparency (ATT, iOS 14.5+) |
| Crypto | expo-crypto (nonce, UUID) |
| Іконки | @expo/vector-icons (Ionicons) |
| Градієнти | expo-linear-gradient |
| Нотифікації | expo-notifications |

### Файлова структура

```
app/                        # Екрани (expo-router)
├── _layout.tsx             # Кореневий layout: ATT, analytics, auth listener
├── welcome.tsx             # Onboarding entry point
├── onboarding.tsx          # Вибір мови/рівня
├── (tabs)/                 # Таб-навігація
│   ├── _layout.tsx
│   ├── index.tsx           # Головний екран (AI avatar, daily matrix)
│   ├── matrix.tsx          # Матриця долі
│   ├── ai.tsx              # AI чат
│   ├── learn.tsx           # Навчання
│   └── profile.tsx         # Профіль
├── auth/
│   ├── login.tsx
│   └── register.tsx
├── matrix/
│   ├── [id].tsx            # Деталі матриці
│   ├── create.tsx          # Створення нової
│   ├── compatibility.tsx   # Сумісність
│   ├── daily.tsx           # Матриця дня
│   └── referral.tsx
├── ai/
│   ├── chat.tsx            # AI чат (повний екран)
│   ├── conflict.tsx        # Аналіз конфліктів
│   └── history.tsx
├── ai-scan/
│   └── index.tsx           # AI-сканування (3 кроки: фото → процесинг → результат)
├── learn/
│   ├── matrix-guide.tsx
│   ├── quiz.tsx
│   ├── memory.tsx          # Гра пам'ять
│   ├── match.tsx           # Гра підбір
│   ├── chakras.tsx
│   ├── planets.tsx
│   └── signs.tsx
├── profile/
│   ├── account.tsx         # Ім'я, дата, рівень, видалення акаунту
│   ├── privacy.tsx         # Аналітика, очищення даних
│   ├── about.tsx
│   ├── achievements.tsx
│   ├── history.tsx
│   ├── language.tsx
│   └── notifications.tsx
├── paywall.tsx             # Підписки (RevenueCat)
└── share.tsx

lib/                        # Бізнес-логіка
├── firebaseAuth.ts         # Email, Google, Apple Sign-In (з SHA256 nonce)
├── purchases.ts            # RevenueCat: init, offerings, purchase, restore
├── analytics.ts            # Firebase Analytics events
├── crashlytics.ts          # Crashlytics helpers
├── chatDb.ts               # SQLite: chat sessions CRUD
├── matrix-calc.ts          # Алгоритм розрахунку матриці
├── i18n.tsx                # Провайдер інтернаціоналізації (uk/en)
├── notifications.ts        # Push notifications setup
└── textToSpeech.ts         # ElevenLabs TTS (expo-file-system/legacy)

stores/
└── useAppStore.ts          # Zustand store (auth, matrix, gamification, premium)

locales/
├── uk.ts                   # Українська локалізація
└── en.ts                   # Англійська локалізація

components/
├── ui/
│   ├── Button.tsx          # Primary/gold/secondary/ghost + testID
│   ├── Card.tsx
│   ├── StarBackground.tsx  # Анімований фон
│   └── ...
└── ...

e2e/                        # Detox mobile E2E тести
docs/                       # Документація проєкту
```

### Ключові потоки

#### Авторизація
```
App launch
  └── _layout.tsx
        ├── ATT prompt (iOS 14.5+)         # requestTrackingPermissionsAsync()
        ├── initAnalytics()                 # Firebase Analytics
        ├── initCrashlytics()
        ├── initPurchases()                 # RevenueCat
        └── onAuthStateChanged()            # Слухач Firebase Auth
              └── якщо user видалений → store.logout() → /welcome
```

#### Apple Sign-In (secure nonce)
```
signInWithApple()
  ├── rawNonce = Crypto.randomUUID()
  ├── hashedNonce = SHA256(rawNonce)
  ├── AppleAuthentication.signInAsync({ nonce: hashedNonce })
  └── AppleAuthProvider.credential(identityToken, rawNonce)
        └── Firebase перевіряє: SHA256(rawNonce) === hashedNonce від Apple ✓
```

#### Підписки (RevenueCat)
```
initPurchases() → Purchases.configure({ apiKey })
getOfferings() → RevenueCat offerings → PlanPackage[]
purchasePackage() → Purchases.purchasePackage() → setPremium()
checkSubscriptionStatus() → getCustomerInfo() → setPremium()
addCustomerInfoListener() → real-time оновлення статусу
```

#### Chat сесії (SQLite)
```
Zustand store НЕ зберігає чати
  └── chatDb.ts (SQLite)
        ├── initChatDb() → CREATE TABLE sessions, messages
        ├── importSessionsSync() → one-time migration з Zustand
        ├── clearAllSessionsSync() → очищення (privacy screen)
        └── CRUD: loadSessions, loadMessages, saveMessage, ...
```

---

## SEO-сайт (Next.js)

### Стек

| Шар | Технологія |
|-----|-----------|
| Фреймворк | Next.js 15 App Router |
| Мова | TypeScript |
| Стилі | Tailwind CSS v4 |
| Авторизація | Firebase Auth (client SDK) |
| AI | Claude API через Next.js API routes |
| i18n | `/uk/` та `/en/` сегменти |

### Структура

```
seo-website/src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── uk/                     # Українська версія
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Головна
│   │   ├── kalkulyator-matrytsi-doli/
│   │   ├── kalkulyator-sumisnosti/
│   │   ├── ai-chat/
│   │   │   ├── page.tsx
│   │   │   └── AiChatClient.tsx
│   │   ├── matrytsya-dnya/
│   │   ├── wiki/[slug]/
│   │   └── privacy/
│   └── en/                     # Англійська версія
├── components/
│   ├── Header.tsx              # nav (не header!) — важливо для тестів
│   ├── Footer.tsx
│   └── AuthModal.tsx           # div.fixed.inset-0 overlay
└── lib/
    ├── firebase.ts
    ├── i18n.ts
    └── authErrors.ts

seo-website/e2e/               # Playwright E2E тести
├── playwright.config.ts
├── tests/
│   ├── auth.spec.ts
│   ├── ai-chat.spec.ts
│   └── ...
└── pages/                     # Page Objects
    ├── HeaderComponent.ts
    ├── AuthModalPage.ts
    └── AiChatPage.ts
```

### Важливі особливості для тестів

- `Header.tsx` використовує `<nav>` як root (не `<header>`) → всі локатори через `nav`
- `AuthModal` — `div.fixed.inset-0` overlay, без `role="dialog"`
- Помилки — `div[class*="red-500"]` (Tailwind `bg-red-500/10`)
- Успіх — `div[class*="emerald-500"]`

---

## Backend (API)

```
api/                           # Node.js API сервер
├── package.json
└── routes/
    ├── /api/claude            # Claude AI proxy (з auth перевіркою)
    └── /api/text-to-speech   # ElevenLabs TTS proxy

server: yourmatrixofdestiny.com (89.167.40.15)
```

---

## Безпека

| Аспект | Рішення |
|--------|---------|
| Apple Sign-In nonce | SHA256 через expo-crypto (не Math.random) |
| ATT (iOS 14.5+) | requestTrackingPermissionsAsync() при першому запуску |
| Credentials | credentials.json, GoogleService-Info.plist — у .gitignore |
| Firebase keys | Публічні ідентифікатори (OK в source), секрети — server-side |
| RevenueCat keys | Публічні SDK keys (OK в source) |
| Chat sessions | SQLite, не Zustand — clearAllSessionsSync() для видалення |
| Account deletion | user.delete() → signOut() → store.logout() → /welcome |

---

## Локалізація

Підтримується **uk** (українська) та **en** (англійська).

- Мобільний: `locales/uk.ts`, `locales/en.ts` + `lib/i18n.tsx` провайдер
- Web: URL сегменти `/uk/` та `/en/`
- Визначення: системна мова пристрою або вибір у onboarding

---

## Builds & Deployment

```bash
# Мобільний (EAS)
eas build --platform ios --profile production
eas build --platform android --profile production

# SEO-сайт
cd seo-website && npm run build && npm start

# E2E тести (web)
cd seo-website && npx playwright test

# E2E тести (mobile, потребує симулятор)
npm run e2e:build:ios
npm run e2e:ios
```
