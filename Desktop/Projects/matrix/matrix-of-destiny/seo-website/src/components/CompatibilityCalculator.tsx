'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateMatrix, calculateCompatibility } from '@/lib/matrix-calc';
import { getEnergyById } from '@/lib/energies';
import PremiumLock from './PremiumLock';
import AppDownloadCTA from './AppDownloadCTA';
import type { Locale } from '@/lib/i18n';
import { getTranslations } from '@/lib/i18n';

export default function CompatibilityCalculator({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [result, setResult] = useState<{
    overall: number;
    soulConnection: number;
    destinyConnection: number;
    karmicLesson: number;
  } | null>(null);

  const handleCalculate = () => {
    if (!date1 || !date2) return;
    const m1 = calculateMatrix(date1);
    const m2 = calculateMatrix(date2);
    setResult(calculateCompatibility(m1, m2));
  };

  const aspects = result ? [
    { key: 'overall', label: t.compatibility.overall, value: result.overall },
    { key: 'soulConnection', label: t.compatibility.soulConnection, value: result.soulConnection },
    { key: 'destinyConnection', label: t.compatibility.destinyConnection, value: result.destinyConnection },
    { key: 'karmicLesson', label: t.compatibility.karmicLesson, value: result.karmicLesson },
  ] : [];

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Input form */}
      <div className="glass-card p-8 md:p-12 max-w-xl mx-auto mb-12 hover:transform-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {t.compatibility.person1}
            </label>
            <input
              type="date"
              value={date1}
              onChange={e => setDate1(e.target.value)}
              max={maxDate}
              className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {t.compatibility.person2}
            </label>
            <input
              type="date"
              value={date2}
              onChange={e => setDate2(e.target.value)}
              max={maxDate}
              className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
        </div>
        <button
          onClick={handleCalculate}
          disabled={!date1 || !date2}
          className="btn-primary w-full justify-center text-lg py-4"
        >
          {t.compatibility.calculate} ✦
        </button>
      </div>

      {/* Results */}
      {result && (
        <div>
          <h2 className="text-2xl font-black text-center mb-8">{t.compatibility.resultTitle}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
            {aspects.map(({ key, label, value }) => {
              const energy = getEnergyById(value);
              return (
                <div key={key} className="glass-card p-6 hover:transform-none hover:border-[var(--primary)]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="energy-badge w-12 h-12 text-lg">{value}</div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
                      <div className="text-base font-bold text-white">
                        {locale === 'uk' ? energy?.name : energy?.nameEn}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                    {locale === 'uk' ? energy?.positive : energy?.positiveEn}
                  </p>
                  {energy && (
                    <Link
                      href={`/${locale}/wiki/${energy.slug}/`}
                      className="text-xs font-semibold text-[var(--primary-light)] no-underline hover:text-[var(--accent)] transition-colors mt-2 inline-block"
                    >
                      {locale === 'uk' ? 'Детальніше' : 'Learn more'} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Analysis — Premium locked */}
          <div className="max-w-3xl mx-auto">
            <PremiumLock locale={locale}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-[var(--accent)]">✦</span>
                  {locale === 'uk' ? 'Детальний аналіз сумісності від AI Провідника' : 'Detailed compatibility analysis by AI Guide'}
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {locale === 'uk'
                    ? 'AI Провідник проаналізує вашу сумісність за всіма позиціями Матриці Долі: кармічні уроки, спільне призначення, зони росту та потенціал стосунків...'
                    : 'The AI Guide will analyze your compatibility across all Destiny Matrix positions: karmic lessons, shared purpose, growth areas and relationship potential...'}
                </p>
              </div>
            </PremiumLock>
          </div>

          <AppDownloadCTA locale={locale} />
        </div>
      )}
    </div>
  );
}
