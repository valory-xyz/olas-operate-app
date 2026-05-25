import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Skeleton, Typography } from 'antd';
import { ethers } from 'ethers';
import { floor, isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

import { WarningOutlined } from '@/components/custom-icons';
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
import {
  useAvailableAgentAssets,
  useInsufficientGasModal,
  useServices,
} from '@/hooks';
import { Address, WithdrawSafeRequestAmounts } from '@/types';
import { asEvmChainDetails, asEvmChainId, parseUnits } from '@/utils';

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
      Enter the token amounts you want to withdraw from the agent to your Pearl
      Wallet.
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

type WithdrawableToken = {
  symbol: TokenSymbol;
  decimals: number;
  /** Lower-cased token address used to key into the API response. Native = AddressZero. */
  address: string;
  withdrawableAmount: number;
  isNative: boolean;
};

/**
 * Joins the front-end "Available Assets" ordering (from `useAvailableAgentAssets`)
 * with the backend's per-token withdrawable amounts. The returned list is in
 * the same order as the main-screen Available Assets table; tokens absent from
 * the API response are shown with `withdrawableAmount = 0`.
 */
const useWithdrawableTokens = () => {
  const { selectedAgentConfig } = useServices();
  const { availableAssets } = useAvailableAgentAssets();
  const { data, isLoading, isError, refetch } = useSafeWithdrawableBalance();

  const { middlewareHomeChainId } = selectedAgentConfig;
  const nativeSymbol = asEvmChainDetails(middlewareHomeChainId).symbol;
  const chainData = data?.[middlewareHomeChainId];

  const tokens = useMemo<WithdrawableToken[]>(() => {
    if (!chainData) return [];

    const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)];

    // Lowercased lookup: token address (or AddressZero for native) → wei string
    const weiByAddress: Record<string, string> = {};
    for (const [addr, wei] of Object.entries(chainData.withdrawable_amounts)) {
      weiByAddress[addr.toLowerCase()] = wei;
    }

    return availableAssets.flatMap<WithdrawableToken>((asset) => {
      const config = chainTokenConfig[asset.symbol];
      if (!config) return [];

      const isNative = !asset.address;
      const lookupAddress = (asset.address ?? AddressZero).toLowerCase();
      const wei = weiByAddress[lookupAddress];
      // Floor (not ceil) so the displayed max never exceeds the actual
      // on-chain withdrawable amount in wei.
      const withdrawableAmount = wei
        ? floor(
            parseFloat(ethers.utils.formatUnits(wei, config.decimals)),
            DECIMAL_PLACES,
          )
        : 0;

      return [
        {
          symbol: asset.symbol,
          decimals: config.decimals,
          address: lookupAddress,
          withdrawableAmount,
          isNative,
        },
      ];
    });
  }, [availableAssets, chainData, middlewareHomeChainId]);

  const gasReserveDisplay = useMemo(() => {
    if (!chainData?.gas_reserve) return null;
    const nativeConfig =
      TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)][nativeSymbol];
    if (!nativeConfig) return null;
    return floor(
      parseFloat(
        ethers.utils.formatUnits(chainData.gas_reserve, nativeConfig.decimals),
      ),
      DECIMAL_PLACES,
    );
  }, [chainData, middlewareHomeChainId, nativeSymbol]);

  return {
    tokens,
    gasReserveDisplay,
    nativeSymbol,
    isLoading,
    isError,
    refetch,
  };
};

type WithdrawableBalanceErrorProps = {
  onRetry: () => void;
  onBack: () => void;
};
const WithdrawableBalanceError = ({
  onRetry,
  onBack,
}: WithdrawableBalanceErrorProps) => (
  <Flex gap={16} vertical align="center" className="w-full text-center">
    <WarningOutlined />
    <Flex gap={8} vertical>
      <Text className="font-weight-500">
        Couldn&apos;t load withdrawable balance
      </Text>
      <Text className="text-neutral-tertiary">
        Please check your connection and try again.
      </Text>
    </Flex>
    <Flex gap={8} className="w-full" vertical>
      <Button type="primary" block size="large" onClick={onRetry}>
        Retry
      </Button>
      <Button block size="large" onClick={onBack}>
        Back
      </Button>
    </Flex>
  </Flex>
);

