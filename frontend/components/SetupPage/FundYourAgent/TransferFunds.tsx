import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { BackButton } from '@/components/ui/BackButton';
import { FundingDescription } from '@/components/ui/FundingDescription';
import { TokenRequirementsTable } from '@/components/ui/TokenRequirementsTable';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { ONBOARDING_PAYMENT_CARD_WIDTH } from '@/constants/width';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterSafeCreationAndTransfer } from '@/hooks/useMasterSafeCreationAndTransfer';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { delayInSeconds } from '@/utils/delay';

import { FinishingSetupModal } from './components/FinishingSetupModal';
import { useGetRefillRequirementsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';
import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';

const { Text, Title } = Typography;

export const TransferFunds = () => {
  const { goto: gotoSetup } = useSetup();

  const { selectedAgentConfig } = useServices();
  const { isFullyFunded, tokensFundingStatus } = useTokensFundingStatus({
    selectedAgentConfig,
  });
  const { initialTokenRequirements, isLoading } =
    useGetRefillRequirementsWithMonthlyGas({
      selectedAgentConfig,
    });
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    mutateAsync: createMasterSafe,
    isSuccess: isSuccessMasterSafeCreation,
  } = useMasterSafeCreationAndTransfer(
    Object.keys(tokensFundingStatus) as TokenSymbol[],
  );
  const [showSetupFinishedModal, setShowSetupFinishedModal] = useState(false);

  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const chainImage = ChainImageMap[evmHomeChainId];

  const tableData = useMemo(() => {
    return (initialTokenRequirements ?? []).map((token) => ({
      ...token,
      areFundsReceived:
        tokensFundingStatus[token.symbol as keyof typeof tokensFundingStatus],
    }));
  }, [initialTokenRequirements, tokensFundingStatus]);

  const handleFunded = useCallback(async () => {
    createMasterSafe();
  }, [createMasterSafe]);

  useEffect(() => {
    if (isFullyFunded) {
      handleFunded();
    }
  }, [isFullyFunded, handleFunded]);

  useEffect(() => {
    const handleSetupFinished = async () => {
      // Show setup finished modal after a bit of delay so the finishing setup modal is closed.
      await delayInSeconds(0.25);
      setShowSetupFinishedModal(true);
    };
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (!isSuccessMasterSafeCreation) return;

    handleSetupFinished();
  }, [
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSuccessMasterSafeCreation,
    setShowSetupFinishedModal,
  ]);

  useEffect(() => {
    return () => {
      setShowSetupFinishedModal(false);
    };
  }, []);

  return (
    <Flex justify="center" style={{ marginTop: 40 }}>
      <CardFlex
        className="p-8"
        $noBorder
        style={{ width: ONBOARDING_PAYMENT_CARD_WIDTH }}
      >
        <BackButton onPrev={() => gotoSetup(SetupScreen.FundYourAgent)} />
        <Title level={3} className="mt-16">
          Transfer Crypto on {chainName}
        </Title>
        <Text className="text-neutral-secondary">
          Send the specified amounts from your external wallet to the Pearl
          Wallet address below. Pearl will automatically detect your transfer.
        </Text>

        <CustomAlert
          showIcon
          type="warning"
          className="mt-24"
          message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
        />

        <FundingDescription chainName={chainName} chainImage={chainImage} />

        <TokenRequirementsTable isLoading={isLoading} tableData={tableData} />
      </CardFlex>

      {isLoadingMasterSafeCreation && !showSetupFinishedModal && (
        <FinishingSetupModal />
      )}
      {showSetupFinishedModal && <AgentSetupCompleteModal />}
    </Flex>
  );
};
