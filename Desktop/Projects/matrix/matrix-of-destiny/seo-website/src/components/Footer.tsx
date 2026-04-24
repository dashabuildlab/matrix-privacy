import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[var(--border)] mt-24">
      <div className="max-w-[1100px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link href="/uk/" className="flex items-center gap-2.5 no-underline mb-4">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              </div>
              <span className="text-[17px] font-extrabold text-white">Matrix of Destiny</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">Пізнай себе через призму Всесвіту</p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Навігація</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/uk/kalkulyator-matrytsi-doli/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Калькулятор</Link>
              <Link href="/uk/kalkulyator-sumisnosti/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Сумісність</Link>
              <Link href="/uk/wiki/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Вікі</Link>
              <Link href="/uk/wiki/scho-take-matrytsya-doli/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Що таке Матриця Долі?</Link>
              <Link href="/uk/wiki/yak-rozrakhuvaty/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Як розрахувати</Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Інформація</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/uk/privacy/" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Політика конфіденційності</Link>
              <a href="https://play.google.com/store/apps/details?id=com.matrixofsoul.app" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">Google Play</a>
              <a href="https://apps.apple.com/app/matrix-of-destiny/id6745402478" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] no-underline hover:text-white transition-colors">App Store</a>
            </div>
          </div>
        </div>

        <div className="section-divider mb-6" />
        <p className="text-center text-xs text-[var(--text-muted)]">
          &copy; {year} matrixofdestinytarot.com — Всі права захищені
        </p>
      </div>
    </footer>
  );
}
