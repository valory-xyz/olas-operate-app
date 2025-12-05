import { Button, Flex, Typography } from 'antd';
import styled from 'styled-components';

import {
  BackButton,
  CardFlex,
  CopyAddress,
  TokenRequirementsTable,
} from '@/components/ui';
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
  const {
    onPrev,
    onNext,
    isRecoveryFundingListLoading,
    backupWalletAddress,
    recoveryFundingList,
  } = useAccountRecoveryContext();

  const isBackOwnerFunded = recoveryFundingList.every(
    (token) => token.areFundsReceived,
  );

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
              <CopyAddress address={backupWalletAddress} />
            </AddressContainer>
          </Flex>
        )}

        <TokenRequirementsTable
          isLoading={isRecoveryFundingListLoading}
          tokensDataSource={recoveryFundingList}
          showChainColumn={true}
        />
        <Flex justify="center" className="w-full">
          <Button
            disabled={!isBackOwnerFunded || isRecoveryFundingListLoading}
            onClick={isBackOwnerFunded ? onNext : undefined}
            type="primary"
            size="large"
          >
            Continue
          </Button>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
