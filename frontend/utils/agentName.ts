import { utils } from 'ethers';

import { NA } from '@/constants/symbols';

// keep your syllable list exactly the same
const phoneticSyllables = [
  'ba',
  'bi',
  'bu',
  'ka',
  'ke',
  'ki',
  'ko',
  'ku',
  'da',
  'de',
  'di',
  'do',
  'du',
  'fa',
  'fe',
  'fi',
  'fo',
  'fu',
  'ga',
  'ge',
  'gi',
  'go',
  'gu',
  'ha',
  'he',
  'hi',
  'ho',
  'hu',
  'ja',
  'je',
  'ji',
  'jo',
  'ju',
  'ka',
  'ke',
  'ki',
  'ko',
  'ku',
  'la',
  'le',
  'li',
  'lo',
  'lu',
  'ma',
  'me',
  'mi',
  'mo',
  'mu',
  'na',
  'ne',
  'ni',
  'no',
  'nu',
  'pa',
  'pe',
  'pi',
  'po',
  'pu',
  'ra',
  're',
  'ri',
  'ro',
  'ru',
  'sa',
  'se',
  'si',
  'so',
  'su',
  'ta',
  'te',
  'ti',
  'to',
  'tu',
  'va',
  've',
  'vi',
  'vo',
  'vu',
  'wa',
  'we',
  'wi',
  'wo',
  'wu',
  'ya',
  'ye',
  'yi',
  'yo',
  'yu',
  'za',
  'ze',
  'zi',
  'zo',
  'zu',
  'bal',
  'ben',
  'bir',
  'bom',
  'bun',
  'cam',
  'cen',
  'cil',
  'cor',
  'cus',
  'dan',
  'del',
  'dim',
  'dor',
  'dun',
  'fam',
  'fen',
  'fil',
  'fon',
  'fur',
  'gar',
  'gen',
  'gil',
  'gon',
  'gus',
  'han',
  'hel',
  'him',
  'hon',
  'hus',
  'jan',
  'jel',
  'jim',
  'jon',
  'jus',
  'kan',
  'kel',
  'kim',
  'kon',
  'kus',
  'lan',
  'lel',
  'lim',
  'lon',
  'lus',
  'mar',
  'mel',
  'min',
  'mon',
  'mus',
  'nar',
  'nel',
  'nim',
  'nor',
  'nus',
  'par',
  'pel',
  'pim',
  'pon',
  'pus',
  'rar',
  'rel',
  'rim',
  'ron',
  'rus',
  'sar',
  'sel',
  'sim',
  'son',
  'sus',
  'tar',
  'tel',
  'tim',
  'ton',
  'tus',
  'var',
  'vel',
  'vim',
  'von',
  'vus',
  'war',
  'wel',
  'wim',
  'won',
  'wus',
  'yar',
  'yel',
  'yim',
  'yon',
  'yus',
  'zar',
  'zel',
  'zim',
  'zon',
  'zus',
  'zez',
  'zzt',
  'bzt',
  'vzt',
  'kzt',
  'mek',
  'tek',
  'nek',
  'lek',
  'tron',
  'dron',
  'kron',
  'pron',
  'bot',
  'rot',
  'not',
  'lot',
  'zap',
  'blip',
  'bleep',
  'beep',
  'wire',
  'byte',
  'bit',
  'chip',
];

const generatePhoneticSyllable = (seed: number) =>
  phoneticSyllables[seed % phoneticSyllables.length];

const strip0x = (hex: string) => (hex.startsWith('0x') ? hex.slice(2) : hex);

/**
 * Normalize input into a 64-hex seed (32 bytes, no 0x)
 * - bytes32 (64 hex): use directly
 * - address (40 hex): keccak256(addressBytes) -> bytes32 seed
 */
const normalizeToSeedHex64 = (input?: string): string | null => {
  if (!input) return null;

  const hex = input.startsWith('0x') ? input : `0x${input}`;
  if (!utils.isHexString(hex)) return null;

  const raw = strip0x(hex).toLowerCase();

  // bytes32 seed already
  if (raw.length === 64) return raw;

  // address -> hash to bytes32 seed
  if (raw.length === 40) {
    // validate / checksum
    const checksummed = utils.getAddress(`0x${raw}`);
    // hash the *address bytes* (20 bytes)
    const seed32 = utils.keccak256(checksummed);
    return strip0x(seed32).toLowerCase();
  }

  return null;
};

const generatePhoneticNameFromSeed = (
  seedHex64: string,
  startIndex: number,
  syllables: number,
): string => {
  return Array.from({ length: syllables }, (_, i) => {
    const slice = seedHex64.slice(startIndex + i * 8, startIndex + (i + 1) * 8);
    const seedValue = parseInt(slice, 16);

    return Number.isFinite(seedValue)
      ? generatePhoneticSyllable(seedValue)
      : phoneticSyllables[0];
  })
    .join('')
    .toLowerCase();
};

/**
 * Input can be:
 * - bytes32 agentId from computeAgentId(...)
 * - (optionally) legacy address
 */
export const generateName = (input?: string): string => {
  const seed = normalizeToSeedHex64(input);
  if (!seed) return NA;

  // indices are now based on seed WITHOUT 0x
  const firstName = generatePhoneticNameFromSeed(seed, 0, 2);
  const lastNamePrefix = generatePhoneticNameFromSeed(seed, 16, 2);
  const lastNameNumber = parseInt(seed.slice(-4), 16) % 100;

  return `${firstName}-${lastNamePrefix}${String(lastNameNumber).padStart(2, '0')}`;
};