type PartialWithdrawAmounts = Record<TokenSymbol, number>;

type PartialWithdrawScreenProps = { onBack: () => void };

export const PartialWithdrawScreen = ({
  onBack,
}: PartialWithdrawScreenProps) => {
  const { selectedAgentConfig } = useServices();
  const {
    tokens,
    gasReserveDisplay,
    nativeSymbol,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance,
  } = useWithdrawableTokens();
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

  const canWithdraw =
    !isBalanceLoading && !isBalanceError && hasAnyAmount && !hasOverage;

  const handleWithdraw = useCallback(() => {
    const { middlewareHomeChainId } = selectedAgentConfig;
    const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)];

    // Build the request: { chain: { tokenAddress: weiString } } — omit zeros.
    const chainAmounts: Record<Address, string> = {};
    for (const token of tokens) {
      const entered = amounts[token.symbol] ?? 0;
      if (entered <= 0) continue;
      const config = chainTokenConfig[token.symbol];
      if (!config) continue;
      const weiStr = parseUnits(
        floor(entered, DECIMAL_PLACES).toString(),
        config.decimals,
      );
      chainAmounts[token.address as Address] = weiStr;
    }

    const requestAmounts: WithdrawSafeRequestAmounts = {
      [middlewareHomeChainId]: chainAmounts,
    };

    setModalVisible(true);
    onPartialWithdraw(requestAmounts);
  }, [selectedAgentConfig, tokens, amounts, onPartialWithdraw]);

  // Closing the modal must reset the mutation so a subsequent attempt
  // starts from a clean isLoading/isError/isSuccess state — without this,
  // stale error state leaks into the next render of the modal.
  const closeModal = useCallback(() => {
    setModalVisible(false);
    resetMutation();
  }, [resetMutation]);

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

  const gasReserveTooltip =
    gasReserveDisplay !== null ? (
      <Text className="text-sm">
        A {gasReserveDisplay} {nativeSymbol} gas reserve keeps your agent
        running. It&apos;s released when you decommission your agent.
      </Text>
    ) : null;

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <CardFlex $noBorder $padding="32px" className="w-full">
        <Flex gap={32} vertical>
          <Flex gap={12} vertical>
            <BackButton onPrev={onBack} />
            <PartialWithdrawTitle />
          </Flex>
          <AgentWalletToPearlWallet />

          {isBalanceError ? (
            <WithdrawableBalanceError
              onRetry={() => refetchBalance()}
              onBack={onBack}
            />
          ) : (
            <Flex justify="space-between" align="center" vertical gap={16}>
              {isBalanceLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                tokens.map((token) => {
                  const entered = amounts[token.symbol] ?? 0;
                  const hasError =
                    entered > 0 && entered > token.withdrawableAmount;

                  return (
                    <Flex
                      key={token.symbol}
                      gap={8}
                      vertical
                      className="w-full"
                    >
                      <TokenAmountInput
                        tokenSymbol={token.symbol}
                        value={entered}
                        maxAmount={token.withdrawableAmount}
                        totalAmount={token.withdrawableAmount}
                        onChange={(v) => handleAmountChange(token.symbol, v)}
                        hasError={hasError}
                        showQuickSelects
                        tooltipInfo={
                          token.isNative ? gasReserveTooltip : undefined
                        }
                      />
                    </Flex>
                  );
                })
              )}
            </Flex>
          )}

          {!isBalanceError && (
            <Button
              type="primary"
              block
              size="large"
              disabled={!canWithdraw}
              onClick={handleWithdraw}
            >
              Withdraw
            </Button>
          )}
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
