import type { Locale } from '@/lib/i18n';

const messages: Record<Locale, Record<string, string>> = {
  uk: {
    'auth/email-already-in-use': 'Ця пошта вже зареєстрована',
    'auth/invalid-email': 'Невірний формат email',
    'auth/weak-password': 'Пароль занадто слабкий (мін. 6 символів)',
    'auth/user-not-found': 'Акаунт з такою поштою не знайдено',
    'auth/wrong-password': 'Невірний пароль',
    'auth/invalid-credential': 'Невірний email або пароль',
    'auth/too-many-requests': 'Забагато спроб. Спробуйте пізніше',
    'auth/network-request-failed': "Немає з'єднання з інтернетом",
    'auth/user-disabled': 'Акаунт заблоковано',
    'auth/operation-not-allowed': 'Вхід через email/пароль не підтримується',
    'auth/popup-closed-by-user': 'Вікно входу було закрито',
    'auth/popup-blocked': 'Браузер заблокував popup. Дозвольте pop-ups для сайту.',
    'auth/cancelled-popup-request': 'Запит скасовано',
    'auth/unauthorized-domain': 'Домен не авторизований у Firebase.',
    'auth/missing-email': 'Введіть email',
  },
  en: {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email format',
    'auth/weak-password': 'Password is too weak (min. 6 characters)',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Try again later',
    'auth/network-request-failed': 'No internet connection',
    'auth/user-disabled': 'Account disabled',
    'auth/operation-not-allowed': 'Email/password sign-in is not supported',
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/popup-blocked': 'Browser blocked the popup. Please allow pop-ups for this site.',
    'auth/cancelled-popup-request': 'Request cancelled',
    'auth/unauthorized-domain': 'Domain not authorized in Firebase.',
    'auth/missing-email': 'Enter your email',
  },
};

const fallback: Record<Locale, string> = {
  uk: 'Щось пішло не так. Спробуйте ще раз.',
  en: 'Something went wrong. Please try again.',
};

export function getAuthErrorMessage(
  errorOrCode: string | { code?: string; message?: string } | null | undefined,
  locale: Locale = 'uk',
): string {
  const code =
    typeof errorOrCode === 'string' ? errorOrCode : errorOrCode?.code ?? '';
  const rawMessage =
    typeof errorOrCode === 'string' ? '' : errorOrCode?.message ?? '';

  const msgs = messages[locale];
  if (msgs[code]) return msgs[code];
  const detail = code || rawMessage || '';
  return detail ? `${fallback[locale]}\n\n${detail}` : fallback[locale];
}
