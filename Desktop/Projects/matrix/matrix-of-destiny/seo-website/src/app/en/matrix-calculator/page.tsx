import type { Metadata } from 'next';
import SchemaOrg from '@/components/SchemaOrg';
import MatrixCalculator from '@/components/MatrixCalculator';

export const metadata: Metadata = {
  title: 'Destiny Matrix Calculator — free calculation by date of birth',
  description: 'Enter your date of birth and get your full Destiny Matrix for free. Discover your purpose, talents, karma and compatibility. ✦',
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/en/matrix-calculator/',
    languages: {
      uk: '/uk/kalkulyator-matrytsi-doli/',
      en: '/en/matrix-calculator/',
    },
  },
  openGraph: {
    title: 'Destiny Matrix Calculator — free calculation by date of birth',
    description: 'Enter your date of birth and get your full Destiny Matrix for free.',
    url: 'https://yourmatrixofdestiny.com/en/matrix-calculator/',
  },
};

export default function CalculatorPage() {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to calculate your Destiny Matrix online',
    description: 'Step-by-step instructions for calculating your Destiny Matrix by date of birth',
    step: [
      { '@type': 'HowToStep', name: 'Enter date of birth', text: 'Provide your day, month and year of birth in the calculator', position: 1 },
      { '@type': 'HowToStep', name: 'Press "Calculate"', text: 'The system automatically calculates all positions of your Destiny Matrix', position: 2 },
      { '@type': 'HowToStep', name: 'Get your result', text: 'See your Destiny Matrix with descriptions of each of the 22 energies', position: 3 },
    ],
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Destiny Matrix Calculator',
    url: 'https://yourmatrixofdestiny.com/en/matrix-calculator/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: 'en',
    description: 'Free online Destiny Matrix calculator. Calculation by date of birth.',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://yourmatrixofdestiny.com/en/' },
      { '@type': 'ListItem', position: 2, name: 'Destiny Matrix Calculator', item: 'https://yourmatrixofdestiny.com/en/matrix-calculator/' },
    ],
  };

  return (
    <>
      <SchemaOrg schema={[howToSchema, webAppSchema, breadcrumbSchema]} />

      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-sm text-[var(--text-muted)] mb-8">
            <a href="/en/" className="hover:text-white transition-colors no-underline">Home</a>
            <span className="mx-2">/</span>
            <span className="text-[var(--primary-light)]">Destiny Matrix Calculator</span>
          </nav>

          <div className="text-center mb-12">
            <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-4">
              <span className="text-[var(--accent)]">Destiny Matrix</span> Calculator online
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Enter your date of birth and get your full Destiny Matrix for free.
              Discover your purpose, talents, karma and compatibility with your partner.
            </p>
          </div>

          <MatrixCalculator locale="en" />

          <div className="max-w-3xl mx-auto mt-20">
            <div className="section-divider mb-12" />
            <h2 className="text-2xl font-black mb-6">What is the Matrix of Destiny?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              The Matrix of Destiny is a unique self-discovery method based on 22 archetype-energies.
              Through a simple calculation by date of birth, you can learn about your main life
              tasks, talents, karmic lessons and purpose.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Each number from 1 to 22 corresponds to a specific archetype and carries a unique energy.
              This energy can manifest in both positive and negative aspects — it all depends on
              the person&apos;s level of awareness.
            </p>

            <h2 className="text-2xl font-black mb-6 mt-12">How does the calculator work?</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              Our calculator automatically calculates all key positions of your Destiny Matrix:
            </p>
            <ul className="text-[var(--text-secondary)] leading-relaxed space-y-3 mb-6 list-none">
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Personality</strong> — your character and core energy</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Soul</strong> — deep desires and needs of your soul</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Destiny</strong> — your main life task</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Karmic tail</strong> — lessons from past lives</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Talents</strong> — natural abilities and gifts</li>
              <li className="flex items-start gap-3"><span className="text-[var(--accent)]">✦</span> <strong>Spiritual and material lines</strong> — balance of spiritual and material</li>
            </ul>

            <h2 className="text-2xl font-black mb-6 mt-12">Calculation formula</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              The calculation uses three base numbers: day of birth, month and sum of year digits.
              Each number is reduced to the 1-22 range (if greater than 22, its digits are summed).
              Then all other matrix positions are calculated using special formulas.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
