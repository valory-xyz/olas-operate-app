import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { entries, isNil, isNumber } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import {
  BackButton,
  CardFlex,
  cardStyles,
  Divider,
  TokenAmountInput,
} from '@/components/ui';
import { TOKEN_CONFIG, TokenSymbol } from '@/config/tokens';
import { AddressZero, NA, PAGES } from '@/constants';
import { useAvailableAssets, usePageState, useServices } from '@/hooks';
import { TokenAmountDetails, TokenAmounts } from '@/types/Wallet';
import { formatUnitsToNumber } from '@/utils';

import { useAgentWallet } from '../AgentWalletProvider';
import { ConfirmTransfer } from './ConfirmTransfer';

const { Title, Text } = Typography;

const FundAgentTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Fund Agent
    </Title>
    <Text className="text-neutral-tertiary">
      Enter the token amounts you want to send to your AI agent.
    </Text>
  </Flex>
);

const DepositInputInfo = () => (
  <Flex vertical gap={4}>
    <Text className="text-sm">Why it’s different from your Pearl Wallet</Text>
    <Text className="text-sm text-neutral-secondary">
      This number shows only the amount you can use to fund agents.
    </Text>
    <Text className="text-sm text-neutral-secondary">
      The Pearl Wallet balance also includes funds reserved to pay for gas fees.
    </Text>
  </Flex>
);

const PearlWalletToAgentWallet = () => {
  const { agentName, agentImgSrc } = useAgentWallet();
  return (
    <Flex vertical style={{ margin: '0 -32px' }}>
      <Divider className="m-0" />
      <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
        <Text>
          <Text type="secondary">From</Text>{' '}
          <Text className="font-weight-500">Pearl Wallet</Text>
        </Text>
        <ArrowRightOutlined style={{ fontSize: 12 }} />
        <Flex gap={8} align="center">
          <Text type="secondary">To</Text>{' '}
          {agentName && agentImgSrc && (
            <Image src={agentImgSrc} alt={agentName} width={28} height={28} />
          )}
          <Text className="font-weight-500">{agentName || NA}</Text>
        </Flex>
      </Flex>
      <Divider className="m-0" />
    </Flex>
  );
};

const FundPearlWallet = () => {
  const { goto } = usePageState();

  return (
    <Flex justify="space-between" align="center" className="w-full">
      <Text type="danger" className="text-sm">
        Not enough funds on Pearl Wallet balance.
      </Text>
      <Button size="small" onClick={() => goto(PAGES.PearlWallet)}>
        Fund Pearl Wallet
      </Button>
    </Flex>
  );
};

const useFundAgent = () => {
  const { selectedAgentConfig } = useServices();
  const { isLoading: isAvailableAssetsLoading, availableAssets } =
    useAvailableAssets(selectedAgentConfig.evmHomeChainId, {
      includeMasterEoa: false,
    });
  const { fundInitialValues, setFundInitialValues } = useAgentWallet();

  const [amountsToFund, setAmountsToFund] = useState<TokenAmounts>({});

  const onAmountChange = useCallback(
    (symbol: TokenSymbol, details: TokenAmountDetails) => {
      setAmountsToFund((prev) => ({
        ...prev,
        [symbol]: { ...details },
      }));
    },
    [],
  );

  // Prefill inputs with initial values if provided
  useEffect(() => {
    // Convert address-indexed wei amounts into symbol-indexed decimal numbers
    const chainTokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];
    const addressToTokenMeta = Object.entries(chainTokenConfig).reduce(
      (acc, [symbol, config]) => {
        const address = 'address' in config ? config.address : AddressZero;
        const key = (address ?? AddressZero).toLowerCase();
        acc[key] = { symbol: symbol as TokenSymbol, decimals: config.decimals };
        return acc;
      },
      {} as Record<string, { symbol: TokenSymbol; decimals: number }>,
    );

    const initialAmountsToFund: TokenAmounts = {};

    entries(fundInitialValues).forEach(([tokenAddress, amountWei]) => {
      const meta =
        addressToTokenMeta[(tokenAddress || AddressZero).toLowerCase()];
      if (!meta) return;
      const parsed = formatUnitsToNumber(amountWei, meta.decimals, 6);
      initialAmountsToFund[meta.symbol] = {
        ...initialAmountsToFund[meta.symbol],
        amount: parsed,
      };
    });

    setAmountsToFund(initialAmountsToFund);
  }, [fundInitialValues, selectedAgentConfig.evmHomeChainId]);

  // Reset amounts on unmount
  useUnmount(() => {
    setAmountsToFund({});
    setFundInitialValues({});
  });

  return {
    isLoading: isAvailableAssetsLoading,
    availableAssets,
    amountsToFund,
    onAmountChange,
  };
};

export const FundAgent = ({ onBack }: { onBack: () => void }) => {
  const { availableAssets, amountsToFund, onAmountChange } = useFundAgent();

  const canTransfer = useMemo(() => {
    const entries = Object.entries(amountsToFund);

    if (entries.length === 0) return false;

    // Check if all entered amounts are less than or equal to available balance
    return entries.every(([symbol, { amount }]) => {
      const asset = availableAssets.find(
        (asset) => asset.symbol === (symbol as TokenSymbol),
      );
      return isNumber(amount) && asset && amount <= asset.amount;
    });
  }, [amountsToFund, availableAssets]);

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <CardFlex $noBorder $padding="32px" className="w-full">
        <Flex gap={32} vertical>
          <Flex gap={12} vertical>
            <BackButton onPrev={onBack} />
            <FundAgentTitle />
          </Flex>
          <PearlWalletToAgentWallet />

          <Flex justify="space-between" align="center" vertical gap={16}>
            {availableAssets.map(({ amount, symbol }) => {
              const hasError =
                !isNil(amountsToFund?.[symbol]) &&
                (amountsToFund[symbol]?.amount ?? 0) > amount;

              return (
                <Flex key={symbol} gap={8} vertical className="w-full">
                  <TokenAmountInput
                    tokenSymbol={symbol}
                    value={amountsToFund?.[symbol]?.amount ?? 0}
                    totalAmount={amount}
                    onChange={(x) => onAmountChange(symbol, { amount: x ?? 0 })}
                    hasError={hasError}
                    tooltipInfo={<DepositInputInfo />}
                  />
                  {hasError && <FundPearlWallet />}
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </CardFlex>

      <ConfirmTransfer
        canTransfer={canTransfer}
        fundsToTransfer={amountsToFund}
      />
    </Flex>
  );
};
