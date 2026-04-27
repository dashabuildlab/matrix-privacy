import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore } from '@/stores/useAppStore';
import { trackPushPermissionPrompt, trackPushPermissionResult } from '@/lib/analytics';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Platform.OS === 'web' || isExpoGo) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
}

if (Platform.OS !== 'web' && !isExpoGo) {
  getNotifications().then((N) => {
    N?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}

const GIFT_CHANNEL_ID    = 'daily-gift';
const DAILY_CARD_CHANNEL_ID = 'daily-card';
const SMART_CHANNEL_ID   = 'smart-monetization';
const GIFT_DIAMONDS = 3;

export { GIFT_DIAMONDS };

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;

  trackPushPermissionPrompt();
  const { status } = await N.requestPermissionsAsync();
  const granted = status === 'granted';
  trackPushPermissionResult(granted ? 'granted' : 'denied');
  return granted;
}

export async function setupNotificationChannels(locale?: string) {
  const N = await getNotifications();
  if (!N || Platform.OS !== 'android') return;

  const isUk = locale === 'uk';

  await N.setNotificationChannelAsync(GIFT_CHANNEL_ID, {
    name: isUk ? 'Щоденний подарунок' : 'Daily Gift',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
  });

  await N.setNotificationChannelAsync(DAILY_CARD_CHANNEL_ID, {
    name: isUk ? 'Карта дня' : 'Daily Card',
    importance: N.AndroidImportance.DEFAULT,
    lightColor: '#8B5CF6',
  });

  await N.setNotificationChannelAsync(SMART_CHANNEL_ID, {
    name: isUk ? 'Рекомендації' : 'Insights',
    importance: N.AndroidImportance.DEFAULT,
    lightColor: '#F5C542',
  });
}

async function cancelNotificationsByType(type: string) {
  const N = await getNotifications();
  if (!N) return;
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === type)
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function cancelGiftNotifications() {
  await cancelNotificationsByType('daily-gift');
}

export async function cancelDailyCardNotification() {
  await cancelNotificationsByType('daily-card');
}

export async function cancelAllAppNotifications() {
  const N = await getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

// ── Adaptive interval ────────────────────────────────────────────────────────
// Розраховує інтервал між пушами (в днях) на основі активності користувача.
// Чим менше реагує — тим рідше надсилаємо, щоб не вимкнув сповіщення.
//
//  ignoredCount   intervalDays
//  0–2            1  (щодня)
//  3–4            2  (кожні 2 дні)
//  5+             3  (кожні 3 дні)

function getAdaptiveIntervalDays(ignoredCount: number): number {
  if (ignoredCount >= 5) return 3;
  if (ignoredCount >= 3) return 2;
  return 1;
}

// ── Розклад одного щоденного пушу ────────────────────────────────────────────
// Якщо intervalDays = 1 → DAILY trigger (точний час щодня)
// Якщо intervalDays > 1 → TIME_INTERVAL trigger (рідше)

async function scheduleOneDaily(
  N: typeof import('expo-notifications'),
  content: object,
  hour: number,
  minute: number,
  intervalDays: number
) {
  if (intervalDays === 1) {
    await N.scheduleNotificationAsync({
      content,
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } else {
    await N.scheduleNotificationAsync({
      content,
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalDays * 24 * 60 * 60,
        repeats: true,
      },
    });
  }
}

// ── Non-premium: 1 пуш на день — подарунок із закликом до дії ───────────────
// Адаптивна частота на основі consecutiveMissedGifts (кількість днів без відкриття подарунку)

export async function scheduleDailyGiftNotification(locale: string) {
  const N = await getNotifications();
  if (!N) return;

  const state = useAppStore.getState();
  if (!state.pushEnabled) return;
  if (!state.firstOpenDate) return;

  // Подарунки не релевантні для преміум користувачів
  if (state.isPremium) return;

  await cancelNotificationsByType('daily-gift');

  const intervalDays = getAdaptiveIntervalDays(state.consecutiveMissedGifts);
  const isUk = locale === 'uk';

  const content = {
    title: isUk ? '🎁 У тебе є подарунок!' : '🎁 You have a gift!',
    body: isUk
      ? 'Безкоштовний AI-аналіз Матриці Дня чекає на тебе. Зайди, поки не згорів опівночі!'
      : 'A free AI Matrix-of-Day reading is waiting for you. Come claim it before midnight!',
    data: { type: 'daily-gift', giftType: 'matrix-ai' },
    ...(Platform.OS === 'android' ? { channelId: GIFT_CHANNEL_ID } : {}),
  };

  await scheduleOneDaily(N, content, 10, 0, intervalDays);
}

// ── Premium: 1 пуш на день — заклик до дії без подарунку ────────────────────
// Адаптивна частота на основі consecutiveMissedGifts як загального індикатора активності.

export async function schedulePremiumEngagementNotification(locale: string) {
  const N = await getNotifications();
  if (!N) return;

  const state = useAppStore.getState();
  if (!state.pushEnabled) return;
  if (!state.isPremium) return;

  // Очищаємо всі старі smart пуші
  await cancelNotificationsByType('smart-matrix');
  await cancelNotificationsByType('smart-premium-morning');
  await cancelNotificationsByType('smart-premium-evening');
  await cancelNotificationsByType('smart-premium');

  const intervalDays = getAdaptiveIntervalDays(state.consecutiveMissedGifts);
  const isUk = locale === 'uk';

  const personalMatrix = state.personalMatrix;
  const personalityNum = personalMatrix?.personality;

  const content = {
    title: isUk ? '✨ Матриця Дня' : '✨ Matrix of the Day',
    body: personalityNum
      ? (isUk
        ? `Енергія ${personalityNum} активна сьогодні. Побудуй Матрицю Дня.`
        : `Energy ${personalityNum} is active today. Build your Matrix of Day.`)
      : (isUk
        ? 'Твої енергії сьогодні особливі. Подивись у Матриці Дня.'
        : 'Your energies are special today. Check your Matrix of Day.'),
    data: { type: 'smart-premium' },
    ...(Platform.OS === 'android' ? { channelId: SMART_CHANNEL_ID } : {}),
  };

  await scheduleOneDaily(N, content, 9, 0, intervalDays);
}

// ── Daily Card (окремий канал, за бажанням користувача) ──────────────────────

export async function scheduleDailyCardNotification(locale: string) {
  const N = await getNotifications();
  if (!N) return;

  const state = useAppStore.getState();
  if (!state.dailyEnergyEnabled) return;
  if (!state.pushEnabled) return;

  await cancelNotificationsByType('daily-card');

  const isUk = locale === 'uk';

  await N.scheduleNotificationAsync({
    content: {
      title: isUk ? 'Енергія дня' : 'Energy of the Day',
      body: isUk
        ? 'Ваша щоденна енергія вже чекає на вас!'
        : 'Your daily energy is waiting for you!',
      data: { type: 'daily-card' },
      ...(Platform.OS === 'android' ? { channelId: DAILY_CARD_CHANNEL_ID } : {}),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

// ── Initialization ────────────────────────────────────────────────────────────
// Запускається при кожному відкритті додатку.
// Guard: перепланує не частіше 1 разу на день.
//
// Логіка:
//   Non-premium → 1 пуш/день: подарунок (адаптивна частота)
//   Premium     → 1 пуш/день: engagement (адаптивна частота, без подарунку)
//   Daily card  → окремо, якщо увімкнено користувачем (обидва типи)

export async function initializeNotifications(locale: string) {
  if (Platform.OS === 'web') return;

  const state = useAppStore.getState();
  const today = new Date().toISOString().split('T')[0];

  // ── Перше відкриття ──
  if (!state.firstOpenDate) {
    state.setFirstOpenDate(today);
    const granted = await requestNotificationPermissions();
    if (granted) {
      await setupNotificationChannels(locale);

      if (state.isPremium) {
        await schedulePremiumEngagementNotification(locale);
      } else {
        await scheduleDailyGiftNotification(locale);
      }

      await scheduleDailyCardNotification(locale);
      state.setLastNotificationScheduledDate(today);
    }
    return;
  }

  // ── Guard: вже заплановано сьогодні ──
  if (state.lastNotificationScheduledDate === today) return;

  // ── Перевірка активності (тільки для non-premium) ──
  if (!state.isPremium) {
    if (state.lastGiftClaimedDate) {
      const lastClaimed = new Date(state.lastGiftClaimedDate);
      const diffDays = Math.floor((Date.now() - lastClaimed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        useAppStore.getState().incrementMissedGifts();
      }
    } else if (state.firstOpenDate < today) {
      useAppStore.getState().incrementMissedGifts();
    }
  }

  // ── Перепланувати ──
  if (state.pushEnabled) {
    const granted = await requestNotificationPermissions();
    if (granted) {
      await setupNotificationChannels(locale);

      // Скасовуємо застарілі пуші іншого типу (при зміні статусу підписки)
      if (state.isPremium) {
        await cancelNotificationsByType('daily-gift');
        await schedulePremiumEngagementNotification(locale);
      } else {
        await cancelNotificationsByType('smart-premium');
        await cancelNotificationsByType('smart-premium-morning');
        await cancelNotificationsByType('smart-premium-evening');
        await scheduleDailyGiftNotification(locale);
      }

      await scheduleDailyCardNotification(locale);
      state.setLastNotificationScheduledDate(today);
    }
  }
}
