import { Flex, Typography } from 'antd';
import { isEmpty, isNil, sum } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CHAIN_CONFIG } from '@/config/chains';
import { getNativeTokenSymbol } from '@/config/tokens';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { WalletOwnerType, WalletType } from '@/enums/Wallet';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { balanceFormat } from '@/utils/numberFormatters';

import { CantMigrateReason } from './useMigrate';

const { Text } = Typography;

type CantMigrateAlertProps = { stakingProgramId: StakingProgramId };

const AlertInsufficientMigrationFunds = ({
  stakingProgramId: stakingProgramIdToMigrateTo,
}: CantMigrateAlertProps) => {
  const { selectedAgentConfig } = useServices();
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const {
    isLoaded: isBalanceLoaded,
    totalStakedOlasBalance: totalStakedOlasBalanceOnHomeChain,
  } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();
  const { serviceFundRequirements, isInitialFunded } = useNeedsFunds(
    stakingProgramIdToMigrateTo,
  );

  const requiredStakedOlas =
    serviceFundRequirements[selectedAgentConfig.evmHomeChainId][
      TokenSymbol.OLAS
    ];

  const masterSafeBalanceOnHomeChain = useMemo(() => {
    if (!isBalanceLoaded) return;
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return;
    return masterSafeBalances.reduce(
      (acc, { evmChainId: chainId, symbol, balance }) => {
        if (chainId === selectedAgentConfig.evmHomeChainId) {
          acc[symbol] = balance;
        }
        return acc;
      },
      {} as Record<TokenSymbol, number>,
    );
  }, [isBalanceLoaded, masterSafeBalances, selectedAgentConfig.evmHomeChainId]);

  if (!isAllStakingContractDetailsRecordLoaded) return null;
  if (isNil(requiredStakedOlas)) return null;
  if (isNil(masterSafeBalanceOnHomeChain?.[TokenSymbol.OLAS])) return null;

  if (isNil(totalStakedOlasBalanceOnHomeChain)) return null;

  const requiredOlasDeposit =
    requiredStakedOlas -
    sum([
      masterSafeBalanceOnHomeChain[TokenSymbol.OLAS],
      totalStakedOlasBalanceOnHomeChain,
    ]);

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const nativeTokenSymbol = getNativeTokenSymbol(homeChainId);
  const requiredNativeTokenDeposit = isInitialFunded
    ? selectedAgentConfig.operatingThresholds[WalletOwnerType.Master][
        WalletType.Safe
      ][CHAIN_CONFIG[selectedAgentConfig.evmHomeChainId].nativeToken.symbol] -
      (masterSafeBalanceOnHomeChain[nativeTokenSymbol] || 0) // is already funded allow minimal maintenance
    : (serviceFundRequirements[homeChainId]?.[nativeTokenSymbol] || 0) -
      (masterSafeBalanceOnHomeChain[nativeTokenSymbol] || 0); // otherwise require full initial funding requirements

  return (
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="font-weight-600">Additional funds required</Text>
          <Text>
            <ul style={{ marginTop: 0, marginBottom: 4 }}>
              {requiredOlasDeposit > 0 && (
                <li>
                  {`${balanceFormat(requiredOlasDeposit, 2)} ${TokenSymbol.OLAS}`}
                </li>
              )}
              {requiredNativeTokenDeposit > 0 && (
                <li>
                  {`${balanceFormat(requiredNativeTokenDeposit, 2)} ${nativeTokenSymbol}`}
                </li>
              )}
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
