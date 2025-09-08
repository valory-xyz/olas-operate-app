import { LoadingOutlined } from '@ant-design/icons';
import { Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { CustomAlert } from '@/components/Alert';
import { AgentSetupCompleteModal } from '@/components/ui/AgentSetupCompleteModal';
import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { FundingDescription } from '@/components/ui/FundingDescription';
import { Modal } from '@/components/ui/Modal';
import { TokenRequirementsTable } from '@/components/ui/TokenRequirementsTable';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterSafeCreationAndTransfer } from '@/hooks/useMasterSafeCreationAndTransfer';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { delayInSeconds } from '@/utils/delay';

import { useGetRefillRequirementsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';
import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';

const { Text, Title } = Typography;

const FinishingSetupModal = () => (
  <Modal
    header={<Spin indicator={<LoadingOutlined spin />} size="large" />}
    title="Finishing Setup"
    description="It usually takes a few minutes. Please keep the app open until the
process is complete."
  />
);

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
    data: masterSafeDetails,
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
    if (masterSafeDetails?.isSafeCreated) return;
    createMasterSafe();
  }, [createMasterSafe, masterSafeDetails?.isSafeCreated]);

  useEffect(() => {
    if (isFullyFunded) {
      handleFunded();
    }
  }, [isFullyFunded, handleFunded]);

  useEffect(() => {
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (!isSuccessMasterSafeCreation) return;

    // Show setup finished modal after a bit of delay so the finishing setup modal is closed.
    delayInSeconds(0.25).then(() => {
      setShowSetupFinishedModal(true);
    });
  }, [
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSuccessMasterSafeCreation,
    setShowSetupFinishedModal,
  ]);

  useUnmount(() => {
    setShowSetupFinishedModal(false);
  });

  return (
    <Flex justify="center" className="pt-48">
      <CardFlex $noBorder $onboarding className="p-8">
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
