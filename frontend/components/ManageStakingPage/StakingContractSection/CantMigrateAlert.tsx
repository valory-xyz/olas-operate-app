import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';

import { CustomAlert } from '@/components/Alert';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import { CantMigrateReason } from './useMigrate';

const { Text } = Typography;

type CantMigrateAlertProps = { stakingProgramId: StakingProgramId };

const AlertInsufficientMigrationFunds = ({
  stakingProgramId,
}: CantMigrateAlertProps) => {
  const { serviceTemplate } = useServiceTemplates();
  const { isServiceStaked } = useStakingContractInfo();
  const { safeBalance, totalOlasStakedBalance } = useBalance();

  const totalOlasRequiredForStaking = getMinimumStakedAmountRequired(
    serviceTemplate,
    stakingProgramId,
  );

  if (isNil(totalOlasRequiredForStaking)) return null;
  if (isNil(safeBalance?.OLAS)) return null;
  if (isNil(totalOlasStakedBalance)) return null;

  const requiredOlasDeposit = isServiceStaked
    ? totalOlasRequiredForStaking - (totalOlasStakedBalance + safeBalance.OLAS) // when staked
    : totalOlasRequiredForStaking - safeBalance.OLAS; // when not staked

  return (
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="font-weight-600">
            An additional {requiredOlasDeposit} OLAS is required to switch
          </Text>
          <Text>
            Add <strong>{requiredOlasDeposit} OLAS</strong> to your account to
            meet the contract requirements and switch.
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

  if (cantMigrateReason === CantMigrateReason.InsufficientOlasToMigrate) {
    return (
      <AlertInsufficientMigrationFunds stakingProgramId={stakingProgramId} />
    );
  }

  return null;
};
