import { AddressSchema, TxnHashSchema } from '../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
} from '../helpers/factories';

describe('TxnHashSchema', () => {
  it('accepts a valid 66-character transaction hash', () => {
    expect(TxnHashSchema.safeParse(MOCK_TX_HASH_1).success).toBe(true);
    expect(TxnHashSchema.safeParse(MOCK_TX_HASH_2).success).toBe(true);
  });

  it('rejects a hash that is too short', () => {
    expect(TxnHashSchema.safeParse('0xabc123').success).toBe(false);
  });

  it('rejects a hash that is too long', () => {
    const tooLong = `${MOCK_TX_HASH_1}ff`;
    expect(TxnHashSchema.safeParse(tooLong).success).toBe(false);
  });

  it('rejects a hash without 0x prefix', () => {
    const noPrefix = MOCK_TX_HASH_1.slice(2);
    expect(TxnHashSchema.safeParse(noPrefix).success).toBe(false);
  });

  it('rejects a hash with invalid characters', () => {
    const invalid =
      '0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
    expect(TxnHashSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(TxnHashSchema.safeParse(123).success).toBe(false);
    expect(TxnHashSchema.safeParse(null).success).toBe(false);
    expect(TxnHashSchema.safeParse(undefined).success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(TxnHashSchema.safeParse('').success).toBe(false);
  });
});

describe('AddressSchema', () => {
  it('accepts a valid 42-character address', () => {
    expect(AddressSchema.safeParse(DEFAULT_EOA_ADDRESS).success).toBe(true);
    expect(AddressSchema.safeParse(DEFAULT_SAFE_ADDRESS).success).toBe(true);
  });

  it('accepts a lowercase address', () => {
    const lower = DEFAULT_EOA_ADDRESS.toLowerCase();
    expect(AddressSchema.safeParse(lower).success).toBe(true);
  });

  it('rejects an address that is too short', () => {
    expect(AddressSchema.safeParse('0x1234').success).toBe(false);
  });

  it('rejects an address that is too long', () => {
    const tooLong = `${DEFAULT_EOA_ADDRESS}ff`;
    expect(AddressSchema.safeParse(tooLong).success).toBe(false);
  });

  it('rejects an address without 0x prefix', () => {
    const noPrefix = DEFAULT_EOA_ADDRESS.slice(2);
    expect(AddressSchema.safeParse(noPrefix).success).toBe(false);
  });

  it('rejects an address with invalid hex characters', () => {
    const invalid = '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';
    expect(AddressSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(AddressSchema.safeParse(42).success).toBe(false);
    expect(AddressSchema.safeParse(null).success).toBe(false);
    expect(AddressSchema.safeParse(undefined).success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(AddressSchema.safeParse('').success).toBe(false);
  });
});
