import { Button, Flex, Modal, Spin, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { STEPS } from '@/components/PearlWallet/types';
import { Alert, BackButton, CardFlex } from '@/components/ui';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages, SetupScreen } from '@/enums';
import { useOnRampContext, usePageState, useSetup } from '@/hooks';

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

const OnBack = () => {
  const { goto: gotoSetup, prevState } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { isFromDepositFlow, setIsFromDepositFlow } = useOnRampContext();
  const [isDoNotLeavePageModalOpen, setIsDoNotLeavePageModalOpen] =
    useState(false);

  const handleBackClick = useCallback(() => {
    setIsDoNotLeavePageModalOpen(true);
  }, []);

  const { updateStep } = usePearlWallet();

  const handleLeavePage = useCallback(() => {
    setIsDoNotLeavePageModalOpen(false);

    if (isFromDepositFlow) {
      setIsFromDepositFlow(false);
      gotoPage(Pages.PearlWallet);
      updateStep(STEPS.DEPOSIT);
    } else {
      gotoSetup(prevState ?? SetupScreen.FundYourAgent);
    }
  }, [
    gotoSetup,
    gotoPage,
    prevState,
    isFromDepositFlow,
    setIsFromDepositFlow,
    updateStep,
  ]);

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

export const SetupOnRamp = () => {
  const { networkId } = useOnRampContext();

  return (
    <Flex justify="center" className="pt-36">
      <CardFlex $noBorder $onboarding className="p-8">
        <OnBack />
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
            <PayingReceivingTable onRampChainId={networkId} />
            <OnRampPaymentSteps onRampChainId={networkId} />
          </Flex>
        ) : (
          <Loader />
        )}
      </CardFlex>
    </Flex>
  );
};
