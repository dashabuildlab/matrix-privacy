# Matrix of Destiny — Проектна документація

## Огляд

**Matrix of Destiny** — форк оригінального застосунку з повністю видаленою Таро-функціональністю. Лишились нумерологічна Матриця Долі, AI-провідник, медитації, гейміфікація, навчальні ігри (без Таро-квізу) та щоденник. Темна космічна UI-тема збережена.

### Технології

| Технологія | Версія | Призначення |
|---|---|---|
| Expo | 54 | Фреймворк |
| React Native | 0.81.5 | UI |
| React | 19.1.0 | Компоненти |
| TypeScript | — | Типізація |
| Zustand | — | Стейт-менеджмент |
| Expo Router | — | Навігація (file-based routing) |
| expo-av / expo-video / expo-audio | — | Аудіо/відео |
| React Native SVG + Skia | — | Діаграма матриці, анімації |
| AsyncStorage + Expo SQLite + MMKV | — | Локальне сховище (чат, hot state, persisted state) |
| Firebase Auth + Analytics + Crashlytics | — | Авторизація та телеметрія |
| Claude API (Sonnet/Haiku) | — | AI-провідник |
| ElevenLabs (multilingual_v2) | — | Голос медитацій |
| RevenueCat | — | Підписки |

### Платформи
- **iOS** — Bundle ID: `com.matrixofsoul.myapp-`
- **Android** — Package: `com.matrixofsoul.app`
- **Web** — адаптивний (sidebar на десктопі)

---

## Структура проекту

```
matrix-of-destiny/
├── app/                          # Expo Router — всі екрани
│   ├── _layout.tsx              # Кореневий layout
│   ├── index.tsx                # Точка входу
│   ├── welcome.tsx              # Welcome з відео
│   ├── onboarding.tsx           # Онбординг
│   ├── paywall.tsx              # Підписка
│   ├── share.tsx                # Поширення
│   ├── (tabs)/                  # Таби (Today / Matrix / AI (прихований) / Learn / Profile)
│   ├── auth/                    # Авторизація (Firebase)
│   ├── matrix/                  # Екрани матриці (create, [id], compatibility, daily, referral)
│   ├── ai/                      # AI-чат (chat, history, conflict)
│   ├── learn/                   # Навчальні ігри (chakras, guess, match, memory, planets, quiz, signs, truefalse, matrix-guide)
│   ├── meditation/              # Плеєр медитацій
│   └── profile/                 # Налаштування, досягнення, історія, мова
├── components/                  # Переиспользовані компоненти
│   ├── ui/                      # Card, Button, StarBackground, WebSidebar, AIGuideButton…
│   └── matrix/                  # MatrixDiagram (SVG)
├── constants/                   # theme, energies, meditations, matrixTexts
├── hooks/                       # useResponsive
├── lib/                         # matrix-calc, claude, i18n, storage, fallbackData, staticData, syncSchema, firebaseAuth, chatDb, notifications, analytics, purchases, persistStorage…
├── stores/
│   └── useAppStore.ts           # Zustand global state
├── locales/                     # uk.ts, en.ts
├── assets/                      # avatar відео, 8 MP3 медитацій, іконки
├── api/                         # Node.js бекенд (server.js, Dockerfile, serviceAccountKey.json)
├── supabase/migrations/         # Чисті SQL-міграції (без tarot_cards / tarot_readings)
├── seo-website/                 # Next.js 14 SEO-сайт (без Таро-сторінок)
└── website/                     # Static HTML landing
```

---

## Навігація

### Таби (4 видимих + 1 прихований)

| Таб | Екран | Іконка | Опис |
|-----|-------|--------|------|
| Сьогодні | `(tabs)/index.tsx` | home | Щоденна енергія, афірмація, AI-порада, медитації, подарунок |
| Матриця | `(tabs)/matrix.tsx` | sparkles | Центральний хаб матриці |
| AI | `(tabs)/ai.tsx` | — | Прихований таб, використовується як shortcut |
| Навчання | `(tabs)/learn.tsx` | school | Енциклопедія + 6 ігор |
| Профіль | `(tabs)/profile.tsx` | person | Досягнення, XP, преміум, налаштування |

### Ключові маршрути

**Матриця:**
- `/matrix/create` — створення
- `/matrix/[id]` — деталі
- `/matrix/compatibility` — сумісність
- `/matrix/daily` — матриця дня
- `/matrix/referral` — реферали

**AI:**
- `/ai/chat` — чат
- `/ai/history` — сесії
- `/ai/conflict` — вирішення sync-конфліктів

