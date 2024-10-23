import { CloseOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  ConfigProvider,
  Flex,
  ThemeConfig,
  Typography,
} from 'antd';
import { useMemo } from 'react';

import { AddressLink } from '@/components/AddressLink';
import { CardTitle } from '@/components/Card/CardTitle';
import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { CardFlex } from '@/components/styled/CardFlex';
import { Pages } from '@/enums/PageState';
import { useBalance } from '@/hooks/useBalance';
import { usePageState } from '@/hooks/usePageState';
import { useWallet } from '@/hooks/useWallet';
import { balanceFormat } from '@/utils/numberFormatters';

import { Container, infoBreakdownParentStyle } from './styles';
import { SignerTitle } from './Titles';
import { YourAgentWallet } from './YourAgent';

const { Text } = Typography;

const yourWalletTheme: ThemeConfig = {
  components: {
    Card: { paddingLG: 16 },
  },
};

const YourWalletTitle = () => <CardTitle title="Your wallet" />;

const Address = () => {
  const { masterSafeAddress } = useWallet();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: 'Address',
            leftClassName: 'text-light',
            right: <AddressLink address={masterSafeAddress} />,
            rightClassName: 'font-normal',
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
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
  const { safeBalance } = useBalance();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: <Text strong>XDAI</Text>,
            leftClassName: 'text-light',
            right: `${balanceFormat(safeBalance?.ETH, 2)} XDAI`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const Signer = () => {
  const { masterEoaAddress } = useWallet();
  const { eoaBalance } = useBalance();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: (
              <SignerTitle
                signerText="Your wallet signer address:"
                signerAddress={masterEoaAddress}
              />
            ),
            leftClassName: 'text-light',
            right: `${balanceFormat(eoaBalance?.ETH, 2)} XDAI`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

export const YourWallet = () => {
  const { goto } = usePageState();

  return (
    <ConfigProvider theme={yourWalletTheme}>
      <CardFlex
        bordered={false}
        title={<YourWalletTitle />}
        extra={
          <Button
            size="large"
            icon={<CloseOutlined />}
            onClick={() => goto(Pages.Main)}
          />
        }
      >
        <Card>
          <Container>
            <Address />
            <OlasBalance />
            <XdaiBalance />
            <Signer />
            <YourAgentWallet />
          </Container>
        </Card>
      </CardFlex>
    </ConfigProvider>
  );
};
