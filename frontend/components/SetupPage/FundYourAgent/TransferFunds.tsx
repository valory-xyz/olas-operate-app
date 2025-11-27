import { Flex, Spin, Typography } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { LoadingOutlined } from '@/components/custom-icons';
import {
  AgentSetupCompleteModal,
  Alert,
  BackButton,
  CardFlex,
  FundingDescription,
  Modal,
  TokenRequirementsTable,
} from '@/components/ui';
import { ChainImageMap, EvmChainName, TokenSymbol } from '@/constants';
import { SetupScreen } from '@/enums';
import {
  useGetRefillRequirements,
  useMasterSafeCreationAndTransfer,
  useMasterWalletContext,
  useServices,
  useSetup,
} from '@/hooks';
import { delayInSeconds } from '@/utils';

import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';

const { Text, Title } = Typography;

const FinishingSetupModal = () => (
  <Modal
    header={<Spin indicator={<LoadingOutlined />} size="large" />}
    title="Finishing Setup"
    description="It usually takes a few minutes. Please keep the app open until the process is complete."
  />
);

export const TransferFunds = () => {
  const { goto: gotoSetup } = useSetup();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const { isFullyFunded, tokensFundingStatus } = useTokensFundingStatus();
  const { initialTokenRequirements, isLoading } = useGetRefillRequirements();
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
  const isSafeCreated = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(evmHomeChainId)) ||
      masterSafeDetails?.isSafeCreated
    : false;

  const destinationAddress = isMasterWalletFetched
    ? getMasterSafeOf?.(evmHomeChainId)?.address || masterEoa?.address
    : null;

  const tokensDataSource = useMemo(() => {
    return (initialTokenRequirements ?? []).map((token) => {
      const { amount: totalAmount } = token;
      const { pendingAmount, funded: areFundsReceived } =
        tokensFundingStatus?.[token.symbol] ?? {};
      return {
        ...token,
        totalAmount,
        pendingAmount,
        areFundsReceived,
      };
    });
  }, [initialTokenRequirements, tokensFundingStatus]);

  const handleFunded = useCallback(async () => {
    if (!isMasterWalletFetched) return;
    if (isSafeCreated) return;
    createMasterSafe();
  }, [createMasterSafe, isMasterWalletFetched, isSafeCreated]);

  useEffect(() => {
    if (isFullyFunded) {
      handleFunded();
    }
  }, [isFullyFunded, handleFunded]);

  useEffect(() => {
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isFullyFunded) return;

    // Show setup finished modal after a bit of delay so the finishing setup modal is closed.
    delayInSeconds(0.25).then(() => {
      setShowSetupFinishedModal(true);
    });
  }, [
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSuccessMasterSafeCreation,
    setShowSetupFinishedModal,
    isSafeCreated,
    isFullyFunded,
  ]);

  useUnmount(() => {
    setShowSetupFinishedModal(false);
  });

  return (
    <Flex justify="center" className="pt-36">
      <CardFlex $noBorder $onboarding className="p-8">
        <BackButton onPrev={() => gotoSetup(SetupScreen.FundYourAgent)} />
        <Title level={3} className="mt-16">
          Transfer Crypto on {chainName}
        </Title>
        <Text className="text-neutral-secondary">
          Send the specified amounts from your external wallet to the Pearl
          Wallet address below. Pearl will automatically detect your transfer.
        </Text>

        <Alert
          showIcon
          type="warning"
          className="mt-24"
          message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
        />

        {destinationAddress && (
          <FundingDescription
            address={destinationAddress}
            chainName={chainName}
            chainImage={chainImage}
            style={{ marginTop: 32 }}
          />
        )}

        <TokenRequirementsTable
          isLoading={isLoading}
          tokensDataSource={tokensDataSource}
        />
      </CardFlex>

      {isLoadingMasterSafeCreation && !showSetupFinishedModal && (
        <FinishingSetupModal />
      )}
      {showSetupFinishedModal && <AgentSetupCompleteModal />}
    </Flex>
  );
};
