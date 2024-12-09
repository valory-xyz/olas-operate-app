import { CloseOutlined } from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Flex,
  Skeleton,
  ThemeConfig,
  Typography,
} from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { AddressLink } from '@/components/AddressLink';
import { CardTitle } from '@/components/Card/CardTitle';
import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { CardFlex } from '@/components/styled/CardFlex';
import { getNativeTokenSymbol } from '@/config/tokens';
import { EvmChainId } from '@/enums/Chain';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { type Address } from '@/types/Address';
import { Optional } from '@/types/Util';
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

const YourWalletTitle = () => <CardTitle title="Your wallets" />;

const Address = () => {
  const { masterSafes } = useMasterWalletContext();

  if (!masterSafes) return <Skeleton />;
  if (isEmpty(masterSafes)) return null;

  const masterSafeAddress = masterSafes[0].address; // TODO: handle multiple safes in future

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
  const { totalStakedOlasBalance } = useBalanceContext();
  const { masterWalletBalances } = useMasterBalances();

  const masterSafeOlasBalance = masterWalletBalances
    ?.filter((walletBalance) => walletBalance.symbol === TokenSymbol.OLAS)
    .reduce((acc, balance) => acc + balance.balance, 0);

  const olasBalances = useMemo(() => {
    return [
      {
        title: 'Available',
        value: balanceFormat(masterSafeOlasBalance ?? 0, 2),
      },
      {
        title: 'Staked',
        value: balanceFormat(totalStakedOlasBalance ?? 0, 2),
      },
    ];
  }, [masterSafeOlasBalance, totalStakedOlasBalance]);

  if (isNil(masterSafeOlasBalance)) return <Skeleton />;

  return (
    <Flex vertical gap={8}>
      <Text strong>{TokenSymbol.OLAS}</Text>
      <InfoBreakdownList
        list={olasBalances.map((item) => ({
          left: item.title,
          leftClassName: 'text-light',
          right: `${item.value} ${TokenSymbol.OLAS}`,
        }))}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const MasterSafeNativeBalance = () => {
  const { selectedAgentConfig } = useServices();
  const { masterSafes } = useMasterWalletContext();
  const { masterSafeBalances } = useMasterBalances();

  const selectedMasterSafe = useMemo(() => {
    if (!masterSafes) return;
    if (!selectedAgentConfig) return;

    return masterSafes.find(
      (masterSafe) =>
        masterSafe.evmChainId === selectedAgentConfig.evmHomeChainId,
    );
  }, [masterSafes, selectedAgentConfig]);

  const selectedMasterSafeNativeBalance: Optional<number> = useMemo(() => {
    if (isNil(selectedMasterSafe)) return;
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances
      .filter(({ walletAddress, evmChainId, isNative }) => {
        return (
          evmChainId === selectedAgentConfig?.evmHomeChainId && // TODO: address multi chain, need to refactor as per product requirement
          isNative &&
          walletAddress === selectedMasterSafe.address
        );
      })
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [
    masterSafeBalances,
    selectedAgentConfig?.evmHomeChainId,
    selectedMasterSafe,
  ]);

  const nativeTokenSymbol = getNativeTokenSymbol(EvmChainId.Gnosis);

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: <Text strong>{getNativeTokenSymbol(EvmChainId.Gnosis)}</Text>,
            leftClassName: 'text-light',
            right: `${balanceFormat(selectedMasterSafeNativeBalance, 2)} ${nativeTokenSymbol}`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const MasterEoaSignerNativeBalance = () => {
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const { selectedAgentConfig } = useServices();

  const masterEoaBalance: Optional<number> = useMemo(() => {
    if (isNil(masterEoa)) return;
    if (isNil(masterWalletBalances)) return;

    return masterWalletBalances
      .filter(
        ({ walletAddress, isNative, evmChainId }) =>
          walletAddress === masterEoa.address &&
          isNative &&
          selectedAgentConfig?.evmHomeChainId === evmChainId, // TODO: address multi chain, need to refactor as per product requirement
      )
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [masterEoa, masterWalletBalances, selectedAgentConfig?.evmHomeChainId]);

  const nativeTokenSymbol = useMemo(
    () => getNativeTokenSymbol(EvmChainId.Gnosis), // TODO: support multi chain
    [],
  );

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: (
              <SignerTitle
                signerText="Your wallet signer address:"
                signerAddress={masterEoa?.address}
              />
            ),
            leftClassName: 'text-light',
            right: `${balanceFormat(masterEoaBalance, 2)} ${nativeTokenSymbol}`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

export const YourWalletPage = () => {
  const { goto } = usePageState();

  const { services } = useServices();

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
        <Container style={{ margin: 8 }}>
          <Address />
          <OlasBalance />
          <MasterSafeNativeBalance />
          <MasterEoaSignerNativeBalance />
          {services?.map(({ service_config_id }) => (
            // TODO: bit dirty, but should be fine for now
            <YourAgentWallet
              key={service_config_id}
              serviceConfigId={service_config_id}
            />
          ))}
        </Container>
      </CardFlex>
    </ConfigProvider>
  );
};
