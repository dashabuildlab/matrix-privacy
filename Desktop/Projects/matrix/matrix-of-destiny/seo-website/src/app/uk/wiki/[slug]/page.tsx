import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SchemaOrg from '@/components/SchemaOrg';
import { ENERGIES, getEnergyBySlug } from '@/lib/energies';

// Static articles
const STATIC_ARTICLES: Record<string, {
  title: string;
  metaTitle: string;
  metaDesc: string;
  content: () => React.ReactElement;
}> = {
  'scho-take-matrytsya-doli': {
    title: 'Що таке Матриця Долі?',
    metaTitle: 'Що таке Матриця Долі — повний гайд для початківців',
    metaDesc: 'Дізнайтеся що таке Матриця Долі, як вона працює і як допоможе зрозуміти ваше призначення. Повний гайд з поясненнями всіх позицій.',
    content: WhatIsArticle,
  },
  'yak-rozrakhuvaty': {
    title: 'Як розрахувати Матрицю Долі',
    metaTitle: 'Як розрахувати Матрицю Долі самостійно — покрокова інструкція',
    metaDesc: 'Покрокова інструкція як розрахувати Матрицю Долі за датою народження. Формули, приклади та пояснення кожної позиції.',
    content: HowToCalcArticle,
  },
};

export function generateStaticParams() {
  const energySlugs = ENERGIES.map(e => ({ slug: e.slug }));
  const articleSlugs = Object.keys(STATIC_ARTICLES).map(slug => ({ slug }));
  return [...energySlugs, ...articleSlugs];
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const energy = getEnergyBySlug(slug);
    if (energy) {
      return {
        title: `${energy.name} (${energy.id}) — Енергія Матриці Долі | ${energy.arcana}`,
        description: `${energy.name} в Матриці Долі: ${energy.keywords.join(', ')}. ${energy.positive.slice(0, 120)}...`,
        alternates: {
          canonical: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/`,
          languages: { uk: `/uk/wiki/${slug}/`, en: `/en/wiki/${slug}/` },
        },
        openGraph: {
          title: `${energy.name} — Енергія ${energy.id} Матриці Долі`,
          description: `${energy.positive.slice(0, 150)}`,
        },
      };
    }

    const article = STATIC_ARTICLES[slug];
    if (article) {
      return {
        title: article.metaTitle,
        description: article.metaDesc,
        alternates: {
          canonical: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/`,
          languages: { uk: `/uk/wiki/${slug}/`, en: `/en/wiki/${slug}/` },
        },
      };
    }

    return { title: 'Not Found' };
  });
}

