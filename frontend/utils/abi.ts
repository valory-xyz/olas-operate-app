import { JsonFragment } from '@ethersproject/abi';

import { Abi } from '@/types/Abi';

export const extractFunctionsFromAbi = (abi: Abi) =>
  abi.filter(
    (item) => (item as JsonFragment).type === 'function',
  ) as JsonFragment[];
