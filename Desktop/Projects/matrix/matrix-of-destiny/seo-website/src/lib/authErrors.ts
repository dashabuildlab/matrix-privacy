export function getAuthErrorMessage(
  errorOrCode: string | { code?: string; message?: string } | null | undefined,
): string {
  const code =
    typeof errorOrCode === 'string' ? errorOrCode : errorOrCode?.code ?? '';
  const rawMessage =
    typeof errorOrCode === 'string' ? '' : errorOrCode?.message ?? '';

  const msgs: Record<string, string> = {
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
  };

  if (msgs[code]) return msgs[code];
  const detail = code || rawMessage || '';
  return detail
    ? `Щось пішло не так. Спробуйте ще раз.\n\n${detail}`
    : 'Щось пішло не так. Спробуйте ще раз.';
}
