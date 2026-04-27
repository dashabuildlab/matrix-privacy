import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — Matrix of Destiny',
  description: 'Terms of Use for the Matrix of Destiny app',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-3xl font-black mb-2">Terms of Use</h1>
        <p className="text-[var(--text-secondary)] mb-10">Last updated: April 27, 2026</p>

        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">

          <h2 className="text-xl font-bold text-white mt-8">1. Acceptance of Terms</h2>
          <p>By using the Matrix of Destiny app ("App") or visiting our website, you agree to these Terms of Use. If you do not agree, please discontinue use.</p>

          <h2 className="text-xl font-bold text-white mt-8">2. Description of Service</h2>
          <p>Matrix of Destiny is an app for numerological Destiny Matrix calculation, personalized forecasts, and AI-guided interaction based on your date of birth. The App is for entertainment and educational purposes only and does not constitute medical, psychological, or financial advice.</p>

          <h2 className="text-xl font-bold text-white mt-8">3. Subscriptions and Payment</h2>
          <p>Premium features are available via subscription through the App Store (iOS) or Google Play (Android).</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Subscriptions automatically renew at the end of each billing cycle unless cancelled at least 24 hours before the end of the current period.</li>
            <li>Payment is charged to your App Store or Google Play account upon purchase confirmation.</li>
            <li>You may cancel your subscription at any time in your App Store or Google Play settings.</li>
            <li>No partial refunds are provided for unused subscription periods.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. Account</h2>
          <p>A registered account is required to access personalized features. You are responsible for the confidentiality of your account credentials. You may delete your account at any time via "Account Settings" in the App.</p>

          <h2 className="text-xl font-bold text-white mt-8">5. Intellectual Property</h2>
          <p>All content in the App, including text, algorithms, design, and AI responses, is the property of Matrix of Destiny and is protected by copyright. Copying, reproducing, or distributing content without written permission is prohibited.</p>

          <h2 className="text-xl font-bold text-white mt-8">6. Limitation of Liability</h2>
          <p>The App is provided "as is." We are not liable for decisions made based on App content. Forecasts and matrix analysis are entertainment and educational content and are not scientifically proven.</p>

          <h2 className="text-xl font-bold text-white mt-8">7. Privacy</h2>
          <p>The collection and processing of personal data is governed by our <a href="/en/privacy" className="text-purple-400 underline">Privacy Policy</a>.</p>

          <h2 className="text-xl font-bold text-white mt-8">8. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms. We will notify you of material changes via the App or email. Continued use after changes constitutes acceptance of the new Terms.</p>

          <h2 className="text-xl font-bold text-white mt-8">9. Contact</h2>
          <p>For questions about these Terms: <a href="mailto:support@yourmatrixofdestiny.com" className="text-purple-400 underline">support@yourmatrixofdestiny.com</a></p>

        </div>
      </div>
    </section>
  );
}
