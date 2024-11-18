import { Contract } from 'ethers-multicall';

import { GNOSIS_SAFE_ABI } from '@/abis/gnosisSafe';
import { ChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';

const getOwners = async ({
  address,
}: {
  address: Address;
  chainId: ChainId;
}): Promise<Address[]> => {
  const gnosisSafeContract = new Contract(address, GNOSIS_SAFE_ABI);

  return gnosisSafeContract.getOwners();
};

export const GnosisSafeService = {
  getOwners,
};
