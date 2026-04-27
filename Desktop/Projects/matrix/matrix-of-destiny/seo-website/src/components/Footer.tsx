import Link from 'next/link';
import { getTranslations, getRoutes, type Locale } from '@/lib/i18n';

export default function Footer({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();
  const t = getTranslations(locale);
  const r = getRoutes(locale);

  return (
    <footer className="relative z-10 border-t border-[var(--border)] mt-24">
      <div className="max-w-[1100px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <Link href={r.home} className="flex items-center gap-2.5 no-underline mb-4">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              </div>
              <span className="text-[17px] font-extrabold text-white">{t.siteName}</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t.footer.navigation}</h4>
            <div className="flex flex-col gap-2.5">
              <Link href={r.calculator} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.nav.calculator}</Link>
              <Link href={r.compatibility} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.nav.compatibility}</Link>
              <Link href={r.wiki} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.nav.wiki}</Link>
              <Link href={r.whatIs} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.footer.whatIsLink}</Link>
              <Link href={r.howToCalc} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.footer.howToCalcLink}</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t.footer.info}</h4>
            <div className="flex flex-col gap-2.5">
              <Link href={r.privacy} className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">{t.footer.privacy}</Link>
              <a href="https://play.google.com/store/apps/details?id=com.matrixofsoul.app" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Google Play</a>
              <a href="https://apps.apple.com/app/matrix-of-destiny/id6745402478" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">App Store</a>
            </div>
          </div>
        </div>

        <div className="section-divider mb-6" />
        <p className="text-center text-xs text-[var(--text-muted)]">
          &copy; {year} yourmatrixofdestiny.com — {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
