import type { Metadata } from 'next';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import MatrixChart from '@/components/MatrixChart';
import { MatrixIcon, CompatibilityIcon, AiIcon, ArcanaIcon, DailyIcon } from '@/components/FeatureIcons';
import HowItWorks from '@/components/HowItWorks';
import { getTranslations } from '@/lib/i18n';
import { ENERGIES, getEnergyById } from '@/lib/energies';
import { getDailyEnergy } from '@/lib/matrix-calc';

export const metadata: Metadata = {
  title: 'Матриця Долі онлайн — безкоштовний розрахунок ✦ Matrix of Destiny',
  description: 'Розрахуй свою Матрицю Долі безкоштовно за датою народження. 22 енергії, карма, таланти і призначення. AI-провідник. Матриця дня. Понад 50 000 розрахунків.',
  alternates: {
    canonical: 'https://matrixofdestinytarot.com/uk/',
    languages: { uk: '/uk/', en: '/en/' },
  },
};

export default function HomePage() {
  const t = getTranslations('uk');

  const todayEnergy = getDailyEnergy();
  const todayArcana = getEnergyById(todayEnergy);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Matrix of Destiny',
    alternateName: 'Матриця Долі',
    url: 'https://matrixofdestinytarot.com',
    inLanguage: ['uk', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://matrixofdestinytarot.com/uk/wiki/{search_term_string}/',
      'query-input': 'required name=search_term_string',
    },
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
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.home.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <SchemaOrg schema={[websiteSchema, webAppSchema, faqSchema]} />

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[calc(100vh-72px)]">
        <div className="nebula-bg" />
        <div className="constellation" />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="hero-pill mb-8">
              {new Date().getFullYear()} — Веб-версія застосунку
            </div>
            <h1 className="text-[clamp(40px,6vw,78px)] font-black leading-[1.05] tracking-tight mb-6">
              <span className="block text-white">{t.home.heroTitle} —</span>
              <span className="block gold-title">{t.home.heroTitleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl mb-10">
              {t.home.heroSubtitle}
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/uk/kalkulyator-matrytsi-doli/" className="btn-primary text-lg px-8 py-4">
                {t.home.ctaCalculate} →
              </Link>
              <Link href="/uk/ai-chat/" className="btn-secondary text-lg px-8 py-4">
                AI-провідник ✦
              </Link>
            </div>

            {/* App download badges */}
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Також доступно:</span>
              <a
                href="https://apps.apple.com/app/matrix-of-destiny/id6745402478"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/[0.06] border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 no-underline transition-colors group"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white" className="flex-shrink-0">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.21 1.29-2.19 3.85.03 3.05 2.68 4.06 2.7 4.07-.03.07-.42 1.44-1.38 2.65M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <div className="text-[9px] text-white/50 leading-none">Завантажити з</div>
                  <div className="text-xs font-bold text-white leading-none mt-0.5">App Store</div>
                </div>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.matrixofdestiny.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/[0.06] border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 no-underline transition-colors group"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#F5C542" className="flex-shrink-0">
                  <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
                </svg>
                <div>
                  <div className="text-[9px] text-white/50 leading-none">Завантажити з</div>
                  <div className="text-xs font-bold text-white leading-none mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <MatrixChart className="w-full max-w-[560px] h-auto" />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Today's Energy ───────────────────────────────────────────────── */}
      {todayArcana && (
        <section className="py-16 px-6">
          <div className="max-w-[1200px] mx-auto">
            <Link href="/uk/matrytsya-dnya/" className="no-underline block">
              <div className="feature-card accent flex items-center gap-6 flex-wrap hover:scale-[1.01] transition-transform">
                <div className="energy-badge w-16 h-16 text-2xl flex-shrink-0">{todayArcana.id}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-1">
                    Енергія сьогодні
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1">{todayArcana.name}</h2>
                  <p className="text-sm text-[var(--text-muted)] max-w-lg">
                    {todayArcana.keywords.join(' · ')} — {todayArcana.advice.slice(0, 80)}...
                  </p>
                </div>
                <div className="btn-secondary whitespace-nowrap">
                  Матриця дня →
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <div className="section-divider" />

      {/* ─── Features Bento ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-3 block">{t.home.featuresTitle}</span>
            <h2 className="text-[clamp(28px,4vw,44px)] font-black tracking-tight">{t.home.featuresSubtitle}</h2>
          </div>

          <div className="bento-grid">
            {/* Matrix — wide */}
            <Link href="/uk/kalkulyator-matrytsi-doli/" className="feature-card accent span-2 no-underline text-inherit block">
              <div className="icon-glow accent"><MatrixIcon /></div>
              <h3 className="text-2xl font-extrabold mb-3 text-white">{t.home.feature1Title}</h3>
              <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[480px]">{t.home.feature1Desc}</p>
            </Link>

            {/* AI guide */}
            <Link href="/uk/ai-chat/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow accent"><AiIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">AI-провідник</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">Персональний чат з AI про вашу матрицю, карму та призначення</p>
            </Link>

            {/* Daily */}
            <Link href="/uk/matrytsya-dnya/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow"><DailyIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">Матриця дня</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">Енергія сьогодні, афірмація та медитація для вашого дня</p>
            </Link>

            {/* Compatibility — wide */}
            <Link href="/uk/kalkulyator-sumisnosti/" className="feature-card accent span-2 no-underline text-inherit block">
              <div className="icon-glow accent"><CompatibilityIcon /></div>
              <h3 className="text-2xl font-extrabold mb-3 text-white">{t.home.feature3Title}</h3>
              <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[480px]">{t.home.feature3Desc}</p>
            </Link>

            {/* Arcana */}
            <Link href="/uk/wiki/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow"><ArcanaIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">{t.home.feature5Title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.home.feature5Desc}</p>
            </Link>

            {/* AI analysis */}
            <Link href="/uk/kalkulyator-matrytsi-doli/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow"><AiIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">{t.home.feature4Title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.home.feature4Desc}</p>
            </Link>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <HowItWorks
        sectionLabel={t.home.howTitle}
        titles={[t.home.step1Title, t.home.step2Title, t.home.step3Title]}
        descs={[t.home.step1Desc, t.home.step2Desc, t.home.step3Desc]}
      />

      <div className="section-divider" />

      {/* ─── AI Chat Promo ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="feature-card accent overflow-hidden relative">
            <div className="nebula-bg opacity-30" />
            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--accent)] mb-4 block">Штучний інтелект</span>
                <h2 className="text-[clamp(26px,4vw,40px)] font-black mb-4">
                  Поговори з <span className="gold-title">AI-провідником</span>
                </h2>
                <p className="text-[var(--text-secondary)] text-lg mb-6 leading-relaxed">
                  Задай будь-яке питання про свою Матрицю Долі, карму, таланти або стосунки. AI-провідник дасть персональну відповідь на основі твоєї дати народження.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  {['Що означає моя карма?', 'Поради на сьогодні', 'Мої таланти', 'Сумісність пари'].map(q => (
                    <span key={q} className="px-3 py-1.5 rounded-full bg-[rgba(245,197,66,0.08)] border border-[rgba(245,197,66,0.2)] text-sm text-[var(--text-secondary)]">
                      {q}
                    </span>
                  ))}
                </div>
                <Link href="/uk/ai-chat/" className="btn-primary text-base px-8 py-4 inline-flex">
                  Відкрити AI-провідника ✦
                </Link>
              </div>
              {/* Chat preview */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] text-white text-sm px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    Що означає число 7 в позиції Душі моєї матриці?
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#F5C542] flex items-center justify-center text-sm flex-shrink-0 mt-1">✦</div>
                  <div className="bg-white/[0.06] border border-white/8 text-[var(--text-secondary)] text-sm px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] leading-relaxed">
                    Сьома енергія — Колісниця — у позиції Душі говорить про те, що твоя душа прагне руху, перемоги та подолання перешкод. Ти народжений для того, щоб рухатись вперед...
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] text-white text-sm px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    Як це проявляється в моєму житті?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── 22 Energies ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-3 block">{t.home.energiesTitle}</span>
            <p className="text-[var(--text-secondary)] text-lg">{t.home.energiesSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ENERGIES.map(energy => (
              <Link
                key={energy.id}
                href={`/uk/wiki/${energy.slug}/`}
                className="glass-card p-4 text-center no-underline group"
              >
                <div className="energy-badge mx-auto mb-3">{energy.id}</div>
                <div className="text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors">{energy.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{energy.arcana}</div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/uk/wiki/" className="btn-secondary">
              Дізнатися більше про всі 22 Старші Аркани →
            </Link>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-3 block">{t.home.faqTitle}</span>
          </div>
          {t.home.faq.map((item, i) => (
            <div key={i} className="faq-item">
              <h3 className="text-lg font-bold text-white mb-3">{item.q}</h3>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-[clamp(28px,4vw,40px)] font-black mb-5">
            Готові дізнатися своє <span className="text-[var(--accent)]">призначення</span>?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Введіть дату народження і отримайте повну Матрицю Долі безкоштовно за кілька секунд
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/uk/kalkulyator-matrytsi-doli/" className="btn-primary text-lg px-10 py-4">
              Розрахувати Матрицю Долі →
            </Link>
            <Link href="/uk/ai-chat/" className="btn-secondary text-lg px-10 py-4">
              AI-провідник ✦
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
