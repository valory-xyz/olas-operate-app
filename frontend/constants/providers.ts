import { ethers } from 'ethers';
import { Provider } from 'ethers-multicall';

import { CHAINS } from './chains';

// export const gnosisProvider = new ethers.providers.StaticJsonRpcProvider(
//   process.env.GNOSIS_RPC,
// );

// export const gnosisMulticallProvider = new Provider(
//   gnosisProvider,
//   CHAINS.GNOSIS.chainId,
// );

export const optimismProvider = new ethers.providers.StaticJsonRpcProvider(
  process.env.OPTIMISM_RPC,
);

export const optimismMulticallProvider = new Provider(
  optimismProvider,
  CHAINS.OPTIMISM.chainId,
);
