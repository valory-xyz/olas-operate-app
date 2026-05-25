import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Skeleton, Typography } from 'antd';
import { ethers } from 'ethers';
import { entries, floor, isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import {
  BackButton,
  CardFlex,
  cardStyles,
  Divider,
  InsufficientSignerGasModal,
  TokenAmountInput,
} from '@/components/ui';
import { TOKEN_CONFIG, TokenSymbol } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { useInsufficientGasModal, useServices } from '@/hooks';
import { WithdrawSafeRequestAmounts } from '@/types';
import { asEvmChainId, parseUnits } from '@/utils';

import { useAgentWallet } from '../AgentWalletProvider';
import { STEPS } from '../types';
import {
  WithdrawalComplete,
  WithdrawalFailed,
  WithdrawalInProgress,
} from '../Withdraw/Withdraw';
import { usePartialWithdraw } from './usePartialWithdraw';
import { useSafeWithdrawableBalance } from './useSafeWithdrawableBalance';

const { Title, Text } = Typography;

const DECIMAL_PLACES = 6;

const PartialWithdrawTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Withdraw from Agent Wallet
    </Title>
    <Text className="text-neutral-tertiary">
      Enter the token amounts you want to withdraw to your Pearl Wallet.
    </Text>
  </Flex>
);

const AgentWalletToPearlWallet = () => {
  const { agentName, agentImgSrc } = useAgentWallet();
  return (
    <Flex vertical style={{ margin: '0 -32px' }}>
      <Divider className="m-0" />
      <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
        <Flex gap={8} align="center">
          <Text type="secondary">From</Text>{' '}
          {agentImgSrc && (
            <Image src={agentImgSrc} alt={agentName} width={28} height={28} />
          )}
          <Text className="font-weight-500">{agentName}</Text>
        </Flex>
        <ArrowRightOutlined style={{ fontSize: 12 }} />
        <Text>
          <Text type="secondary">To</Text>{' '}
          <Text className="font-weight-500">Pearl Wallet</Text>
        </Text>
      </Flex>
      <Divider className="m-0" />
    </Flex>
  );
};

/**
 * Converts the backend's withdrawable-balance response (keyed by middleware
 * chain + token address → wei string) into a list of
 * `{ symbol, decimals, address, withdrawableAmount }` entries suitable for
 * rendering `TokenAmountInput` rows.
 */
const useWithdrawableTokens = () => {
  const { selectedAgentConfig } = useServices();
  const { data, isLoading } = useSafeWithdrawableBalance();

  const tokens = useMemo(() => {
    if (!data) return [];

    const { middlewareHomeChainId } = selectedAgentConfig;
    const chainData = data[middlewareHomeChainId];
    if (!chainData) return [];

    const evmChainId = asEvmChainId(middlewareHomeChainId);
    const chainTokenConfig = TOKEN_CONFIG[evmChainId];

    // Build a lookup: lowercase address → { symbol, decimals, address }
    const addressToMeta = Object.entries(chainTokenConfig).reduce(
      (acc, [symbol, config]) => {
        const address =
          'address' in config && config.address ? config.address : AddressZero;
        acc[address.toLowerCase()] = {
          symbol: symbol as TokenSymbol,
          decimals: config.decimals,
          address,
        };
        return acc;
      },
      {} as Record<
        string,
        { symbol: TokenSymbol; decimals: number; address: string }
      >,
    );

    return entries(chainData.withdrawable_amounts)
      .map(([tokenAddress, weiStr]) => {
        const meta = addressToMeta[tokenAddress.toLowerCase()];
        if (!meta) return null;
        // Use floor (not ceil) so the displayed max never exceeds
        // the actual on-chain withdrawable amount in wei.
        const withdrawableAmount = floor(
          parseFloat(ethers.utils.formatUnits(weiStr, meta.decimals)),
          DECIMAL_PLACES,
        );
        return {
          symbol: meta.symbol,
          decimals: meta.decimals,
          address: meta.address,
          withdrawableAmount,
        };
      })
      .filter(Boolean) as {
      symbol: TokenSymbol;
      decimals: number;
      address: string;
      withdrawableAmount: number;
    }[];
  }, [data, selectedAgentConfig]);

  return { tokens, isLoading };
};

type PartialWithdrawAmounts = Record<TokenSymbol, number>;

type PartialWithdrawScreenProps = { onBack: () => void };

