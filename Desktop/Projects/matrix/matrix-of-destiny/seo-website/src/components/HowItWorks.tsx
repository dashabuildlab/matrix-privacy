'use client';

const CalendarIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 9h18" />
    <path d="M8 2v4M16 2v4" />
    <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const OctagramIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3 L21 12 L12 21 L3 12 Z" />
    <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.8" />
  </svg>
);

const EyeIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C4 7 8 4 12 4C16 4 20 7 22 12C20 17 16 20 12 20C8 20 4 17 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <path d="M12 5 L12 4 M12 20 L12 19" opacity="0.4" />
  </svg>
);

const steps = [
  {
    icon: <CalendarIcon />,
    key: 'step1',
  },
  {
    icon: <OctagramIcon />,
    key: 'step2',
  },
  {
    icon: <EyeIcon />,
    key: 'step3',
  },
];

type Props = {
  titles: string[];
  descs: string[];
  sectionLabel: string;
};

export default function HowItWorks({ titles, descs, sectionLabel }: Props) {
  return (
    <section className="relative py-24 px-6 flex flex-col items-center overflow-hidden">
      <span className="text-xs font-bold tracking-[2px] uppercase text-[var(--primary-light)] mb-16 block">
        {sectionLabel}
      </span>

      {/* Steps row */}
      <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start w-full max-w-[860px] gap-12 md:gap-0">

        {/* Desktop connecting line */}
        <div className="destiny-thread hidden md:block" aria-hidden="true">
          <div className="destiny-thread-orb" />
        </div>

        {/* Mobile vertical line */}
        <div className="destiny-thread-vertical md:hidden" aria-hidden="true">
          <div className="destiny-thread-orb-vertical" />
        </div>

        {steps.map((step, i) => (
          <div
            key={step.key}
            className="group destiny-step flex flex-col items-center text-center w-full md:w-1/3"
          >
            {/* Glass sphere */}
            <div className="destiny-sphere mb-7">
              {step.icon}
            </div>
            <h3 className="text-[17px] font-extrabold text-white mb-2 transition-colors duration-300 group-hover:text-[var(--primary-light)]">
              {titles[i]}
            </h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[200px] transition-colors duration-300 group-hover:text-[var(--text-secondary)]">
              {descs[i]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
