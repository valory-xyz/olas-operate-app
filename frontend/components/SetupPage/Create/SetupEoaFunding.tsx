import { CopyOutlined } from '@ant-design/icons';
import { Flex, message, Tooltip, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { CHAINS } from '@/constants/chains';
import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { SetupScreen } from '@/enums/SetupScreen';
import { useBalance } from '@/hooks/useBalance';
import { useSetup } from '@/hooks/useSetup';
import { useWallet } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title, Paragraph } = Typography;

const AccountCreationCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23A3AEBB' stroke-width='2' stroke-dasharray='6' stroke-dashoffset='15' stroke-linecap='square'/%3e%3c/svg%3e");
  border-radius: 12px;
`;

const ICON_STYLE = { color: '#606F85' };

const SetupEoaFundingWaiting = () => {
  const { masterEoaAddress } = useWallet();

  return (
    <>
      <CardSection>
        <CustomAlert
          fullWidth
          type="warning"
          showIcon
          message={
            <Flex vertical gap={5}>
              <Text strong>Only send funds on {CHAINS.OPTIMISM.name}!</Text>
              <Text>You will lose any assets you send on other chains.</Text>
            </Flex>
          }
        />
      </CardSection>
      <AccountCreationCard>
        <Flex justify="space-between">
          <Text className="text-sm" type="secondary">
            Account creation address
          </Text>
          <Flex gap={10} align="center">
            <Tooltip title="Copy to clipboard">
              <CopyOutlined
                style={ICON_STYLE}
                onClick={() =>
                  masterEoaAddress &&
                  copyToClipboard(masterEoaAddress).then(() =>
                    message.success('Address copied!'),
                  )
                }
              />
            </Tooltip>
          </Flex>
        </Flex>

        <span className="can-select-text break-word">
          {`GNO: ${masterEoaAddress}`}
        </span>
        <CustomAlert
          type="info"
          showIcon
          message={
            'After this point, do not send more funds to this address. Once your account is created, you will be given a new address - send further funds there.'
          }
        />
      </AccountCreationCard>
    </>
  );
};

export const SetupEoaFunding = ({
  isIncomplete,
}: {
  isIncomplete?: boolean;
}) => {
  const { masterEoaBalance: eoaBalance } = useBalance();
  const { goto } = useSetup();

  const isFundedMasterEoa =
    eoaBalance?.ETH &&
    eoaBalance.ETH >=
      MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeCreation;

  const statusMessage = useMemo(() => {
    if (isFundedMasterEoa) {
      return 'Funds have been received!';
    } else {
      return 'Waiting for transaction';
    }
  }, [isFundedMasterEoa]);

  useEffect(() => {
    // Move to create the safe stage once the master EOA is funded
    if (!isFundedMasterEoa) return;
    message.success('Funds have been received!');
    goto(SetupScreen.SetupCreateSafe);
  }, [goto, isFundedMasterEoa]);

  return (
    <CardFlex>
      <SetupCreateHeader
        prev={SetupScreen.SetupBackupSigner}
        disabled={isIncomplete}
      />
      <Title level={3}>
        Deposit{' '}
        {MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeCreation}{' '}
        {CHAINS.OPTIMISM.currency} on {CHAINS.OPTIMISM.name}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection
        padding="12px 24px"
        bordertop="true"
        borderbottom={isFundedMasterEoa ? 'true' : 'false'}
      >
        <Text className={isFundedMasterEoa ? '' : 'loading-ellipses'}>
          Status: {statusMessage}
        </Text>
      </CardSection>
      {!isFundedMasterEoa && <SetupEoaFundingWaiting />}
    </CardFlex>
  );
};
