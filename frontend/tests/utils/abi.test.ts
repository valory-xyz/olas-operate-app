import { JsonFragment } from '@ethersproject/abi';

import { extractFunctionsFromAbi } from '../../utils/abi';

describe('extractFunctionsFromAbi', () => {
  it('returns only function items from ABI', () => {
    const abi = [
      { type: 'function', name: 'transfer' },
      { type: 'event', name: 'Transfer' },
      { type: 'function', name: 'approve' },
      { type: 'constructor' },
    ] as JsonFragment[];

    const result = extractFunctionsFromAbi(abi);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('transfer');
    expect(result[1].name).toBe('approve');
  });

  it('returns empty array when no functions exist', () => {
    const abi = [
      { type: 'event', name: 'Transfer' },
      { type: 'constructor' },
    ] as JsonFragment[];

    expect(extractFunctionsFromAbi(abi)).toHaveLength(0);
  });

  it('returns empty array for empty ABI', () => {
    expect(extractFunctionsFromAbi([])).toHaveLength(0);
  });
});
