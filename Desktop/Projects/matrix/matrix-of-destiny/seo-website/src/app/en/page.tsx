import type { Metadata } from 'next';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import MatrixChart from '@/components/MatrixChart';
import { MatrixIcon, CompatibilityIcon, AiIcon, ArcanaIcon, DailyIcon } from '@/components/FeatureIcons';
import HowItWorks from '@/components/HowItWorks';
import { getTranslations } from '@/lib/i18n';
import { ENERGIES } from '@/lib/energies';

export const metadata: Metadata = {
  title: 'Matrix of Destiny online — free calculation ✦ Matrix of Destiny',
  description: 'Calculate your Destiny Matrix for free by date of birth. 22 energies, karma, talents and purpose. Deep AI analysis. Over 50,000 calculations. Try now →',
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/en/',
    languages: { uk: '/uk/', en: '/en/' },
  },
};

export default function HomePageEn() {
  const t = getTranslations('en');

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Matrix of Destiny',
    url: 'https://yourmatrixofdestiny.com',
    inLanguage: ['uk', 'en'],
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Destiny Matrix Calculator',
    url: 'https://yourmatrixofdestiny.com/en/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: 'en',
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

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[calc(100vh-72px)]">
        <div className="nebula-bg" />
        <div className="constellation" />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="hero-pill mb-8">
              {new Date().getFullYear()} — Free calculation
            </div>
            <h1 className="text-[clamp(40px,6vw,78px)] font-black leading-[1.05] tracking-tight mb-6">
              <span className="block text-white">{t.home.heroTitle} —</span>
              <span className="block gold-title">{t.home.heroTitleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl mb-10">
              {t.home.heroSubtitle}
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/en/" className="btn-primary text-lg px-8 py-4">
                {t.home.ctaCalculate} →
              </Link>
              <Link href="/en/" className="btn-secondary text-lg px-8 py-4">
                {t.home.feature5Title}
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <MatrixChart className="w-full max-w-[560px] h-auto" />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Features — Bento grid */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-3 block">{t.home.featuresTitle}</span>
            <h2 className="text-[clamp(28px,4vw,44px)] font-black tracking-tight">{t.home.featuresSubtitle}</h2>
          </div>

          <div className="bento-grid">
            <Link href="/en/" className="feature-card accent span-2 no-underline text-inherit block">
              <div className="icon-glow accent"><MatrixIcon /></div>
              <h3 className="text-2xl font-extrabold mb-3 text-white">{t.home.feature1Title}</h3>
              <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[480px]">{t.home.feature1Desc}</p>
            </Link>

            <Link href="/en/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow"><ArcanaIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">{t.home.feature5Title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.home.feature5Desc}</p>
            </Link>

            <Link href="/en/" className="feature-card no-underline text-inherit block">
              <div className="icon-glow"><CompatibilityIcon /></div>
              <h3 className="text-lg font-extrabold mb-2 text-white">{t.home.feature3Title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.home.feature3Desc}</p>
            </Link>

            <Link href="/en/" className="feature-card accent span-2 no-underline text-inherit block">
              <div className="icon-glow accent"><AiIcon /></div>
              <h3 className="text-2xl font-extrabold mb-3 text-white">{t.home.feature4Title}</h3>
              <p className="text-[15px] text-[var(--text-muted)] leading-relaxed max-w-[480px]">{t.home.feature4Desc}</p>
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

      {/* 22 Energies Preview */}
      <section className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-3 block">{t.home.energiesTitle}</span>
            <p className="text-[var(--text-secondary)] text-lg">{t.home.energiesSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ENERGIES.map(energy => (
              <div key={energy.id} className="glass-card p-4 text-center">
                <div className="energy-badge mx-auto mb-3">{energy.id}</div>
                <div className="text-sm font-bold text-white">{energy.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{energy.arcana}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* FAQ */}
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
    </>
  );
}
