import type { Metadata } from 'next';
import SchemaOrg from '@/components/SchemaOrg';
import CompatibilityCalculator from '@/components/CompatibilityCalculator';

export const metadata: Metadata = {
  title: 'Сумісність за Матрицею Долі — перевір свою пару безкоштовно',
  description: 'Введіть дати народження двох людей і дізнайся сумісність за Матрицею Долі. Любов, карма, спільне призначення і виклики.',
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/uk/kalkulyator-sumisnosti/',
    languages: { uk: '/uk/kalkulyator-sumisnosti/', en: '/en/kalkulyator-sumisnosti/' },
  },
};

export default function CompatibilityPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://yourmatrixofdestiny.com/uk/' },
      { '@type': 'ListItem', position: 2, name: 'Калькулятор сумісності', item: 'https://yourmatrixofdestiny.com/uk/kalkulyator-sumisnosti/' },
    ],
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Калькулятор Сумісності за Матрицею Долі',
    url: 'https://yourmatrixofdestiny.com/uk/kalkulyator-sumisnosti/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'UAH' },
  };

  return (
    <>
      <SchemaOrg schema={[breadcrumbSchema, webAppSchema]} />
      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/uk/" className="hover:text-white transition-colors no-underline">Головна</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">Калькулятор Сумісності</span>
          </nav>

          <div className="text-center mb-12">
            <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-4">
              Сумісність за <span className="text-[var(--accent)]">Матрицею Долі</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Введіть дати народження двох людей і дізнайтесь сумісність за Матрицею Долі.
              Любов, карма, спільне призначення і виклики.
            </p>
          </div>

          <CompatibilityCalculator locale="uk" />

          {/* SEO content */}
          <div className="max-w-3xl mx-auto mt-20">
            <div className="section-divider mb-12" />
            <h2 className="text-2xl font-black mb-6">Як працює сумісність за Матрицею Долі?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Калькулятор сумісності порівнює ключові позиції Матриць Долі двох людей.
              Система аналізує чотири основні аспекти: загальну сумісність (порівняння особистостей),
              зв&apos;язок душ, зв&apos;язок призначень та кармічний урок, який пара має пройти разом.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Кожен аспект виражається числом від 1 до 22, що відповідає одному з 22 архетипів енергій.
              Це число розкриває характер взаємодії між партнерами у конкретній сфері.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
