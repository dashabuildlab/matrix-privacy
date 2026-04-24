import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description: 'Політика конфіденційності сайту matrixofdestinytarot.com',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-3xl font-black mb-8">Політика конфіденційності</h1>
        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">
          <p>Останнє оновлення: {new Date().toLocaleDateString('uk-UA')}</p>
          <h2 className="text-xl font-bold text-white mt-8">1. Збір інформації</h2>
          <p>Ми збираємо мінімальну кількість інформації, необхідну для роботи сервісу. Дата народження, яку ви вводите для розрахунку Матриці Долі, не зберігається на наших серверах і обробляється виключно у вашому браузері.</p>
          <h2 className="text-xl font-bold text-white mt-8">2. Файли cookie</h2>
          <p>Ми використовуємо файли cookie для аналітики (Google Analytics) та покращення роботи сайту. Ви можете відключити cookie у налаштуваннях вашого браузера.</p>
          <h2 className="text-xl font-bold text-white mt-8">3. Аналітика</h2>
          <p>Ми використовуємо Google Analytics для збору анонімної статистики відвідувань. Ця інформація допомагає нам покращувати сайт.</p>
          <h2 className="text-xl font-bold text-white mt-8">4. Контакти</h2>
          <p>З питань конфіденційності звертайтесь на email, вказаний на сторінці контактів.</p>
        </div>
      </div>
    </section>
  );
}
