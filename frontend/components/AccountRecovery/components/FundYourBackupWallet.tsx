import { Button, Flex, Typography } from 'antd';
import { useCallback } from 'react';
import styled from 'styled-components';

import { BackButton, CardFlex, CopyAddress } from '@/components/ui';
import { COLOR } from '@/constants';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Title, Text } = Typography;

const FundBackWalletTitle = () => (
  <Flex vertical gap={12}>
    <Title level={3} className="m-0">
      Fund Your Backup Wallet
    </Title>
    <Text className="text-neutral-secondary">
      Your backup wallet should have a small amount of funds to pay for the gas
      fees during recovery process.
    </Text>
  </Flex>
);

const AddressContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 10px;
`;

export const FundYourBackupWallet = () => {
  const { onPrev, onNext, backupWalletAddress } = useAccountRecoveryContext();

  const handleContinue = useCallback(() => {
    // Additional logic before continuing can be added here
    onNext();
  }, [onNext]);

  return (
    <Flex align="center" justify="center" className="w-full mt-40">
      <CardFlex
        $gap={32}
        styles={{ body: { padding: '0px 32px' } }}
        style={{ width: 784 }}
      >
        <Flex vertical gap={12}>
          <BackButton onPrev={onPrev} />
          <FundBackWalletTitle />
        </Flex>

        {backupWalletAddress && (
          <Flex vertical gap={8}>
            <Text className="text-neutral-tertiary">
              Your backup wallet address
            </Text>
            <AddressContainer vertical gap={20}>
              <CopyAddress
                address={backupWalletAddress}
                showChainConfirmation={false}
              />
            </AddressContainer>
          </Flex>
        )}

        <Flex>Table</Flex>
        <Flex justify="center" className="w-full">
          <Button type="primary" onClick={handleContinue} size="large">
            Continue
          </Button>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
