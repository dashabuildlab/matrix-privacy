/**
 * Destiny Matrix Calculator
 * Based on the 22 Energies (Major Arcana) system.
 */

export interface MatrixData {
  birthDate: string;
  personality: number;
  soul: number;
  destiny: number;
  spiritual: number;
  material: number;
  talentFromGod: number;
  talentFromFamily: number;
  purpose: number;
  karmicTail: number;
  parentKarma: number;
  maleFemale: number;
  center: number;
  positions: Record<string, number>;
}

export function reduceToEnergy(num: number): number {
  if (num <= 0) return 22;
  if (num <= 22) return num;
  let result = num;
  while (result > 22) {
    result = String(result)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result;
}

function parseDateComponents(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const yearSum = String(y)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  return { day: d, month: m, year: y, yearSum };
}

export function calculateMatrix(dateStr: string): MatrixData {
  const { day, month, yearSum } = parseDateComponents(dateStr);

  const a = reduceToEnergy(day);
  const b = reduceToEnergy(month);
  const c = reduceToEnergy(yearSum);

  const personality = reduceToEnergy(a + b + c);
  const soul = reduceToEnergy(a + b);
  const destiny = reduceToEnergy(b + c);
  const spiritual = reduceToEnergy(a + personality);
  const material = reduceToEnergy(c + personality);
  const talentFromGod = reduceToEnergy(a + soul);
  const talentFromFamily = reduceToEnergy(c + destiny);
  const purpose = reduceToEnergy(talentFromGod + talentFromFamily);
  const karmicTail = reduceToEnergy(soul + destiny);
  const parentKarma = reduceToEnergy(spiritual + material);
  const maleFemale = reduceToEnergy(soul + destiny);
  const center = reduceToEnergy(personality + purpose);

  const positions: Record<string, number> = {
    a, b, c, personality, soul, destiny, spiritual, material,
    talentFromGod, talentFromFamily, purpose, karmicTail,
    parentKarma, maleFemale, center,
  };

  return {
    birthDate: dateStr, personality, soul, destiny, spiritual, material,
    talentFromGod, talentFromFamily, purpose, karmicTail, parentKarma,
    maleFemale, center, positions,
  };
}

export function calculateCompatibility(matrix1: MatrixData, matrix2: MatrixData) {
  return {
    overall: reduceToEnergy(matrix1.personality + matrix2.personality),
    soulConnection: reduceToEnergy(matrix1.soul + matrix2.soul),
    destinyConnection: reduceToEnergy(matrix1.destiny + matrix2.destiny),
    karmicLesson: reduceToEnergy(matrix1.karmicTail + matrix2.karmicTail),
  };
}

export function getDailyEnergy(date: Date = new Date()): number {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const yearSum = String(year)
    .split('')
    .reduce((sum, d) => sum + Number(d), 0);
  return reduceToEnergy(day + month + yearSum);
}
