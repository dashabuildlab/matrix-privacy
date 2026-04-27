import type { Metadata } from 'next';
import SchemaOrg from '@/components/SchemaOrg';
import CompatibilityCalculator from '@/components/CompatibilityCalculator';

export const metadata: Metadata = {
  title: 'Destiny Matrix Compatibility — check your pair for free',
  description: 'Enter the birth dates of two people and discover compatibility by Destiny Matrix. Love, karma, shared purpose and challenges.',
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/en/compatibility-calculator/',
    languages: { uk: '/uk/kalkulyator-sumisnosti/', en: '/en/compatibility-calculator/' },
  },
};

export default function CompatibilityPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://yourmatrixofdestiny.com/en/' },
      { '@type': 'ListItem', position: 2, name: 'Compatibility Calculator', item: 'https://yourmatrixofdestiny.com/en/compatibility-calculator/' },
    ],
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Destiny Matrix Compatibility Calculator',
    url: 'https://yourmatrixofdestiny.com/en/compatibility-calculator/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <>
      <SchemaOrg schema={[breadcrumbSchema, webAppSchema]} />
      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/en/" className="hover:text-white transition-colors no-underline">Home</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">Compatibility Calculator</span>
          </nav>

          <div className="text-center mb-12">
            <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-4">
              <span className="text-[var(--accent)]">Destiny Matrix</span> Compatibility
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Enter the birth dates of two people and discover compatibility by Destiny Matrix.
              Love, karma, shared purpose and challenges.
            </p>
          </div>

          <CompatibilityCalculator locale="en" />

          <div className="max-w-3xl mx-auto mt-20">
            <div className="section-divider mb-12" />
            <h2 className="text-2xl font-black mb-6">How does Destiny Matrix compatibility work?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              The compatibility calculator compares key positions of two people&apos;s Destiny Matrices.
              The system analyzes four main aspects: overall compatibility (personality comparison),
              soul connection, destiny connection, and the karmic lesson the couple must go through together.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Each aspect is expressed by a number from 1 to 22, corresponding to one of the 22 archetype energies.
              This number reveals the nature of interaction between partners in a specific area.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
