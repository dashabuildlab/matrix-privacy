// Types only — data is bundled locally in lib/staticData.ts

export interface Energy {
  id: number;
  name: string;
  arcana: string;
  planet: string;
  keywords: string[];
  positive: string;
  negative: string;
  advice: string;
  // English translations (optional for Supabase compat)
  planetEn?: string;
  keywordsEn?: string[];
  positiveEn?: string;
  negativeEn?: string;
  adviceEn?: string;
}

import { ENERGIES } from '@/lib/staticData';

export const getEnergyById = (id: number): Energy | undefined =>
  ENERGIES.find((e) => e.id === id);
