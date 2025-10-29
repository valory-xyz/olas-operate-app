import { AgentLowBalanceAlert } from '@/components/Alerts';
import { Pages } from '@/enums';
import {
  useActiveStakingContractDetails,
  useAnotherAgentRunning,
  useMasterWalletContext,
  useNeedsFunds,
  usePageState,
  useServices,
  useStakingProgram,
} from '@/hooks';

import { AgentRunningAlert } from './AgentRunningAlert';
import { EvictedAlert } from './EvictedAlert';
import { FundYourAgentAfterWithdrawal } from './FundYourAgentAfterWithdrawal';
import { MasterEoaLowBalanceAlert } from './MasterEoaLowBalanceAlert';
import { NoSlotsAvailableAlert } from './NoSlotsAvailableAlert';
import { UnderConstructionAlert } from './UnderConstructionAlert';
import { UnfinishedSetupAlert } from './UnfinishedSetupAlert';

export const AgentDisabledAlert = () => {
  const { selectedAgentConfig } = useServices();
  const { getMasterSafeOf } = useMasterWalletContext();

  const isMasterSafeCreated = !!getMasterSafeOf?.(
    selectedAgentConfig.evmHomeChainId,
  )?.address;

  const {
    isSelectedStakingContractDetailsLoading,
    isAgentEvicted,
    isEligibleForStaking,
    hasEnoughServiceSlots,
    isServiceStaked,
  } = useActiveStakingContractDetails();
  const { selectedStakingProgramId } = useStakingProgram();
  const { isInitialFunded } = useNeedsFunds(selectedStakingProgramId);
  const { goto } = usePageState();
  const isAnotherAgentRunning = useAnotherAgentRunning();

  if (selectedAgentConfig.isUnderConstruction) {
    return <UnderConstructionAlert />;
  }

  if (isAnotherAgentRunning) {
    return <AgentRunningAlert />;
  }

  // The "store" is `undefined` during updates, hence waiting till we get the correct value from the store.
  if (isInitialFunded === false) {
    // If master safe is created and initial funding is false => funds were withdrawn after setup.
    if (isMasterSafeCreated) {
      return <FundYourAgentAfterWithdrawal />;
    }

    // If master safe is not created yet => setup was not finished.
    else {
      return <UnfinishedSetupAlert />;
    }
  }

  if (
    !isSelectedStakingContractDetailsLoading &&
    isServiceStaked === false &&
    hasEnoughServiceSlots === false
  ) {
    return <NoSlotsAvailableAlert />;
  }

  if (isAgentEvicted && !isEligibleForStaking) return <EvictedAlert />;

  // NOTE: Low-balance alerts, each component controls its own visibility.
  return (
    <>
      <AgentLowBalanceAlert onFund={() => goto(Pages.AgentWallet)} />
      <MasterEoaLowBalanceAlert />
    </>
  );
};

/**
 * - set the initiallyFunded to "false" in store as soon as the agent funds is withdrawn.
 *   ===> low balance alert will not be shown anyway so no issues there.
 *
 *  - check if the master safe is created and then then the initially funding is false
 *     ==> means setup was completed and the withdraw was made, HENCE onboarding should be shown
 *  - on "Fund your agent" click, navigate to the "Fund your agent" (ONBOARDING) page.
 *  question: where should the user fund? master SAFE or master EOA? (chances are master safe)
 *
 *  - On reaching "Fund your agent" page, we should NOT create master safe.
 *    - So, have to check if the master safe exists, if yes, then skip that step and go to funding requirements directly.
 *  - NOW once funding is completed, set the initiallyFunded to "true" in store.
 *
 *
 * WHAT ARE THE CONSEQUENCES IF .operate folder is navigated to different machine?
 *.
 */
