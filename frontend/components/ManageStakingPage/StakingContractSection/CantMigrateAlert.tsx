import { Flex, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';

import { CantMigrateReason } from './useMigrate';

const { Text } = Typography;

type CantMigrateAlertProps = { stakingProgramId: StakingProgramId };

const AlertInsufficientMigrationFunds = ({
  stakingProgramId: stakingProgramIdToMigrateTo,
}: CantMigrateAlertProps) => {
  const {
    isFetched: isServicesLoaded,
    selectedService,
    selectedAgentConfig,
  } = useServices();
  const { homeChainId } = selectedAgentConfig;
  const serviceConfigId =
    isServicesLoaded && selectedService
      ? selectedService.service_config_id
      : '';
  const { service } = useService({
    serviceConfigId,
  });
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const { isServiceStaked } = useActiveStakingContractInfo();
  const { isLoaded: isBalanceLoaded, totalStakedOlasBalance } =
    useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();
  const { serviceFundRequirements, isInitialFunded } = useNeedsFunds();

  // should find in STAKING_PROGRAMS based on stakingProgramIdToMigrateTo?
  const chainIdToMigrateTo = ChainId.Gnosis;

  const requiredStakedOlas =
    service &&
    STAKING_PROGRAMS[chainIdToMigrateTo][stakingProgramIdToMigrateTo]
      ?.stakingRequirements[TokenSymbol.OLAS];

  const safeBalance = useMemo(() => {
    if (!isBalanceLoaded) return;
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return;
    masterSafeBalances.reduce(
      (acc, { chainId, symbol, balance }) => {
        if (chainId === homeChainId) {
          acc[symbol] = balance;
        }
        return acc;
      },
      {} as Record<TokenSymbol, number>,
    );
  }, [homeChainId, isBalanceLoaded, masterSafeBalances]);

  if (!isAllStakingContractDetailsRecordLoaded) return null;
  if (isNil(requiredStakedOlas)) return null;
  if (isNil(safeBalance?.[TokenSymbol.OLAS])) return null;
  if (isNil(totalStakedOlasBalance)) return null;

  const requiredOlasDeposit = isServiceStaked
    ? requiredStakedOlas -
      (totalStakedOlasBalance + safeBalance[TokenSymbol.OLAS]) // when staked
    : requiredStakedOlas - safeBalance[TokenSymbol.OLAS]; // when not staked

  const requiredXdaiDeposit = isInitialFunded
    ? LOW_MASTER_SAFE_BALANCE - (safeBalance[TokenSymbol.ETH] || 0) // is already funded allow minimal maintenance
    : (serviceFundRequirements[homeChainId]?.[TokenSymbol.ETH] || 0) -
      (safeBalance[TokenSymbol.ETH] || 0); // otherwise require full initial funding requirements

  return (
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="font-weight-600">Additional funds required</Text>
          <Text>
            <ul style={{ marginTop: 0, marginBottom: 4 }}>
              {requiredOlasDeposit > 0 && <li>{requiredOlasDeposit} OLAS</li>}
              {requiredXdaiDeposit > 0 && <li>{requiredXdaiDeposit} XDAI</li>}
            </ul>
            Add the required funds to your account to meet the staking
            requirements.
          </Text>
        </Flex>
      }
    />
  );
};

const AlertNoSlots = () => (
  <CustomAlert
    type="warning"
    showIcon
    message={<Text>No slots currently available - try again later.</Text>}
  />
);

// TODO: uncomment when required
//
// const AlertUpdateToMigrate = () => (
//   <CustomAlert
//     type="warning"
//     showIcon
//     message={
//       <Flex vertical gap={4}>
//         <Text className="font-weight-600">App update required</Text>

//         {/*
//           TODO: Define version requirement in some JSON store?
//           How do we access this date on a previous version?
//         */}
//         <Text>
//           Update Pearl to the latest version to switch to the staking contract.
//         </Text>
//         {/* TODO: trigger update through IPC */}
//         <a href="#" target="_blank">
//           Update Pearl to the latest version {UNICODE_SYMBOLS.EXTERNAL_LINK}
//         </a>
//       </Flex>
//     }
//   />
// );

/**
 * Displays alerts for specific non-migration reasons
 */
export const CantMigrateAlert = ({
  stakingProgramId,
  cantMigrateReason,
}: {
  stakingProgramId: StakingProgramId;
  cantMigrateReason: CantMigrateReason;
}) => {
  if (cantMigrateReason === CantMigrateReason.NoAvailableStakingSlots) {
    return <AlertNoSlots />;
  }

  if (
    cantMigrateReason === CantMigrateReason.InsufficientOlasToMigrate ||
    cantMigrateReason === CantMigrateReason.InsufficientGasToMigrate
  ) {
    return (
      <AlertInsufficientMigrationFunds stakingProgramId={stakingProgramId} />
    );
  }

  return null;
};
