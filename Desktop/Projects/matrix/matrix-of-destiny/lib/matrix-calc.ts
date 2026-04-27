/**
 * Destiny Matrix — Destiny Matrix Calculator
 * Based on the 22 Energies (Major Arcana) system.
 * Calculates life matrix positions from birth date.
 */

export interface MatrixData {
  birthDate: string; // YYYY-MM-DD
  // Core positions
  personality: number;
  soul: number;
  destiny: number;
  // Life line
  spiritual: number;
  material: number;
  // Talents & purpose
  talentFromGod: number;
  talentFromFamily: number;
  purpose: number;
  // Karmic tail
  karmicTail: number;
  parentKarma: number;
  // Relationships
  maleFemale: number;
  // Center
  center: number;
  // All positions for the diagram
  positions: Record<string, number>;
}

/** Reduce a number to 1-22 range (22 energies) */
export function reduceToEnergy(num: number): number {
  if (num <= 0) return 22;
  if (num <= 22) return num;
  // Sum digits until we get <= 22
  let result = num;
  while (result > 22) {
    result = String(result)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result;
}

/** Parse date into day, month, year components */
function parseDateComponents(dateStr: string): { day: number; month: number; year: number; yearSum: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const yearSum = String(y)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  return { day: d, month: m, year: y, yearSum };
}

/** Calculate the full destiny matrix from a birth date */
export function calculateMatrix(dateStr: string): MatrixData {
  const { day, month, yearSum } = parseDateComponents(dateStr);

  const a = reduceToEnergy(day);
  const b = reduceToEnergy(month);
  const c = reduceToEnergy(yearSum);

  // Core positions
  const personality = reduceToEnergy(a + b + c);
  const soul = reduceToEnergy(a + b);
  const destiny = reduceToEnergy(b + c);

  // Life line
  const spiritual = reduceToEnergy(a + personality);
  const material = reduceToEnergy(c + personality);

  // Talents
  const talentFromGod = reduceToEnergy(a + soul);
  const talentFromFamily = reduceToEnergy(c + destiny);
  const purpose = reduceToEnergy(talentFromGod + talentFromFamily);

  // Karmic tail
  const karmicTail = reduceToEnergy(soul + destiny);
  const parentKarma = reduceToEnergy(spiritual + material);

  // Relationships
  const maleFemale = reduceToEnergy(soul + destiny);

  // Center
  const center = reduceToEnergy(personality + purpose);

  const positions: Record<string, number> = {
    a, b, c,
    personality,
    soul,
    destiny,
    spiritual,
    material,
    talentFromGod,
    talentFromFamily,
    purpose,
    karmicTail,
    parentKarma,
    maleFemale,
    center,
  };

  return {
    birthDate: dateStr,
    personality,
    soul,
    destiny,
    spiritual,
    material,
    talentFromGod,
    talentFromFamily,
    purpose,
    karmicTail,
    parentKarma,
    maleFemale,
    center,
    positions,
  };
}

/** Calculate compatibility between two matrices */
export function calculateCompatibility(matrix1: MatrixData, matrix2: MatrixData) {
  const compatibility = reduceToEnergy(matrix1.personality + matrix2.personality);
  const soulConnection = reduceToEnergy(matrix1.soul + matrix2.soul);
  const destinyConnection = reduceToEnergy(matrix1.destiny + matrix2.destiny);
  const karmicLesson = reduceToEnergy(matrix1.karmicTail + matrix2.karmicTail);

  return {
    overall: compatibility,
    soulConnection,
    destinyConnection,
    karmicLesson,
  };
}

/** Get today's energy based on the current date */
export function getDailyEnergy(date: Date = new Date()): number {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const yearSum = String(year)
    .split('')
    .reduce((sum, d) => sum + Number(d), 0);

  return reduceToEnergy(day + month + yearSum);
}
