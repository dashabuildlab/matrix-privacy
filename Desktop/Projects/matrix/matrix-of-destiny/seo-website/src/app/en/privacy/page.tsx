import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy of yourmatrixofdestiny.com',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-3xl font-black mb-8">Privacy Policy</h1>
        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">
          <p>Last updated: {new Date().toLocaleDateString('en-US')}</p>
          <h2 className="text-xl font-bold text-white mt-8">1. Information collection</h2>
          <p>We collect the minimum amount of information needed for the service to operate. The date of birth you enter to calculate your Destiny Matrix is not stored on our servers and is processed exclusively in your browser.</p>
          <h2 className="text-xl font-bold text-white mt-8">2. Cookies</h2>
          <p>We use cookies for analytics (Google Analytics) and to improve site performance. You can disable cookies in your browser settings.</p>
          <h2 className="text-xl font-bold text-white mt-8">3. Analytics</h2>
          <p>We use Google Analytics to collect anonymous visit statistics. This information helps us improve the site.</p>
          <h2 className="text-xl font-bold text-white mt-8">4. Contact</h2>
          <p>For privacy questions, contact us at the email listed on the contacts page.</p>
        </div>
      </div>
    </section>
  );
}
