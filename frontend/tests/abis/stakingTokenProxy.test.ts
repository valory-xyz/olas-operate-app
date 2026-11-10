import { ethers } from 'ethers';

import { STAKING_TOKEN_PROXY_ABI } from '../../abis/stakingTokenProxy';

describe('STAKING_TOKEN_PROXY_ABI StakingToken v0.4 baseline entries', () => {
  const abi = new ethers.utils.Interface(STAKING_TOKEN_PROXY_ABI);

  it.each(['rebaselinePending()', 'mapServiceIdBaselineMissing(uint256)'])(
    '%s is a view returning a single bool',
    (signature) => {
      const fragment = abi.getFunction(signature);

      expect(fragment.stateMutability).toBe('view');
      expect(fragment.outputs?.map((output) => output.type)).toEqual(['bool']);
    },
  );
});
