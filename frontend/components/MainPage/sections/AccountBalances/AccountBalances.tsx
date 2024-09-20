import { WalletOutlined } from '@ant-design/icons';
import { Card, Flex, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AddressLink } from '@/components/AddressLink';
import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { CustomModal } from '@/components/styled/CustomModal';
import { COLOR } from '@/constants/colors';
import { MODAL_WIDTH } from '@/constants/width';
import { useBalance } from '@/hooks/useBalance';
import { useWallet } from '@/hooks/useWallet';
import { balanceFormat } from '@/utils/numberFormatters';

import { Container, infoBreakdownParentStyle } from './styles';
import { SignerTitle } from './Titles';
import { YourAgentWallet } from './YourAgent';

const { Title, Text } = Typography;

const MainCard = styled(Card)`
  > .ant-card-body {
    padding: 16px;
  }
`;

const YourWalletDetails = () => {
  const { masterSafeAddress } = useWallet();

  return (
    <Flex vertical gap={12}>
      <WalletOutlined style={{ fontSize: 24, color: COLOR.TEXT_LIGHT }} />
      <Flex justify="space-between" align="center" className="w-full">
        <Title level={5} className="m-0">
          Your wallet
        </Title>
        <AddressLink address={masterSafeAddress} />
      </Flex>
    </Flex>
  );
};

const OlasBalance = () => {
  const { safeBalance, totalOlasStakedBalance } = useBalance();
  const olasBalances = useMemo(() => {
    return [
      {
        title: 'Available',
        value: balanceFormat(safeBalance?.OLAS ?? 0, 2),
      },
      {
        title: 'Staked',
        value: balanceFormat(totalOlasStakedBalance ?? 0, 2),
      },
    ];
  }, [safeBalance?.OLAS, totalOlasStakedBalance]);

  return (
    <Flex vertical gap={8}>
      <Text strong>OLAS</Text>
      <InfoBreakdownList
        list={olasBalances.map((item) => ({
          left: item.title,
          leftClassName: 'text-light',
          right: `${item.value} OLAS`,
        }))}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const XdaiBalance = () => {
  const { safeBalance, eoaBalance } = useBalance();
  const totalXdaiBalance = useMemo(
    () => (safeBalance?.ETH ?? 0) + (eoaBalance?.ETH ?? 0),
    [safeBalance?.ETH, eoaBalance?.ETH],
  );

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: <Text strong>XDAI</Text>,
            leftClassName: 'text-light',
            right: `${balanceFormat(totalXdaiBalance, 2)} XDAI`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const Signer = () => {
  const { masterEoaAddress } = useWallet();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: <SignerTitle />,
            leftClassName: 'text-light',
            right: <AddressLink address={masterEoaAddress} />,
            rightClassName: 'font-normal',
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

type AccountBalanceDetailsProps = {
  hideAccountBalanceDetailsModal: () => void;
};

export const AccountBalances = ({
  hideAccountBalanceDetailsModal,
}: AccountBalanceDetailsProps) => {
  return (
    <CustomModal
      title="Account balances"
      open
      width={MODAL_WIDTH}
      bodyPadding
      onCancel={hideAccountBalanceDetailsModal}
      footer={null}
    >
      <MainCard className="main-card">
        <Container>
          <YourWalletDetails />
          <OlasBalance />
          <XdaiBalance />
          <Signer />
          <YourAgentWallet />
        </Container>
      </MainCard>
    </CustomModal>
  );
};