**Навчання:**
- `/learn/matrix-guide`, `/learn/chakras`, `/learn/planets`, `/learn/signs` — гайди
- `/learn/guess`, `/learn/memory`, `/learn/match`, `/learn/quiz`, `/learn/truefalse` — ігри

**Профіль:**
- `/profile/account`, `/profile/achievements`, `/profile/history`, `/profile/language`, `/profile/notifications`, `/profile/privacy`, `/profile/about`

---

## Глобальний стейт (Zustand, `stores/useAppStore.ts`)

- **Auth:** `isAuthenticated`, `userId`
- **Profile:** `userName`, `userBirthDate`, `userGender`
- **Onboarding:** `knowledgeLevel`, `lifeFocus`, `onboardingCompleted`
- **Matrix:** `personalMatrix`, `matrixGenerated`, `savedMatrices`, `compatibilityReadings`, `dailyMatrixHistory`
- **AI:** `activeSessionId`, `pendingChatNav` (сесії — у SQLite)
- **Валюта:** `tokens`, `isPremium`, `premiumPlan`, `purchasedMeditationIds`
- **Гейміфікація:** `xp`, `level`, `streak`, `achievements`, `unlockedAchievementIds`, `viewedAchievementIds`, `meditationCount`, `likedMeditations`, `gameRecords`
- **Push / daily gift:** `firstOpenDate`, `pushEnabled`, `lastNotificationScheduledDate`, `lastGiftClaimedDate`, `consecutiveMissedGifts`, `pendingGift` (type=`matrix-ai`), `claimedGiftToday`
- **AI-кеш:** `aiCache` (24h TTL)
- **PDF-експорт:** `pendingAnalysis`
- **Legacy Таро-стаби:** `tarotSpreads` (порожній), `dailyCardHistory` (порожній), `dailyCardEnabled` (false), `addTarotSpread`/`recordDailyCard` (no-op) — залишені для сумісності зі старим UI-кодом до ре-роботи чату.

Persist: `matrix-of-destiny-v1`. Зберігається більшість полів через `fileStorage` (MMKV на native, localStorage на web).

---

## Бекенд API (`api/server.js`)

- `GET /health` — healthcheck
- `GET /api/sync/:userId` — повний state юзера (Firebase ID token required)
- `POST /api/sync/:userId` — upsert state
- `POST /api/claude` — проксі до Anthropic з retry на overload
- `POST /api/revenuecat-webhook` — вебхук підписок

## DB-схема (`supabase/migrations/`)

PostgreSQL, schema `app_matrixofsoul` (ім'я не мігровали щоб не ламати sync):
- `energies` — 22 статичні архетипи
- `user_profiles`, `user_sync` (state JSONB)
- `matrices`, `compatibility`
- `chat_sessions`, `chat_messages` (context: `general|matrix`)
- `meditations`, `moods`, `goals`, `meditation_sessions`

RLS: юзер керує своїми рядками, публічний read для статичних таблиць.

## Docker-compose

- `api` → порт 3100 (host network)
- `seo-website` → порт 3005 (Next.js static export, nginx)
- `landing` → порт 3015 (nginx + `./website`)

## Деплой

- Сервер: `89.167.40.15`
- Шлях: `/srv/apps/matrix-of-soul/` (провіжнено BuildLab'ом)
- Команда: `expo-tunnel.bat` з кореня проекту (rsync + docker compose up --build)
- Creds: `.env` (DATABASE_URL, CLAUDE_API_KEY, WEBHOOK_SECRET) + `deploy_key`

## Тема та стиль

- Dark cosmic: bg `#0D0B1E` / `#0A0A1A`
- Gold accent `#F5C542`
- Glassmorphism картки, SVG-зіркове тло
- Dark-mode only (`userInterfaceStyle: "dark"` в app.json)

---

## Легасі-примітки щодо видалення Таро

- Файли видалені: `app/tarot/**`, `components/tarot/**`, `constants/tarotData.ts`, `constants/tarotImages.ts`, `constants/minorArcana.ts`, `app/learn/tarot.tsx`, `components/ui/CardOfDayBlock.tsx`, `assets/tarot/`, усі `seo-website/src/app/**/tarot-online/`, `karta-dnya/`, `wiki/tarot-znachennya/`, `wiki/starshi-arkany/`.
- SQL-міграція `005_tarot_cards_expanded.sql` видалена; з інших міграцій прибрано `tarot_cards` і `tarot_readings`.
- Store-стаби для tarot полів зберігаються для сумісності зі старим кодом AI-чату до його ре-роботи.
- `AIChatSession.context` звужено до `matrix|general|destiny-matrix|daily-matrix`.
- Nginx у SEO містить 301-редиректи старих Таро-URL на відповідні локальні корені.
