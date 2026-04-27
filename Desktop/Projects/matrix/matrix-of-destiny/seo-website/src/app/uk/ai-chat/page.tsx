import type { Metadata } from 'next';
import AiChatClient from './AiChatClient';

export const metadata: Metadata = {
  title: 'AI-провідник — Matrix of Destiny',
  description: 'Поговори з AI-провідником про свою Матрицю Долі, призначення, карму та таланти. Персональний нумерологічний аналіз на основі штучного інтелекту.',
  alternates: { canonical: 'https://yourmatrixofdestiny.com/uk/ai-chat/' },
};

export default function AiChatPage() {
  return <AiChatClient />;
}
