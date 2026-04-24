import type { Metadata } from 'next';
import SchemaOrg from '@/components/SchemaOrg';
import MatrixCalculator from '@/components/MatrixCalculator';

export const metadata: Metadata = {
  title: 'Калькулятор Матриці Долі онлайн — розрахунок за датою народження',
  description: 'Введи дату народження і отримай повну Матрицю Долі безкоштовно. Дізнайся призначення, таланти, карму і сумісність з партнером. ✦',
  alternates: {
    canonical: 'https://matrixofdestinytarot.com/uk/kalkulyator-matrytsi-doli/',
    languages: {
      uk: '/uk/kalkulyator-matrytsi-doli/',
      en: '/en/kalkulyator-matrytsi-doli/',
    },
  },
  openGraph: {
    title: 'Калькулятор Матриці Долі онлайн — розрахунок за датою народження',
    description: 'Введи дату народження і отримай повну Матрицю Долі безкоштовно. Дізнайся призначення, таланти, карму і сумісність.',
    url: 'https://matrixofdestinytarot.com/uk/kalkulyator-matrytsi-doli/',
  },
};

export default function CalculatorPage() {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Як розрахувати Матрицю Долі онлайн',
    description: 'Покрокова інструкція для розрахунку Матриці Долі за датою народження',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Введіть дату народження',
        text: 'Вкажіть свій день, місяць та рік народження у калькуляторі',
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Натисніть "Розрахувати"',
        text: 'Система автоматично розрахує всі позиції вашої Матриці Долі',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Отримайте результат',
        text: 'Перегляньте свою Матрицю Долі з описом кожної з 22 енергій',
        position: 3,
      },
    ],
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Калькулятор Матриці Долі',
    url: 'https://matrixofdestinytarot.com/uk/kalkulyator-matrytsi-doli/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'UAH' },
    inLanguage: 'uk',
    description: 'Безкоштовний онлайн калькулятор Матриці Долі. Розрахунок за датою народження.',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://matrixofdestinytarot.com/uk/' },
      { '@type': 'ListItem', position: 2, name: 'Калькулятор Матриці Долі', item: 'https://matrixofdestinytarot.com/uk/kalkulyator-matrytsi-doli/' },
    ],
  };

  return (
    <>
      <SchemaOrg schema={[howToSchema, webAppSchema, breadcrumbSchema]} />

      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Breadcrumbs */}
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/uk/" className="hover:text-white transition-colors no-underline">Головна</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">Калькулятор Матриці Долі</span>
          </nav>

          <div className="text-center mb-12">
            <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-4">
              Калькулятор <span className="text-[var(--accent)]">Матриці Долі</span> онлайн
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Введіть дату народження і отримайте повну Матрицю Долі безкоштовно.
              Дізнайтесь своє призначення, таланти, карму та сумісність з партнером.
            </p>
          </div>

          <MatrixCalculator locale="uk" />

          {/* SEO content below calculator */}
          <div className="max-w-3xl mx-auto mt-20">
            <div className="section-divider mb-12" />
            <h2 className="text-2xl font-black mb-6">Що таке Матриця Долі?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Матриця Долі — це унікальний метод самопізнання, заснований на 22 енергіях-архетипах.
              За допомогою простого розрахунку за датою народження ви можете дізнатися про свої головні
              життєві завдання, таланти, кармічні уроки та призначення.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Кожне число від 1 до 22 відповідає певному архетипу і несе в собі унікальну енергію.
              Ця енергія може проявлятися як у позитивному, так і в негативному аспекті —
              все залежить від рівня усвідомленості людини.
            </p>

            <h2 className="text-2xl font-black mb-6 mt-12">Як працює калькулятор?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Наш калькулятор автоматично розраховує всі ключові позиції вашої Матриці Долі:
            </p>
            <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Особистість</strong> — ваш характер та основна енергія</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Душа</strong> — глибинні бажання та потреби вашої душі</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Призначення</strong> — ваше головне життєве завдання</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Кармічний хвіст</strong> — уроки з минулих життів</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Таланти</strong> — природні здібності та дари</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Духовна та матеріальна лінії</strong> — баланс духовного та матеріального</li>
            </ul>

            <h2 className="text-2xl font-black mb-6 mt-12">Формула розрахунку</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Для розрахунку використовуються три базових числа: день народження, місяць і сума цифр року.
              Кожне число зводиться до діапазону 1-22 (якщо число більше 22, його цифри складаються).
              Потім за спеціальними формулами розраховуються всі інші позиції матриці.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
