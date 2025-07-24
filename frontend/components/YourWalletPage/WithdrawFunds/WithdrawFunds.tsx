import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, message, Tooltip, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { useCallback, useMemo, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractCountdown } from '@/hooks/useStakingContractCountdown';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';

import { WithdrawFundsModal } from './WithdrawFundsModal';

const { Text } = Typography;

const minDurationMessage =
  "You have not reached the minimum duration of staking. Keep running your agent and you'll be able to withdraw in";

const ServiceNotRunning = () => (
  <div className="mt-8">
    <InfoCircleOutlined style={{ color: COLOR.TEXT_LIGHT }} />
    &nbsp;
    <Text className="text-sm text-light">
      Proceeding with withdrawal will stop your running agent.
    </Text>
  </div>
);

export const WithdrawFunds = () => {
  const isWithdrawFundsEnabled = useFeatureFlag('withdraw-funds');
  const { selectedService, refetch: refetchServices } = useServices();
  const { refetch: refetchMasterWallets } = useMasterWalletContext();
  const { updateBalances } = useBalanceContext();
  const { service, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );
  const { isServiceStakedForMinimumDuration, selectedStakingContractDetails } =
    useActiveStakingContractDetails();
  const countdownDisplay = useStakingContractCountdown({
    currentStakingContractInfo: selectedStakingContractDetails,
  });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const refetchDetails = useCallback(async () => {
    try {
      await refetchServices?.();
      await refetchMasterWallets?.();
      await updateBalances();
    } catch (error) {
      console.error('Failed to refetch details after withdrawal', error);
    }
  }, [refetchServices, refetchMasterWallets, updateBalances]);

  const handleProceed = useCallback(
    async (withdrawAddress: string) => {
      if (!withdrawAddress) return;
      if (!selectedService?.service_config_id) return;

      const isValidAddress = isAddress(withdrawAddress);
      if (!isValidAddress) {
        message.error('Please enter a valid address');
        return;
      }

      setIsWithdrawalLoading(true);
      message.loading('Withdrawal pending. It may take a few minutes.');

      try {
        const response = await ServicesService.withdrawBalance({
          withdrawAddress: withdrawAddress as Address,
          serviceConfigId: selectedService.service_config_id,
        });

        if (response.error) {
          message.error(response.error);
        } else {
          message.success('Transaction complete.');
          await refetchDetails(); // refetch and keep up to date
          handleCancel(); // Close modal after withdrawal is successful
        }
      } catch (error) {
        message.error('Failed to withdraw funds. Please try again.');
        console.error(error);
      } finally {
        setIsWithdrawalLoading(false);
      }
    },
    [selectedService?.service_config_id, refetchDetails, handleCancel],
  );

  const withdrawAllTooltipText = useMemo(() => {
    if (!isWithdrawFundsEnabled) {
      return 'Available soon!';
    }

    // countdown for withdrawal
    if (!isServiceStakedForMinimumDuration) {
      return `${minDurationMessage} ${countdownDisplay}`;
    }

    return null;
  }, [
    countdownDisplay,
    isServiceStakedForMinimumDuration,
    isWithdrawFundsEnabled,
  ]);

  return (
    <>
      <Tooltip
        title={
          withdrawAllTooltipText ? (
            <Text className="text-sm">{withdrawAllTooltipText}</Text>
          ) : null
        }
      >
        <Button
          onClick={showModal}
          disabled={
            !service ||
            !isServiceStakedForMinimumDuration ||
            !isWithdrawFundsEnabled
          }
          block
          size="large"
        >
          Withdraw all funds
        </Button>
      </Tooltip>

      {!isServiceRunning && <ServiceNotRunning />}

      {isModalVisible && (
        <WithdrawFundsModal
          isWithdrawing={isWithdrawalLoading}
          onClose={handleCancel}
          onWithdraw={handleProceed}
        />
      )}
    </>
  );
};
