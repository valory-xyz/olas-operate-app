import { ethers } from 'ethers';

import { GNOSIS_SAFE_ABI } from '@/abis/gnosisSafe';
import { provider } from '@/constants/providers';
import { Address } from '@/types/Address';

const getOwners = async ({
  address,
}: {
  address: Address;
}): Promise<Address[]> => {
  const gnosisSafeContract = new ethers.Contract(
    address,
    GNOSIS_SAFE_ABI,
    provider,
  );

  return gnosisSafeContract.getOwners();
};

export const GnosisSafeService = {
  getOwners,
};