export default async function WikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const energy = getEnergyBySlug(slug);
  const article = STATIC_ARTICLES[slug];

  if (!energy && !article) notFound();

  if (article) {
    const ArticleContent = article.content;
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      url: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/`,
      inLanguage: 'uk',
      publisher: { '@type': 'Organization', name: 'Matrix of Destiny' },
    };
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://yourmatrixofdestiny.com/uk/' },
        { '@type': 'ListItem', position: 2, name: 'Вікі', item: 'https://yourmatrixofdestiny.com/uk/wiki/' },
        { '@type': 'ListItem', position: 3, name: article.title, item: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/` },
      ],
    };
    return (
      <>
        <SchemaOrg schema={[articleSchema, breadcrumbSchema]} />
        <section className="py-16 px-6">
          <div className="max-w-[800px] mx-auto">
            <nav className="text-sm text-[var(--text-muted)] mb-8">
              <a href="/uk/" className="hover:text-white transition-colors no-underline">Головна</a>
              <span className="mx-2">/</span>
              <a href="/uk/wiki/" className="hover:text-white transition-colors no-underline">Вікі</a>
              <span className="mx-2">/</span>
              <span className="text-[var(--primary-light)]">{article.title}</span>
            </nav>
            <ArticleContent />
          </div>
        </section>
      </>
    );
  }

  // Energy article
  const e = energy!;
  const faqItems = [
    { q: `Що означає число ${e.id} в Матриці Долі?`, a: `Число ${e.id} в Матриці Долі відповідає аркану "${e.name}" (${e.arcana}). Ключові слова: ${e.keywords.join(', ')}. ${e.positive}` },
    { q: `Яка планета відповідає енергії ${e.name}?`, a: `Енергія ${e.name} (${e.id}) пов'язана з планетою ${e.planet}. Ця планета посилює якості цієї енергії та впливає на її прояв у житті людини.` },
    { q: `Як проявляється негативний аспект енергії ${e.name}?`, a: e.negative },
    { q: `Яка порада для людей з енергією ${e.name}?`, a: e.advice },
    { q: `В яких позиціях матриці може бути число ${e.id}?`, a: `Число ${e.id} (${e.name}) може з'явитися в будь-якій позиції Матриці Долі: особистість, душа, призначення, таланти, кармічний хвіст та інших. Значення енергії частково залежить від позиції, в якій вона знаходиться.` },
  ];

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${e.name} — Енергія ${e.id} в Матриці Долі`,
    description: `${e.positive.slice(0, 150)}`,
    url: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/`,
    inLanguage: 'uk',
    publisher: { '@type': 'Organization', name: 'Matrix of Destiny' },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://yourmatrixofdestiny.com/uk/' },
      { '@type': 'ListItem', position: 2, name: 'Вікі', item: 'https://yourmatrixofdestiny.com/uk/wiki/' },
      { '@type': 'ListItem', position: 3, name: `${e.name} (${e.id})`, item: `https://yourmatrixofdestiny.com/uk/wiki/${slug}/` },
    ],
  };

  // Adjacent energies for navigation
  const prevEnergy = ENERGIES.find(en => en.id === e.id - 1) || ENERGIES[ENERGIES.length - 1];
  const nextEnergy = ENERGIES.find(en => en.id === e.id + 1) || ENERGIES[0];

  return (
    <>
      <SchemaOrg schema={[articleSchema, faqSchema, breadcrumbSchema]} />

      <section className="py-16 px-6">
        <div className="max-w-[800px] mx-auto">
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/uk/" className="hover:text-white transition-colors no-underline">Головна</a>
            <span className="mx-2">/</span>
            <a href="/uk/wiki/" className="hover:text-white transition-colors no-underline">Вікі</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">{e.name} ({e.id})</span>
          </nav>

          {/* Header */}
          <div className="flex items-center gap-6 mb-10">
            <div className="energy-badge w-20 h-20 text-3xl glow-purple">{e.id}</div>
            <div>
              <h1 className="text-[clamp(28px,4vw,42px)] font-black tracking-tight">
                {e.name} <span className="text-[var(--text-muted)] font-normal text-2xl">— {e.arcana}</span>
              </h1>
              <div className="text-[var(--text-muted)] mt-1">Число {e.id} в Матриці Долі &middot; Планета: {e.planet}</div>
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-2 mb-10">
            {e.keywords.map(kw => (
              <span key={kw} className="px-4 py-1.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--primary-light)]">
                {kw}
              </span>
            ))}
          </div>

          {/* Content sections */}
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <span className="text-green-400">+</span> Позитивний прояв
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg">{e.positive}</p>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <span className="text-red-400">-</span> Негативний прояв
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg">{e.negative}</p>
            </div>

            <div className="glass-card p-8 hover:transform-none">
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <span className="text-[var(--accent)]">✦</span> Порада
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg">{e.advice}</p>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4">Планета: {e.planet}</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Енергія {e.name} пов&apos;язана з планетою {e.planet}. Ця планетарна
                вібрація посилює характеристики аркану та визначає, як саме ця енергія
                проявляється у повсякденному житті людини.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-black mb-8">Часті питання про число {e.id} ({e.name})</h2>
            {faqItems.map((item, i) => (
              <div key={i} className="faq-item">
                <h3 className="text-lg font-bold text-white mb-3">{item.q}</h3>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-16 pt-8 border-t border-[var(--border)]">
            <Link href={`/uk/wiki/${prevEnergy.slug}/`} className="btn-secondary text-sm">
              ← {prevEnergy.id}. {prevEnergy.name}
            </Link>
            <Link href="/uk/wiki/" className="text-sm text-[var(--text-muted)] no-underline hover:text-white transition-colors">
              Всі енергії
            </Link>
            <Link href={`/uk/wiki/${nextEnergy.slug}/`} className="btn-secondary text-sm">
              {nextEnergy.id}. {nextEnergy.name} →
            </Link>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link href="/uk/kalkulyator-matrytsi-doli/" className="btn-primary text-lg px-8 py-4">
              Розрахувати свою Матрицю Долі →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Static article components
function WhatIsArticle() {
  return (
    <article>
      <h1 className="text-[clamp(28px,4vw,42px)] font-black tracking-tight mb-6">
        Що таке <span className="text-[var(--accent)]">Матриця Долі</span>?
      </h1>

      <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
        Матриця Долі — це сучасний метод самопізнання та духовного розвитку, який об&apos;єднує мудрість
        22 архетипів-енергій із числовими вібраціями дати народження. Цей потужний інструмент
        дозволяє розкрити глибинну інформацію про вашу особистість, призначення, таланти та кармічні уроки.
      </p>

      <h2 className="text-2xl font-black mb-4 mt-10">Історія та походження</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
        Метод Матриці Долі базується на давніх знаннях про 22 архетипи-енергії, які
        символізують 22 основні архетипи людського досвіду. Кожна енергія несе в собі
        унікальну мудрість, яка допомагає зрозуміти різні аспекти життя.
      </p>

      <h2 className="text-2xl font-black mb-4 mt-10">Як працює Матриця Долі?</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
        В основі методу лежить проста ідея: кожна дата народження несе в собі числовий код,
        який можна розшифрувати через призму 22 архетипів. Дата народження — це не
        випадковість, а точка входу вашої душі в цей світ з певним набором завдань і можливостей.
      </p>

      <h2 className="text-2xl font-black mb-4 mt-10">Ключові позиції Матриці</h2>
      <ul className="text-[var(--text-secondary)] leading-relaxed space-y-4 mb-6 list-none">
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Особистість</strong> — визначає ваш характер, темперамент та спосіб взаємодії зі світом. Це те, як вас бачать інші люди.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Душа</strong> — показує глибинні потреби та бажання вашої душі, те, що дійсно важливо для вашого внутрішнього щастя.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Призначення</strong> — розкриває ваше головне життєве завдання, місію, заради якої ви прийшли в цей світ.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Духовна лінія</strong> — показує шлях вашого духовного розвитку та потенціал зростання.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Матеріальна лінія</strong> — визначає вашу здатність до матеріального достатку та фінансового успіху.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Таланти</strong> — розкриває ваші природні здібності та дари, як від Бога, так і від роду.</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Кармічний хвіст</strong> — показує уроки з минулих інкарнацій, які потрібно опрацювати в цьому житті.</li>
      </ul>

      <h2 className="text-2xl font-black mb-4 mt-10">Чим Матриця Долі відрізняється від нумерології?</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
        На відміну від класичної нумерології, яка працює з числами 1-9, Матриця Долі використовує
        розширений діапазон від 1 до 22, що відповідає 22 архетипам-енергіям. Це дає значно
        більш детальну та багатогранну картину особистості та долі людини.
      </p>

      <h2 className="text-2xl font-black mb-4 mt-10">Для чого використовувати Матрицю Долі?</h2>
      <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Зрозуміти свої сильні та слабкі сторони</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Дізнатися про свої приховані таланти</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Розкрити кармічні уроки та завдання</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Перевірити сумісність з партнером</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Зрозуміти своє життєве призначення</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> Покращити стосунки з близькими</li>
      </ul>

      <div className="glass-card p-8 mt-10 text-center hover:transform-none">
        <h3 className="text-xl font-black mb-3">Спробуйте прямо зараз!</h3>
        <p className="text-[var(--text-secondary)] mb-6">
          Розрахуйте свою Матрицю Долі безкоштовно і дізнайтеся про своє призначення
        </p>
        <Link href="/uk/kalkulyator-matrytsi-doli/" className="btn-primary">
          Розрахувати Матрицю Долі →
        </Link>
      </div>
    </article>
  );
}

function HowToCalcArticle() {
  return (
    <article>
      <h1 className="text-[clamp(28px,4vw,42px)] font-black tracking-tight mb-6">
        Як розрахувати <span className="text-[var(--accent)]">Матрицю Долі</span>
      </h1>

      <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
        Розрахувати Матрицю Долі можна самостійно за кілька хвилин. Вам потрібна лише дата народження.
        У цій статті ми покажемо покрокову інструкцію з формулами та прикладами.
      </p>

      <h2 className="text-2xl font-black mb-4 mt-10">Крок 1: Базові числа</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
        Візьміть свою дату народження і виділіть три числа:
      </p>
      <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
        <li className="flex items-start gap-3"><span className="text-[var(--accent)] font-bold">A</span> — день народження (якщо більше 22, складаємо цифри)</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)] font-bold">B</span> — місяць народження</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)] font-bold">C</span> — сума цифр року народження (якщо більше 22, складаємо ще раз)</li>
      </ul>

      <div className="glass-card p-6 mb-8 hover:transform-none">
        <h3 className="text-lg font-bold mb-3 text-[var(--accent)]">Приклад: 15 березня 1990</h3>
        <p className="text-[var(--text-secondary)]">A = 15 (день)</p>
        <p className="text-[var(--text-secondary)]">B = 3 (місяць)</p>
        <p className="text-[var(--text-secondary)]">C = 1+9+9+0 = 19 (сума цифр року)</p>
      </div>

      <h2 className="text-2xl font-black mb-4 mt-10">Крок 2: Основні позиції</h2>
      <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Особистість</strong> = A + B + C (зводимо до 1-22)</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Душа</strong> = A + B (зводимо до 1-22)</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Призначення</strong> = B + C (зводимо до 1-22)</li>
      </ul>

      <div className="glass-card p-6 mb-8 hover:transform-none">
        <h3 className="text-lg font-bold mb-3 text-[var(--accent)]">Продовження прикладу</h3>
        <p className="text-[var(--text-secondary)]">Особистість = 15 + 3 + 19 = 37 → 3+7 = 10</p>
        <p className="text-[var(--text-secondary)]">Душа = 15 + 3 = 18</p>
        <p className="text-[var(--text-secondary)]">Призначення = 3 + 19 = 22</p>
      </div>

      <h2 className="text-2xl font-black mb-4 mt-10">Крок 3: Додаткові позиції</h2>
      <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Духовна лінія</strong> = A + Особистість</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Матеріальна лінія</strong> = C + Особистість</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Талант від Бога</strong> = A + Душа</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Талант від роду</strong> = C + Призначення</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Життєве завдання</strong> = Талант від Бога + Талант від роду</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Кармічний хвіст</strong> = Душа + Призначення</li>
        <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong className="text-white">Центр</strong> = Особистість + Життєве завдання</li>
      </ul>

      <h2 className="text-2xl font-black mb-4 mt-10">Правило зведення до 1-22</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
        Якщо отримане число більше 22, складайте його цифри доти, поки не отримаєте число
        від 1 до 22. Наприклад: 37 → 3+7 = 10. Число 0 замінюється на 22.
      </p>

      <div className="glass-card p-8 mt-10 text-center hover:transform-none">
        <h3 className="text-xl font-black mb-3">Або скористайтесь калькулятором</h3>
        <p className="text-[var(--text-secondary)] mb-6">
          Наш калькулятор розрахує все автоматично за кілька секунд
        </p>
        <Link href="/uk/kalkulyator-matrytsi-doli/" className="btn-primary">
          Розрахувати автоматично →
        </Link>
      </div>
    </article>
  );
}
