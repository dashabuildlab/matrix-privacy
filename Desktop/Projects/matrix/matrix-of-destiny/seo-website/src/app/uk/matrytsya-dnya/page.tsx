import type { Metadata } from 'next';
import DailyMatrixClient from './DailyMatrixClient';

export const metadata: Metadata = {
  title: 'Матриця дня — енергія сьогодні · Matrix of Destiny',
  description: "Дізнайся енергію дня за Матрицею Долі. Щоденний аркан, поради та медитація на сьогодні. Безкоштовно.",
  alternates: { canonical: 'https://matrixofdestinytarot.com/uk/matrytsya-dnya/' },
};

export default function DailyMatrixPage() {
  return <DailyMatrixClient />;
}
