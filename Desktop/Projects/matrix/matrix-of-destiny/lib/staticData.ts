/**
 * Central source of truth for static (bundle-shipped) data.
 * These values never change at runtime — they belong in constants, not in Zustand.
 * Import from here instead of reading from the store.
 */
export {
  FALLBACK_ENERGIES as ENERGIES,
} from './fallbackData';
