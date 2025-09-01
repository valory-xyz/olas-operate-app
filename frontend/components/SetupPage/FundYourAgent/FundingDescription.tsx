import {
  Button,
  Flex,
  Image as AntdImage,
  message,
  Modal,
  Typography,
} from 'antd';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { CopySvg } from '@/components/custom-icons/Copy';
import { WalletSvg } from '@/components/custom-icons/Wallet';
import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants/colors';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';

const { Title, Text } = Typography;

const FundingDescriptionContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
  border-radius: 10px;
  margin-top: 32px;
`;

const TOOLTIP_STYLE = {
  width: 'max-content',
  borderRadius: 10,
  padding: '8px 12px',
};

const MODAL_STYLE = {
  content: {
    padding: 24,
    borderRadius: 24,
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
};

const ChainConfirmationMessageModal = ({
  chainName,
  chainImage,
  onClose,
}: {
  chainName: string;
  chainImage: string;
  onClose: () => void;
}) => {
  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={440}
      styles={MODAL_STYLE}
    >
      <Flex vertical gap={24} align="center">
        <Image width={60} height={60} src={chainImage} alt={chainName} />
        <Title level={4} style={{ margin: 0 }}>
          Send funds on {chainName} Chain
        </Title>
        <Text type="secondary" className="text-center">
          Sending funds on any other network will result in permanent loss. Make
          sure you&apos;re sending on {chainName} Chain before proceeding.
        </Text>
        <Button type="primary" onClick={onClose} block>
          I Understand
        </Button>
      </Flex>
    </Modal>
  );
};

const ExternalWalletTooltip = () => (
  <InfoTooltip
    placement="top"
    overlayInnerStyle={TOOLTIP_STYLE}
    iconStyles={{ color: COLOR.TEXT_NEUTRAL_PRIMARY }}
  >
    <Text className="text-sm">This is the wallet you use outside Pearl</Text>
  </InfoTooltip>
);

export const FundingDescription = ({
  chainName,
  chainImage,
}: {
  chainName: string;
  chainImage: string;
}) => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;
  const [
    isChainConfirmationMessageModalOpen,
    setIsChainConfirmationMessageModalOpen,
  ] = useState(false);

  const handleCopyAddress = useCallback(() => {
    if (address)
      copyToClipboard(address).then(() => message.success('Address copied!'));
    setIsChainConfirmationMessageModalOpen(true);
  }, [address]);

  return (
    <FundingDescriptionContainer vertical gap={24}>
      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">On</Text>
        <Flex align="center" gap={8}>
          <AntdImage width={20} height={20} src={chainImage} alt={chainName} />
          <Text className="text-neutral-primary" style={{ fontSize: 16 }}>
            {chainName} Chain
          </Text>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">From</Text>
        <Flex align="center" gap={8}>
          <WalletSvg />
          <Text>Your external wallet</Text>
          <ExternalWalletTooltip />
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">To Pearl Wallet</Text>
        <Flex align="center" gap={8}>
          <WalletSvg />
          <Text>{address}</Text>
        </Flex>
      </Flex>

      {isChainConfirmationMessageModalOpen && (
        <ChainConfirmationMessageModal
          chainName={chainName}
          chainImage={chainImage}
          onClose={() => setIsChainConfirmationMessageModalOpen(false)}
        />
      )}
      <Flex style={{ marginTop: -8 }}>
        <Button
          size="small"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleCopyAddress}
        >
          <CopySvg /> Copy
        </Button>
      </Flex>
    </FundingDescriptionContainer>
  );
};
