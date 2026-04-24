import type { Locale } from '@/lib/i18n';

const texts = {
  uk: {
    title: 'Отримайте більше у додатку',
    features: ['AI Провідник з персональним аналізом', 'Щоденна Матриця Долі', 'Медитації та нумерологія'],
  },
  en: {
    title: 'Get more in the app',
    features: ['AI Guide with personal analysis', 'Daily Destiny Matrix', 'Meditations & numerology'],
  },
};

export default function AppDownloadCTA({ locale }: { locale: Locale }) {
  const t = texts[locale];

  return (
    <div className="glass-card p-8 text-center hover:transform-none mt-12">
      <h3 className="text-xl font-bold text-white mb-4">{t.title}</h3>
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {t.features.map((f) => (
          <span key={f} className="text-xs font-medium text-[var(--primary-light)] px-3 py-1.5 rounded-full border border-[var(--border)]">
            {f}
          </span>
        ))}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <a
          href="https://play.google.com/store/apps/details?id=com.matrixofsoul.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm px-6 py-3"
        >
          Google Play
        </a>
        <a
          href="https://apps.apple.com/app/matrix-of-destiny/id6745402478"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm px-6 py-3"
        >
          App Store
        </a>
      </div>
    </div>
  );
}
