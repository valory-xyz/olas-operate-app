import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Skeleton, Typography } from 'antd';
import { ethers } from 'ethers';
import { floor, isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
        },
      ];
    });
  }, [availableAssets, chainData, middlewareHomeChainId]);

  return {
    tokens,
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

  // No overage check: <TokenAmountInput max={withdrawableAmount}> clamps
  // user input via antd's NumberInput, so amounts[symbol] can never exceed
  // withdrawableAmount. The Withdraw button only needs the positive-amount
  // and not-busy guards.
  const canWithdraw =
    !isBalanceLoading && !isBalanceError && !isMutating && hasAnyAmount;

  // After a successful withdrawal the on-chain balance drops; if we keep the
  // user's old entries in state the form would re-render with red over-budget
  // errors against the freshly-refetched withdrawable amounts. Clear them so
  // the user lands back on a clean form when they dismiss the success modal.
  useEffect(() => {
    if (isSuccess) setAmounts({} as PartialWithdrawAmounts);
  }, [isSuccess]);

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
      // Floor to the lower of DECIMAL_PLACES (display precision) and the
      // token's own decimals — ethers.parseUnits throws if the fractional
      // part has more digits than the token supports (e.g. USDC has 6).
      const flooredEntered = floor(
        entered,
        Math.min(DECIMAL_PLACES, config.decimals),
      );
      const weiStr = parseUnits(flooredEntered.toString(), config.decimals);
      chainAmounts[token.address as Address] = weiStr;
    }

    const requestAmounts: WithdrawSafeRequestAmounts = {
      [middlewareHomeChainId]: chainAmounts,
    };

    setModalVisible(true);
    onPartialWithdraw(requestAmounts);
  }, [selectedAgentConfig, tokens, amounts, onPartialWithdraw]);

  // Minimal close handler — matches the Withdraw.tsx / ConfirmTransfer.tsx
  // sibling convention. The mutation reset is wired through
  // `useInsufficientGasModal`'s `resetMutation` arg below (for the gas
  // modal's dismiss path) and through `Try Again`'s explicit call (for
  // the generic failure path). A re-trigger via the Withdraw button
  // calls `mutateAsync`, which synchronously transitions the mutation
  // back to `pending` — no stale `isError` visible.
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
                        showQuickSelects
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
