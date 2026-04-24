import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://matrixofdestinytarot.com/uk/',
    languages: {
      'uk': 'https://matrixofdestinytarot.com/uk/',
      'en': 'https://matrixofdestinytarot.com/en/',
    },
  },
};

export default function UkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="uk">
      <Header />
      <main className="relative z-10 pt-[72px]">{children}</main>
      <Footer />
    </div>
  );
}
