import { Button, Popover } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { Pages } from '@/enums/PageState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { ServicesService } from '@/service/Services';

import { CountdownUntilMigration } from './CountdownUntilMigration';
import { CantMigrateReason, useMigrate } from './useMigrate';

type MigrateButtonProps = {
  stakingProgramId: StakingProgramId;
};
export const MigrateButton = ({ stakingProgramId }: MigrateButtonProps) => {
  const { goto } = usePageState();
  const { serviceTemplate } = useServiceTemplates();
  const { setIsServicePollingPaused, setServiceStatus, updateServiceStatus } =
    useServices();
  const { setIsPaused: setIsBalancePollingPaused } = useBalance();
  const { updateActiveStakingProgramId: updateStakingProgram } =
    useStakingProgram();
  const { activeStakingContractInfo } = useStakingContractInfo();
  const { setMigrationModalOpen } = useModals();

  const { migrateValidation } = useMigrate(stakingProgramId);

  const popoverContent = useMemo(() => {
    if (migrateValidation.canMigrate) return null;

    if (
      migrateValidation.reason ===
        CantMigrateReason.NotStakedForMinimumDuration &&
      !isNil(activeStakingContractInfo)
    ) {
      return (
        <CountdownUntilMigration
          activeStakingContractInfo={activeStakingContractInfo}
        />
      );
    }

    return migrateValidation.reason;
  }, [activeStakingContractInfo, migrateValidation]);

  return (
    <Popover content={popoverContent}>
      <Button
        type="primary"
        size="large"
        disabled={!migrateValidation.canMigrate}
        onClick={async () => {
          setIsServicePollingPaused(true);
          setIsBalancePollingPaused(true);

          try {
            setServiceStatus(DeploymentStatus.DEPLOYING);
            goto(Pages.Main);

            await ServicesService.createService({
              stakingProgramId,
              serviceTemplate,
              deploy: true,
            });

            await updateStakingProgram();

            setMigrationModalOpen(true);
          } catch (error) {
            console.error(error);
          } finally {
            setIsServicePollingPaused(false);
            setIsBalancePollingPaused(false);
            updateServiceStatus();
          }
        }}
      >
        Switch and run agent
      </Button>
    </Popover>
  );
};
