import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://yourmatrixofdestiny.com/en/',
    languages: {
      'uk': 'https://yourmatrixofdestiny.com/uk/',
      'en': 'https://yourmatrixofdestiny.com/en/',
    },
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en">
      <Header locale="en" />
      <main className="relative z-10 pt-[72px]">{children}</main>
      <Footer locale="en" />
    </div>
  );
}
