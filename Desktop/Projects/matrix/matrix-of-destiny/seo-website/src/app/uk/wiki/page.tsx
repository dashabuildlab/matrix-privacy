import type { Metadata } from 'next';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import { ENERGIES } from '@/lib/energies';

export const metadata: Metadata = {
  title: 'Вікі Матриці Долі — все про 22 енергії та значення позицій',
  description: 'Повний довідник по Матриці Долі: 22 енергії, зони грошей, здоров\'я, карми, талантів. Детальний опис кожного числа від 1 до 22.',
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/uk/wiki/',
    languages: { uk: '/uk/wiki/', en: '/en/wiki/' },
  },
};

export default function WikiPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://yourmatrixofdestiny.com/uk/' },
      { '@type': 'ListItem', position: 2, name: 'Вікі', item: 'https://yourmatrixofdestiny.com/uk/wiki/' },
    ],
  };

  const zones = [
    { title: 'Що таке Матриця Долі?', slug: 'scho-take-matrytsya-doli', desc: 'Повний гайд для початківців — що це, як працює і для чого потрібна' },
    { title: 'Як розрахувати Матрицю Долі', slug: 'yak-rozrakhuvaty', desc: 'Покрокова інструкція з формулами та прикладами розрахунку' },
  ];

  return (
    <>
      <SchemaOrg schema={breadcrumbSchema} />

      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/uk/" className="hover:text-white transition-colors no-underline">Головна</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">Вікі</span>
          </nav>

          <div className="text-center mb-16">
            <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-4">
              Вікі <span className="text-[var(--accent)]">Матриці Долі</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Все про 22 енергії, зони матриці та значення кожної позиції. Повний довідник для самопізнання.
            </p>
          </div>

          {/* Articles */}
          <div className="mb-16">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-[var(--accent)]">📖</span> Статті
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {zones.map(z => (
                <Link key={z.slug} href={`/uk/wiki/${z.slug}/`} className="glass-card p-6 no-underline block">
                  <h3 className="text-lg font-bold text-white mb-2">{z.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{z.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* 22 Energies */}
          <div>
            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-[var(--accent)]">✦</span> 22 енергії матриці
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ENERGIES.map(energy => (
                <Link
                  key={energy.id}
                  href={`/uk/wiki/${energy.slug}/`}
                  className="glass-card p-6 no-underline block group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="energy-badge">{energy.id}</div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                        {energy.name}
                      </h3>
                      <div className="text-xs text-[var(--text-muted)]">{energy.arcana} &middot; {energy.planet}</div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {energy.keywords.join(', ')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
