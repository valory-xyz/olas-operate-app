import { formatUnits } from 'ethers/lib/utils';

import { CHAINS } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';

export const requiredGas = Number(
  formatUnits(
    `${SERVICE_TEMPLATES[0].configurations[CHAINS.GNOSIS.chainId].monthly_gas_estimate}`,
    18,
  ),
);
