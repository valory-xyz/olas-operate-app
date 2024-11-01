import { CopyOutlined } from '@ant-design/icons';
import { Flex, message, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
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
import { delayInSeconds } from '@/utils/delay';

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

type SetupEoaFundingWaitingProps = { chainName: string };
const SetupEoaFundingWaiting = ({ chainName }: SetupEoaFundingWaitingProps) => {
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
              <Text strong>Only send funds on {chainName}!</Text>
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
        {/* <CustomAlert
          type="info"
          showIcon
          message={
            'After this point, do not send more funds to this address. Once your account is created, you will be given a new address - send further funds there.'
          }
        /> */}
      </AccountCreationCard>
    </>
  );
};

type SetupEoaFundingProps = {
  isFunded: boolean;
  minRequiredBalance: number;
  currency: string;
  chainName: string;
  onFunded: () => void;
};
export const SetupEoaFundingForChain = ({
  isFunded,
  minRequiredBalance,
  currency,
  chainName,
  onFunded,
}: SetupEoaFundingProps) => {
  const { goto } = useSetup();

  const statusMessage = useMemo(() => {
    if (isFunded) {
      return 'Funds have been received!';
    } else {
      return 'Waiting for transaction';
    }
  }, [isFunded]);

  useEffect(() => {
    if (!isFunded) return;

    message.success('Funds have been received!');

    // Wait for a second before moving to the next step
    delayInSeconds(1).then(onFunded);
  }, [goto, isFunded, onFunded]);

  return (
    <CardFlex>
      <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} disabled />
      <Title level={3}>
        {`Deposit ${minRequiredBalance} ${currency} on ${chainName}`}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection
        padding="12px 24px"
        bordertop="true"
        borderbottom={isFunded ? 'true' : 'false'}
      >
        <Text className={isFunded ? '' : 'loading-ellipses'}>
          Status: {statusMessage}
        </Text>
      </CardSection>
      {!isFunded && <SetupEoaFundingWaiting chainName={chainName} />}
    </CardFlex>
  );
};

export const SetupEoaFunding = () => {
  const { goto } = useSetup();
  const {
    masterEoaBalance: eoaBalance,
    baseBalance,
    ethereumBalance,
  } = useBalance();
  const [currentChain, setCurrentChain] = useState<MiddlewareChain | null>(
    null,
  );

  const isOptimusFunded = useMemo(() => {
    if (!eoaBalance) return false;
    return (
      eoaBalance.ETH >=
      MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeCreation
    );
  }, [eoaBalance]);

  const isEthereumFunded = useMemo(() => {
    if (!ethereumBalance) return false;

    return (
      ethereumBalance >=
      MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.ETHEREUM].safeCreation
    );
  }, [ethereumBalance]);

  const isBaseFunded = useMemo(() => {
    if (!baseBalance) return false;

    return (
      baseBalance >=
      MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.BASE].safeCreation
    );
  }, [baseBalance]);

  // Set the current chain to the first chain that the user has not funded
  useEffect(() => {
    if (currentChain) return;
    if (!isOptimusFunded) setCurrentChain(MiddlewareChain.OPTIMISM);
    if (!isEthereumFunded) setCurrentChain(MiddlewareChain.ETHEREUM);
    if (!isBaseFunded) setCurrentChain(MiddlewareChain.BASE);
  }, [isOptimusFunded, isEthereumFunded, isBaseFunded, currentChain]);

  // If the user has not funded their account on any chain, show the funding instructions
  const screen = useMemo(() => {
    switch (currentChain) {
      case MiddlewareChain.OPTIMISM:
        return (
          <SetupEoaFundingForChain
            isFunded={isOptimusFunded}
            minRequiredBalance={
              MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeCreation
            }
            currency={CHAINS.OPTIMISM.currency}
            chainName={CHAINS.OPTIMISM.name}
            onFunded={() => setCurrentChain(MiddlewareChain.ETHEREUM)}
          />
        );
      case MiddlewareChain.ETHEREUM:
        return (
          <SetupEoaFundingForChain
            isFunded={isEthereumFunded}
            minRequiredBalance={
              MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.ETHEREUM].safeCreation
            }
            currency={CHAINS.ETHEREUM.currency}
            chainName={CHAINS.ETHEREUM.name}
            onFunded={() => setCurrentChain(MiddlewareChain.BASE)}
          />
        );
      case MiddlewareChain.BASE:
        return (
          <SetupEoaFundingForChain
            isFunded={isBaseFunded}
            minRequiredBalance={
              MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.BASE].safeCreation
            }
            currency={CHAINS.BASE.currency}
            chainName={CHAINS.BASE.name}
            onFunded={() => goto(SetupScreen.SetupCreateSafe)}
          />
        );
      default:
        return null;
    }
  }, [currentChain, isOptimusFunded, isEthereumFunded, isBaseFunded, goto]);

  return screen;
};
