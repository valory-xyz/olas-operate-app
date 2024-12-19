import { CopyOutlined } from '@ant-design/icons';
import { Col, Flex, message, Row, Spin, Tooltip, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { isEmpty, isNil } from 'lodash';
import { Fragment, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_EVM_CHAIN_ID } from '@/constants/urls';
import { WalletBalanceResult } from '@/context/BalanceProvider';
import { EvmChainId, EvmChainName } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { WalletType } from '@/enums/Wallet';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

const { Text, Title } = Typography;

const Card = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};
`;

const ICON_STYLE = { color: '#606F85' };

const getBalanceData = (walletBalances: WalletBalanceResult[]) => {
  const result: { [chainId: number]: { [tokenSymbol: string]: number } } = {};

  for (const walletBalanceResult of walletBalances) {
    const { evmChainId: chainId, symbol } = walletBalanceResult;
    if (!result[chainId]) result[chainId] = {};
    if (!result[chainId][symbol]) result[chainId][symbol] = 0;
    result[chainId][symbol] += walletBalanceResult.balance;
  }

  return { balance: result };
};

type DebugItemProps = {
  item: {
    title: string;
    balance: Record<number | EvmChainId, Record<string | TokenSymbol, number>>;
    address: Address;
    link?: { title: string; href: string };
  };
};

const DebugItem = ({ item }: DebugItemProps) => {
  const truncatedAddress = truncateAddress(item.address);

  const onCopyToClipboard = useCallback(
    () =>
      copyToClipboard(item.address).then(() =>
        message.success('Address copied!'),
      ),
    [item.address],
  );

  const balances = Object.entries(item.balance);

  return (
    <Card>
      <Title level={5} className="m-0 mb-8 text-base">
        {item.title}
      </Title>
      {balances.map(([chainId, balance]) => {
        const evmChainId = +chainId as keyof typeof EvmChainName;
        return (
          <Fragment key={chainId}>
            {balances.length > 1 && (
              <Row>
                <Text className="font-weight-600 mb-4">
                  {EvmChainName[evmChainId]}:
                </Text>
              </Row>
            )}
            <Row className={balances.length > 1 ? 'mb-16' : undefined}>
              <Col span={12}>
                <Flex vertical gap={4} align="flex-start">
                  <Text type="secondary" className="text-sm">
                    Balance{' '}
                  </Text>
                  <Flex vertical gap={4}>
                    {Object.entries(balance).map(([tokenSymbol, balance]) => {
                      return (
                        <Flex key={tokenSymbol} gap={12}>
                          <Text>{balanceFormat(balance, 2)}</Text>
                          <Text type="secondary">{tokenSymbol}</Text>
                        </Flex>
                      );
                    })}
                  </Flex>
                </Flex>
              </Col>

              <Col span={12}>
                <Flex vertical gap={4} align="flex-start">
                  <Text type="secondary" className="text-sm">
                    Address
                  </Text>
                  <Flex gap={12}>
                    <a
                      target="_blank"
                      href={`${EXPLORER_URL_BY_EVM_CHAIN_ID[evmChainId]}/address/${item.address}`}
                    >
                      {truncatedAddress}
                    </a>
                    <Tooltip title="Copy to clipboard">
                      <CopyOutlined
                        style={ICON_STYLE}
                        onClick={onCopyToClipboard}
                      />
                    </Tooltip>
                  </Flex>
                </Flex>
              </Col>
            </Row>
          </Fragment>
        );
      })}
      {item.link ? (
        <Row className="mt-8">
          <a target="_blank" href={item.link.href}>
            {item.link.title} {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        </Row>
      ) : null}
    </Card>
  );
};

export const DebugAddresses = () => {
  const { masterEoa, masterSafes } = useMasterWalletContext();
  const { serviceWallets: serviceAddresses, selectedAgentConfig } =
    useServices();
  const { walletBalances } = useBalanceContext();
  const { masterEoaBalances, masterSafeBalances } = useMasterBalances();

  const data = useMemo(() => {
    if (isNil(masterEoa)) return null;
    if (isNil(masterSafes) || isEmpty(masterSafes)) return null;
    if (isNil(walletBalances) || isEmpty(walletBalances)) return null;

    const result: {
      title: string;
      balance: Record<
        number | EvmChainId,
        Record<string | TokenSymbol, number>
      >;
      address: Address;
      link?: { title: string; href: string };
    }[] = [];

    if (!isNil(masterEoaBalances)) {
      result.push({
        title: 'Master EOA',
        ...getBalanceData(masterEoaBalances),
        address: masterEoa.address,
      });
    }

    const masterSafe = masterSafes.find(
      (item) => item.evmChainId === selectedAgentConfig.evmHomeChainId,
    );

    if (!isNil(masterSafeBalances) && !isNil(masterSafe)) {
      result.push({
        title: 'Master Safe',
        ...getBalanceData(masterSafeBalances),
        address: masterSafe.address,
      });
    }

    if (!isNil(serviceAddresses)) {
      serviceAddresses?.forEach((serviceWallet) => {
        if (!isAddress(serviceWallet.address)) return;

        if (serviceWallet.type === WalletType.EOA) {
          result.push({
            title: 'Agent Instance EOA',
            ...getBalanceData(
              walletBalances.filter(
                (balance) => balance.walletAddress === serviceWallet.address,
              ),
            ),
            address: serviceWallet.address,
          });
        }

        if (serviceWallet.type === WalletType.Safe) {
          result.push({
            title: 'Agent Safe',
            ...getBalanceData(
              walletBalances.filter(
                (walletBalance) =>
                  walletBalance.walletAddress === serviceWallet.address &&
                  walletBalance.evmChainId === serviceWallet.evmChainId,
              ),
            ),
            address: serviceWallet.address,
          });
        }
      });
    }

    return result;
  }, [
    masterEoa,
    masterEoaBalances,
    masterSafeBalances,
    masterSafes,
    selectedAgentConfig.evmHomeChainId,
    serviceAddresses,
    walletBalances,
  ]);

  return data ? (
    data.map((item) => <DebugItem key={item.address} item={item} />)
  ) : (
    <Flex justify="center" align="center" flex="auto">
      <Spin size="large" />
    </Flex>
  );
};
