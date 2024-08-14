import { formatUnits } from 'ethers/lib/utils';

import { ServiceTemplate } from '@/client';

export const getMinimumStakedAmountRequired = (
  serviceTemplate: ServiceTemplate,
) => {
  const olasCostOfBond = Number(
    formatUnits(`${serviceTemplate.configuration.olas_cost_of_bond}`, 18),
  );
  const olasRequiredToStake = Number(
    formatUnits(`${serviceTemplate.configuration.olas_required_to_stake}`, 18),
  );

  return olasCostOfBond + olasRequiredToStake;
};
