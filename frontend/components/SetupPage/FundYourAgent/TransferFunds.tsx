import { Button, Flex, Spin, Typography } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { LoadingOutlined, WarningOutlined } from '@/components/custom-icons';
import {
  AgentSetupCompleteModal,
  Alert,
  BackButton,
  CardFlex,
  FundingDescription,
  Modal,
  TokenRequirementsTable,
} from '@/components/ui';
import { TokenSymbol } from '@/config/tokens';
import { CHAIN_IMAGE_MAP, EvmChainName, SETUP_SCREEN } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import {
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

type MasterSafeCreationFailedModalProps = {
  onTryAgain: () => void;
  onContactSupport: () => void;
};
const MasterSafeCreationFailedModal = ({
  onTryAgain,
  onContactSupport,
}: MasterSafeCreationFailedModalProps) => (
  <Modal
    header={<WarningOutlined />}
    title="Master Safe Creation Failed"
    description="Please try again in a few minutes."
    action={
      <Flex gap={16} vertical className="mt-24 w-full">
        <Button onClick={onTryAgain} type="primary" block size="large">
          Try Again
        </Button>
        <Button onClick={onContactSupport} type="default" block size="large">
          Contact Support
        </Button>
      </Flex>
    }
  />
);

export const TransferFunds = () => {
  const { goto: gotoSetup } = useSetup();
  const { toggleSupportModal } = useSupportModal();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const { isFullyFunded, tokensFundingStatus, isLoading } =
    useTokensFundingStatus();
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    mutate: createMasterSafe,
    isSuccess: isSuccessMasterSafeCreation,
    data: creationAndTransferDetails,
  } = useMasterSafeCreationAndTransfer(
    Object.keys(tokensFundingStatus) as TokenSymbol[],
  );
  const [showSetupFinishedModal, setShowSetupFinishedModal] = useState(false);
  const [showSafeCreationFailedModal, setShowSafeCreationFailedModal] =
    useState(false);
  const hasAttemptedCreation = useRef(false);

  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const chainImage = CHAIN_IMAGE_MAP[evmHomeChainId];
  const isSafeCreated = isMasterWalletFetched
    ? !isNil(getMasterSafeOf?.(evmHomeChainId)) ||
      creationAndTransferDetails?.safeCreationDetails?.isSafeCreated
    : false;
  const isTransferComplete =
    creationAndTransferDetails?.transferDetails.isTransferComplete;

  const destinationAddress = isMasterWalletFetched
    ? getMasterSafeOf?.(evmHomeChainId)?.address || masterEoa?.address
    : null;

  // Check if safe creation or transfer failed
  const hasSafeCreationFailure = (() => {
    const safeCreationDetails = creationAndTransferDetails?.safeCreationDetails;

    // Treat both network/transport errors and backend-reported errors as failures
    return isErrorMasterSafeCreation || safeCreationDetails?.status === 'error';
  })();
  const hasTransferFailure = (() => {
    const safeCreationDetails = creationAndTransferDetails?.safeCreationDetails;
    const transferDetails = creationAndTransferDetails?.transferDetails;
    const transfersHaveError = transferDetails?.transfers?.some(
      (t) => t.status === 'error',
    );

    return (
      safeCreationDetails?.isSafeCreated &&
      !transferDetails?.isTransferComplete &&
      transfersHaveError
    );
  })();
  const shouldShowFailureModal = hasSafeCreationFailure || hasTransferFailure;

  const handleTryAgain = useCallback(() => {
    setShowSafeCreationFailedModal(false);
    hasAttemptedCreation.current = false; // Reset to allow retry
    createMasterSafe();
  }, [createMasterSafe]);

  const handleContactSupport = useCallback(() => {
    toggleSupportModal();
  }, [toggleSupportModal]);

  // If funds are already received, proceed to create the Master Safe (only once)
  useEffect(() => {
    if (!isFullyFunded) return;
    if (!isMasterWalletFetched) return;
    if (isTransferComplete) return;
    if (hasAttemptedCreation.current) return;

    hasAttemptedCreation.current = true;
    createMasterSafe();
  }, [
    isFullyFunded,
    isMasterWalletFetched,
    isSafeCreated,
    isTransferComplete,
    createMasterSafe,
    hasAttemptedCreation,
  ]);

  // If master safe creation or transfer failed, show the failure modal
  useEffect(() => {
    if (!shouldShowFailureModal) return;
    setShowSafeCreationFailedModal(true);
  }, [shouldShowFailureModal]);

  useEffect(() => {
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isTransferComplete) return;
    if (!isFullyFunded) return;

    // Show setup finished modal after a bit of delay so the finishing setup modal is closed.
    delayInSeconds(0.25).then(() => {
      setShowSetupFinishedModal(true);
      setShowSafeCreationFailedModal(false);
    });
  }, [
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    isSuccessMasterSafeCreation,
    setShowSetupFinishedModal,
    isSafeCreated,
    isTransferComplete,
    isFullyFunded,
  ]);

  useUnmount(() => {
    setShowSetupFinishedModal(false);
    setShowSafeCreationFailedModal(false);
  });

  return (
    <Flex justify="center" className="pt-36">
      <CardFlex $noBorder $onboarding className="p-8">
        <BackButton onPrev={() => gotoSetup(SETUP_SCREEN.FundYourAgent)} />
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
          tokensDataSource={Object.values(tokensFundingStatus)}
          className="mt-32"
        />
      </CardFlex>

      {showSetupFinishedModal ? (
        <AgentSetupCompleteModal />
      ) : (
        <>
          {isLoadingMasterSafeCreation && <FinishingSetupModal />}
          {showSafeCreationFailedModal && (
            <MasterSafeCreationFailedModal
              onTryAgain={handleTryAgain}
              onContactSupport={handleContactSupport}
            />
          )}
        </>
      )}
    </Flex>
  );
};