export const PartialWithdrawScreen = ({
  onBack,
}: PartialWithdrawScreenProps) => {
  const { selectedAgentConfig } = useServices();
  const { tokens, isLoading: isBalanceLoading } = useWithdrawableTokens();
  const {
    isLoading: isMutating,
    isError,
    isSuccess,
    error,
    onPartialWithdraw,
    resetMutation,
  } = usePartialWithdraw();
  const { setFundInitialValues, updateStep } = useAgentWallet();

  const [amounts, setAmounts] = useState<PartialWithdrawAmounts>(
    {} as PartialWithdrawAmounts,
  );
  const [isModalVisible, setModalVisible] = useState(false);

  const handleAmountChange = useCallback(
    (symbol: TokenSymbol, value: number | null) => {
      setAmounts((prev) => ({
        ...prev,
        [symbol]: isNil(value) ? 0 : value,
      }));
    },
    [],
  );

  const hasAnyAmount = useMemo(
    () => Object.values(amounts).some((v) => v > 0),
    [amounts],
  );

  const hasOverage = useMemo(
    () =>
      tokens.some((token) => {
        const entered = amounts[token.symbol] ?? 0;
        return entered > token.withdrawableAmount;
      }),
    [tokens, amounts],
  );

  const canWithdraw = hasAnyAmount && !hasOverage;

  const handleWithdraw = useCallback(() => {
    const { middlewareHomeChainId } = selectedAgentConfig;
    const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)];

    // Build the request: { chain: { tokenAddress: weiString } }
    const chainAmounts: Record<string, string> = {};
    for (const token of tokens) {
      const entered = amounts[token.symbol] ?? 0;
      if (entered <= 0) continue;
      const config = chainTokenConfig[token.symbol];
      if (!config) continue;
      const weiStr = parseUnits(
        floor(entered, DECIMAL_PLACES).toString(),
        config.decimals,
      );
      chainAmounts[token.address] = weiStr;
    }

    const requestAmounts: WithdrawSafeRequestAmounts = {
      [middlewareHomeChainId]: chainAmounts,
    };

    setModalVisible(true);
    onPartialWithdraw(requestAmounts);
  }, [selectedAgentConfig, tokens, amounts, onPartialWithdraw]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const gasModalProps = useInsufficientGasModal({
    isError,
    error,
    caseType: 'agent-withdraw',
    onFund: (gasError) => {
      setFundInitialValues({ [AddressZero]: gasError.prefill_amount_wei });
      updateStep(STEPS.FUND_AGENT);
    },
    onClose: closeModal,
    resetMutation,
  });

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <CardFlex $noBorder $padding="32px" className="w-full">
        <Flex gap={32} vertical>
          <Flex gap={12} vertical>
            <BackButton onPrev={onBack} />
            <PartialWithdrawTitle />
          </Flex>
          <AgentWalletToPearlWallet />

          <Flex justify="space-between" align="center" vertical gap={16}>
            {isBalanceLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              tokens.map((token) => {
                const entered = amounts[token.symbol] ?? 0;
                const hasError =
                  entered > 0 && entered > token.withdrawableAmount;

                return (
                  <Flex key={token.symbol} gap={8} vertical className="w-full">
                    <TokenAmountInput
                      tokenSymbol={token.symbol}
                      value={entered}
                      maxAmount={token.withdrawableAmount}
                      totalAmount={token.withdrawableAmount}
                      onChange={(v) => handleAmountChange(token.symbol, v)}
                      hasError={hasError}
                    />
                  </Flex>
                );
              })
            )}
          </Flex>

          <Button
            type="primary"
            block
            size="large"
            disabled={!canWithdraw}
            onClick={handleWithdraw}
          >
            Withdraw
          </Button>
        </Flex>
      </CardFlex>

      {isModalVisible &&
        (gasModalProps ? (
          <InsufficientSignerGasModal {...gasModalProps} />
        ) : (
          <Modal
            onCancel={isMutating ? undefined : closeModal}
            closable={!isMutating}
            centered
            open
            width={436}
            title={null}
            footer={null}
          >
            {isError ? (
              <WithdrawalFailed
                onTryAgain={() => {
                  resetMutation();
                  handleWithdraw();
                }}
              />
            ) : isSuccess ? (
              <WithdrawalComplete />
            ) : (
              <WithdrawalInProgress />
            )}
          </Modal>
        ))}
    </Flex>
  );
};
