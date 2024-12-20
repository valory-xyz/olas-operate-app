import { CloseOutlined } from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Flex,
  Skeleton,
  ThemeConfig,
  Typography,
} from 'antd';
import { capitalize, isNil } from 'lodash';
import { useMemo } from 'react';

import { AddressLink } from '@/components/AddressLink';
import { CardTitle } from '@/components/Card/CardTitle';
import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { CardFlex } from '@/components/styled/CardFlex';
import { getNativeTokenSymbol } from '@/config/tokens';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { type Address } from '@/types/Address';
import { Optional } from '@/types/Util';
import { balanceFormat } from '@/utils/numberFormatters';

import { FeatureNotEnabled } from '../FeatureNotEnabled';
import { Container, infoBreakdownParentStyle } from './styles';
import { SignerTitle } from './Titles';
import { useYourWallet } from './useYourWallet';
import { YourAgentWallet } from './YourAgent';

const { Text } = Typography;

const yourWalletTheme: ThemeConfig = {
  components: {
    Card: { paddingLG: 16 },
  },
};

const Address = () => {
  const { isMasterSafeLoading, masterSafeAddress, middlewareChain } =
    useYourWallet();

  if (isMasterSafeLoading) return <Skeleton />;

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: 'Address',
            leftClassName: 'text-light',
            right: masterSafeAddress && (
              <AddressLink
                address={masterSafeAddress}
                middlewareChain={middlewareChain}
              />
            ),
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
  const { middlewareChain, evmHomeChainId } = useYourWallet();

  const masterSafeOlasBalance = masterWalletBalances
    ?.filter(
      ({ symbol, evmChainId }) =>
        symbol === TokenSymbol.OLAS && evmChainId === evmHomeChainId,
    )
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
      <Text strong>
        {TokenSymbol.OLAS} ({capitalize(middlewareChain)})
      </Text>
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
  const { evmHomeChainId, masterSafeAddress, middlewareChain } =
    useYourWallet();
  const { masterSafeBalances } = useMasterBalances();

  const nativeTokenSymbol = getNativeTokenSymbol(evmHomeChainId);

  const masterSafeNativeBalance: Optional<number> = useMemo(() => {
    if (isNil(masterSafeAddress)) return;
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances
      .filter(({ walletAddress, evmChainId, isNative }) => {
        return (
          evmChainId === evmHomeChainId && // TODO: address multi chain, need to refactor as per product requirement
          isNative &&
          walletAddress === masterSafeAddress
        );
      })
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [masterSafeBalances, masterSafeAddress, evmHomeChainId]);

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: (
              <Text strong>
                {nativeTokenSymbol} ({capitalize(middlewareChain)})
              </Text>
            ),
            leftClassName: 'text-light',
            right: `${balanceFormat(masterSafeNativeBalance, 2)} ${nativeTokenSymbol}`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const MasterSafeErc20Balances = () => {
  const { evmHomeChainId, masterSafeAddress, middlewareChain } =
    useYourWallet();
  const { masterSafeBalances } = useMasterBalances();

  const masterSafeErc20Balances = useMemo(() => {
    if (isNil(masterSafeAddress)) return;
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances
      .filter(({ walletAddress, evmChainId, symbol, isNative }) => {
        return (
          evmChainId === evmHomeChainId && // TODO: address multi chain, need to refactor as per product requirement
          !isNative &&
          symbol !== TokenSymbol.OLAS &&
          walletAddress === masterSafeAddress
        );
      })
      .reduce<{ [tokenSymbol: string]: number }>((acc, { balance, symbol }) => {
        if (!acc[symbol]) acc[symbol] = 0;
        acc[symbol] += balance;

        return acc;
      }, {});
  }, [masterSafeBalances, masterSafeAddress, evmHomeChainId]);

  if (!masterSafeErc20Balances) return null;

  return (
    <Flex vertical gap={8}>
      {Object.entries(masterSafeErc20Balances).map(([symbol, balance]) => (
        <InfoBreakdownList
          key={symbol}
          list={[
            {
              left: (
                <Text strong>
                  {symbol} ({capitalize(middlewareChain)})
                </Text>
              ),
              leftClassName: 'text-light',
              right: `${balanceFormat(balance, 2)} ${symbol}`,
            },
          ]}
          parentStyle={infoBreakdownParentStyle}
        />
      ))}
    </Flex>
  );
};

const MasterEoaSignerNativeBalance = () => {
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const { evmHomeChainId, middlewareChain } = useYourWallet();

  const nativeTokenSymbol = getNativeTokenSymbol(evmHomeChainId);

  const masterEoaBalance: Optional<number> = useMemo(() => {
    if (isNil(masterEoa)) return;
    if (isNil(masterWalletBalances)) return;

    return masterWalletBalances
      .filter(
        ({ walletAddress, isNative, evmChainId }) =>
          walletAddress === masterEoa.address &&
          isNative &&
          evmHomeChainId === evmChainId, // TODO: address multi chain, need to refactor as per product requirement
      )
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [masterEoa, masterWalletBalances, evmHomeChainId]);

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: masterEoa?.address && middlewareChain && (
              <SignerTitle
                signerText="Your wallet signer address:"
                signerAddress={masterEoa?.address}
                middlewareChain={middlewareChain}
              />
            ),
            leftClassName: 'text-light',
            right: `${balanceFormat(masterEoaBalance, 3)} ${nativeTokenSymbol}`,
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

export const YourWalletPage = () => {
  const isBalanceBreakdownEnabled = useFeatureFlag('manage-wallet');
  const { selectedService } = useServices();
  const { goto } = usePageState();

  return (
    <ConfigProvider theme={yourWalletTheme}>
      <CardFlex
        bordered={false}
        title={<CardTitle title="Your wallets" />}
        extra={
          <Button
            size="large"
            icon={<CloseOutlined />}
            onClick={() => goto(Pages.Main)}
          />
        }
      >
        {isBalanceBreakdownEnabled ? (
          <Container style={{ margin: 8 }}>
            <Address />
            <OlasBalance />
            <MasterSafeNativeBalance />
            <MasterSafeErc20Balances />
            <MasterEoaSignerNativeBalance />
            {selectedService && <YourAgentWallet />}
          </Container>
        ) : (
          <FeatureNotEnabled />
        )}
      </CardFlex>
    </ConfigProvider>
  );
};
