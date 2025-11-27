import { Button, Flex, Modal, Spin, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { STEPS } from '@/components/PearlWallet/types';
import { Alert, BackButton, CardFlex } from '@/components/ui';
import { EvmChainId, onRampChainMap } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages, SetupScreen } from '@/enums';
import { usePageState, useServices, useSetup } from '@/hooks';
import { asMiddlewareChain } from '@/utils';

import { OnRampPaymentSteps } from './OnRampPaymentSteps/OnRampPaymentSteps';
import { PayingReceivingTable } from './PayingReceivingTable/PayingReceivingTable';

const { Text, Title } = Typography;

const Loader = () => (
  <Flex
    justify="center"
    align="center"
    className="mt-32"
    style={{ height: 120 }}
  >
    <Spin />
  </Flex>
);

const KeepOpenAlert = () => (
  <Alert
    type="warning"
    showIcon
    message="Keep the app open until the process is complete. It may take a few minutes."
  />
);

type OnBackProps = {
  mode: 'onboard' | 'deposit';
};

const OnBack = ({ mode }: OnBackProps) => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const [isDoNotLeavePageModalOpen, setIsDoNotLeavePageModalOpen] =
    useState(false);

  const handleBackClick = useCallback(() => {
    setIsDoNotLeavePageModalOpen(true);
  }, []);

  const { updateStep } = usePearlWallet();

  const handleLeavePage = useCallback(() => {
    setIsDoNotLeavePageModalOpen(false);

    if (mode === 'deposit') {
      gotoPage(Pages.PearlWallet);
      updateStep(STEPS.DEPOSIT);
    } else {
      gotoPage(Pages.Setup);
      gotoSetup(SetupScreen.FundYourAgent);
    }
  }, [gotoSetup, gotoPage, mode, updateStep]);

  const handleStayOnPage = useCallback(() => {
    setIsDoNotLeavePageModalOpen(false);
  }, []);

  return (
    <>
      <BackButton onPrev={handleBackClick} />

      {isDoNotLeavePageModalOpen && (
        <Modal
          title="Do Not Leave This Page After Payment"
          onCancel={handleStayOnPage}
          footer={[
            <Button key="leave" onClick={handleLeavePage}>
              Leave page
            </Button>,
            <Button key="stay" type="primary" onClick={handleStayOnPage}>
              Stay on this page
            </Button>,
          ]}
          open
          width={635}
          centered
          closable
          styles={{ content: { padding: 32 } }}
        >
          If your credit/debit card payment has been successfully initiated, do
          not leave this page until the process is complete. Funds may take up
          to 10 minutes to be available.
        </Modal>
      )}
    </>
  );
};

type OnRampProps = {
  mode: 'onboard' | 'deposit';
};

export const OnRamp = ({ mode }: OnRampProps) => {
  const { selectedAgentConfig } = useServices();
  const { walletChainId } = usePearlWallet();

  // Compute networkId based on mode
  const networkId = useMemo<EvmChainId | null>(() => {
    if (mode === 'deposit' && walletChainId) {
      const destinationChainName = asMiddlewareChain(walletChainId);
      return onRampChainMap[destinationChainName];
    }
    if (mode === 'onboard') {
      const fromChainName = asMiddlewareChain(
        selectedAgentConfig.evmHomeChainId,
      );
      return onRampChainMap[fromChainName];
    }
    return null;
  }, [mode, walletChainId, selectedAgentConfig.evmHomeChainId]);

  return (
    <Flex justify="center" className="pt-36">
      <CardFlex $noBorder $onboarding className="p-8">
        <OnBack mode={mode} />
        <Title level={3} className="mt-16">
          Buy Crypto with USD
        </Title>
        <Text type="secondary" className="mb-24">
          Use your credit or debit card to buy crypto effortlessly - powered by
          Transak.
        </Text>

        <KeepOpenAlert />

        {networkId ? (
          <Flex vertical gap={24} className="mt-32">
            <PayingReceivingTable onRampChainId={networkId} mode={mode} />
            <OnRampPaymentSteps onRampChainId={networkId} mode={mode} />
          </Flex>
        ) : (
          <Loader />
        )}
      </CardFlex>
    </Flex>
  );
};
