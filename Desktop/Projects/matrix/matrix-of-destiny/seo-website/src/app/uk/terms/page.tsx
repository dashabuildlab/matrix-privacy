import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Умови використання — Matrix of Destiny',
  description: 'Умови використання додатку Matrix of Destiny',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-3xl font-black mb-2">Умови використання</h1>
        <p className="text-[var(--text-secondary)] mb-10">Останнє оновлення: 27 квітня 2026 р.</p>

        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">

          <h2 className="text-xl font-bold text-white mt-8">1. Прийняття умов</h2>
          <p>Використовуючи додаток Matrix of Destiny («Додаток») або відвідуючи наш веб-сайт, ви погоджуєтесь з цими Умовами використання. Якщо ви не погоджуєтесь, будь ласка, припиніть використання.</p>

          <h2 className="text-xl font-bold text-white mt-8">2. Опис послуги</h2>
          <p>Matrix of Destiny — це додаток для чисельного розрахунку Матриці долі, персоналізованих прогнозів та взаємодії з AI-провідником на основі дати народження. Додаток носить виключно розважально-освітній характер і не є медичною, психологічною або фінансовою консультацією.</p>

          <h2 className="text-xl font-bold text-white mt-8">3. Підписка та оплата</h2>
          <p>Преміум-функції доступні за підпискою через App Store (iOS) або Google Play (Android).</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Підписка автоматично поновлюється після закінчення кожного розрахункового циклу, якщо її не скасовано принаймні за 24 години до завершення поточного циклу.</li>
            <li>Оплата списується з акаунту App Store або Google Play після підтвердження покупки.</li>
            <li>Скасувати підписку можна в будь-який час у налаштуваннях App Store або Google Play.</li>
            <li>Часткове відшкодування за невикористаний період підписки не надається.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. Обліковий запис</h2>
          <p>Для доступу до персоналізованих функцій потрібна реєстрація. Ви несете відповідальність за конфіденційність даних свого облікового запису. Ви можете видалити свій акаунт у будь-який час через розділ «Налаштування акаунту» в Додатку.</p>

          <h2 className="text-xl font-bold text-white mt-8">5. Інтелектуальна власність</h2>
          <p>Весь контент Додатку, включаючи тексти, алгоритми, дизайн та AI-відповіді, є власністю Matrix of Destiny і захищений авторським правом. Забороняється копіювати, відтворювати або розповсюджувати контент без письмового дозволу.</p>

          <h2 className="text-xl font-bold text-white mt-8">6. Обмеження відповідальності</h2>
          <p>Додаток надається «як є». Ми не несемо відповідальності за рішення, прийняті на основі контенту Додатку. Прогнози та аналіз матриці є розважально-освітнім контентом і не є науково доведеними.</p>

          <h2 className="text-xl font-bold text-white mt-8">7. Конфіденційність</h2>
          <p>Збір та обробка персональних даних регулюється нашою <a href="/uk/privacy" className="text-purple-400 underline">Політикою конфіденційності</a>.</p>

          <h2 className="text-xl font-bold text-white mt-8">8. Зміни умов</h2>
          <p>Ми залишаємо за собою право змінювати ці Умови. Про суттєві зміни ми повідомлятимемо через Додаток або email. Продовження використання після змін означає прийняття нових Умов.</p>

          <h2 className="text-xl font-bold text-white mt-8">9. Контакти</h2>
          <p>З питань щодо цих Умов звертайтесь: <a href="mailto:support@yourmatrixofdestiny.com" className="text-purple-400 underline">support@yourmatrixofdestiny.com</a></p>

        </div>
      </div>
    </section>
  );
}
