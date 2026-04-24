'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateMatrix, type MatrixData } from '@/lib/matrix-calc';
import { getEnergyById } from '@/lib/energies';
import type { Locale } from '@/lib/i18n';
import { getTranslations } from '@/lib/i18n';

export default function MatrixCalculator({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const [birthDate, setBirthDate] = useState('');
  const [result, setResult] = useState<MatrixData | null>(null);

  const handleCalculate = () => {
    if (!birthDate) return;
    const matrix = calculateMatrix(birthDate);
    setResult(matrix);
  };

  const positionKeys: { key: keyof typeof t.calculator.positions; field: keyof MatrixData }[] = [
    { key: 'personality', field: 'personality' },
    { key: 'soul', field: 'soul' },
    { key: 'destiny', field: 'destiny' },
    { key: 'spiritual', field: 'spiritual' },
    { key: 'material', field: 'material' },
    { key: 'talentFromGod', field: 'talentFromGod' },
    { key: 'talentFromFamily', field: 'talentFromFamily' },
    { key: 'purpose', field: 'purpose' },
    { key: 'karmicTail', field: 'karmicTail' },
    { key: 'parentKarma', field: 'parentKarma' },
    { key: 'center', field: 'center' },
  ];

  return (
    <div>
      {/* Calculator form */}
      <div className="glass-card p-8 md:p-12 max-w-xl mx-auto mb-12 hover:transform-none">
        <label className="block text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          {t.calculator.dateLabel}
        </label>
        <div className="flex gap-4 flex-col sm:flex-row">
          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-5 py-4 text-white text-lg font-medium outline-none focus:border-[var(--primary)] transition-colors"
            max={new Date().toISOString().split('T')[0]}
          />
          <button
            onClick={handleCalculate}
            className="btn-primary text-lg px-8 py-4 whitespace-nowrap"
            disabled={!birthDate}
          >
            {t.calculator.calculate} ✦
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="animate-[fadeIn_0.5s_ease]">
          <h2 className="text-3xl font-black text-center mb-8">
            {t.calculator.resultTitle}
          </h2>

          {/* Matrix diagram visualization */}
          <div className="glass-card p-8 mb-8 max-w-md mx-auto text-center hover:transform-none">
            <div className="text-sm text-[var(--text-muted)] mb-2">
              {locale === 'uk' ? 'Дата народження' : 'Date of birth'}: {result.birthDate}
            </div>
            <div className="flex justify-center gap-6 my-6">
              <div className="text-center">
                <div className="energy-badge mx-auto mb-1 w-14 h-14 text-xl">{result.positions.a}</div>
                <div className="text-xs text-[var(--text-muted)]">{locale === 'uk' ? 'День' : 'Day'}</div>
              </div>
              <div className="text-center">
                <div className="energy-badge mx-auto mb-1 w-14 h-14 text-xl">{result.positions.b}</div>
                <div className="text-xs text-[var(--text-muted)]">{locale === 'uk' ? 'Місяць' : 'Month'}</div>
              </div>
              <div className="text-center">
                <div className="energy-badge mx-auto mb-1 w-14 h-14 text-xl">{result.positions.c}</div>
                <div className="text-xs text-[var(--text-muted)]">{locale === 'uk' ? 'Рік' : 'Year'}</div>
              </div>
            </div>
            <div className="energy-badge mx-auto w-16 h-16 text-2xl glow-purple">{result.personality}</div>
            <div className="text-sm font-bold mt-2 text-[var(--accent)]">{t.calculator.positions.personality}</div>
          </div>

          {/* Detailed positions */}
          <div className="matrix-result-grid max-w-4xl mx-auto">
            {positionKeys.map(({ key, field }) => {
              const value = result[field] as number;
              const energy = getEnergyById(value);
              return (
                <div key={key} className="glass-card p-6 hover:transform-none hover:border-[var(--primary)]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="energy-badge w-10 h-10 text-sm">{value}</div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t.calculator.positions[key]}</div>
                      <div className="text-base font-bold text-white">
                        {locale === 'uk' ? energy?.name : energy?.nameEn}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                    {locale === 'uk' ? energy?.positive : energy?.positiveEn}
                  </p>
                  {energy && (
                    <Link
                      href={`/${locale}/wiki/${energy.slug}/`}
                      className="text-xs font-semibold text-[var(--primary-light)] no-underline hover:text-[var(--accent)] transition-colors"
                    >
                      {t.calculator.learnMore} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA to app */}
          <div className="text-center mt-12">
            <p className="text-[var(--text-muted)] mb-4">
              {locale === 'uk'
                ? 'Хочете детальніший AI-аналіз вашої матриці?'
                : 'Want a more detailed AI analysis of your matrix?'}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="https://play.google.com/store/apps/details?id=com.matrixofsoul.app" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Google Play
              </a>
              <a href="https://apps.apple.com/app/matrix-of-destiny/id6745402478" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                App Store
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
