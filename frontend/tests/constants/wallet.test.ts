/**
 * Tests for wallet type constants.
 *
 * WALLET_TYPE and WALLET_OWNER values are sent to the middleware API and
 * used to differentiate safe multisigs from EOAs and master from agent
 * wallets. Wrong values cause incorrect wallet operations.
 */

import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';

describe('WALLET_TYPE', () => {
  it('Safe maps to "multisig" (the middleware API identifier)', () => {
    expect(WALLET_TYPE.Safe).toBe('multisig');
  });

  it('EOA maps to "eoa"', () => {
    expect(WALLET_TYPE.EOA).toBe('eoa');
  });

  it('covers exactly 2 wallet types', () => {
    expect(Object.keys(WALLET_TYPE)).toHaveLength(2);
  });

  it('has no duplicate values', () => {
    const values = Object.values(WALLET_TYPE);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('WALLET_OWNER', () => {
  it('Master maps to "master"', () => {
    expect(WALLET_OWNER.Master).toBe('master');
  });

  it('Agent maps to "agent"', () => {
    expect(WALLET_OWNER.Agent).toBe('agent');
  });

  it('covers exactly 2 wallet owner types', () => {
    expect(Object.keys(WALLET_OWNER)).toHaveLength(2);
  });

  it('has no duplicate values', () => {
    const values = Object.values(WALLET_OWNER);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
