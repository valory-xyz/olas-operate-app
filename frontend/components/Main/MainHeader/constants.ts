// @TODO - Move to constants folder for reuse
import { formatUnits } from 'ethers/lib/utils';

import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';

const olasCostOfBond = Number(
  formatUnits(`${SERVICE_TEMPLATES[0].configuration.olas_cost_of_bond}`, 18),
);
const olasRequiredToStake = Number(
  formatUnits(
    `${SERVICE_TEMPLATES[0].configuration.olas_required_to_stake}`,
    18,
  ),
);

export const requiredOlas = olasCostOfBond + olasRequiredToStake;
export const requiredGas = Number(
  formatUnits(`${SERVICE_TEMPLATES[0].configuration.monthly_gas_estimate}`, 18),
);
