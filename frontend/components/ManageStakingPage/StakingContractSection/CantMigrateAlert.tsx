import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';

import { CustomAlert } from '@/components/Alert';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import { CantMigrateReason } from './useMigrate';

const { Text } = Typography;

type CantMigrateAlertProps = { stakingProgramId: StakingProgramId };

const AlertInsufficientMigrationFunds = ({
  stakingProgramId,
}: CantMigrateAlertProps) => {
  const { serviceTemplate } = useServiceTemplates();
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();
  const { isServiceStaked } = useActiveStakingContractInfo();
  const { masterSafeBalance: safeBalance, totalOlasStakedBalance } =
    useBalance();
  const { serviceFundRequirements, isInitialFunded } = useNeedsFunds();

  const totalOlasRequiredForStaking = getMinimumStakedAmountRequired(
    serviceTemplate,
    stakingProgramId,
  );

  if (!isAllStakingContractDetailsRecordLoaded) return null;
  if (isNil(totalOlasRequiredForStaking)) return null;
  if (isNil(safeBalance?.OLAS)) return null;
  if (isNil(totalOlasStakedBalance)) return null;

  const requiredOlasDeposit = isServiceStaked
    ? totalOlasRequiredForStaking - (totalOlasStakedBalance + safeBalance.OLAS) // when staked
    : totalOlasRequiredForStaking - safeBalance.OLAS; // when not staked

  const requiredXdaiDeposit = isInitialFunded
    ? LOW_MASTER_SAFE_BALANCE - safeBalance.ETH // is already funded allow minimal maintenance
    : serviceFundRequirements.eth - safeBalance.ETH; // otherwise require full initial funding requirements

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
