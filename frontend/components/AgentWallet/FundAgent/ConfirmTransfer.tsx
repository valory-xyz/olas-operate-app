import { useMutation } from '@tanstack/react-query';
import { Button, Flex, Modal, Typography } from 'antd';
import { isEmpty, set, values } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { InsufficientSignerGasModal } from '@/components/ui';
import { CardFlex } from '@/components/ui/CardFlex';
import { TOKEN_CONFIG, TokenSymbol } from '@/config/tokens';
import { AddressZero, MiddlewareChain, PAGES } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import {
  useAgentFundingRequests,
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  useInsufficientGasModal,
  usePageState,
  useService,
  useServices,
} from '@/hooks';
import {
  type ChainFunds,
  FundService,
  type TokenAmountMap,
} from '@/service/Fund';
import { Address, Maybe, TokenAmounts, TokenBalanceRecord } from '@/types';
import { bigintMin } from '@/utils';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

import { useAgentWallet } from '../AgentWalletProvider';

const { Title, Text } = Typography;

const TransferInProgress = () => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <LoadingOutlined />
    </Flex>
    <Flex gap={12} vertical align="center" className="text-center">
      <Title level={4} className="m-0">
        Transfer in Progress
      </Title>
      <Text className="text-neutral-tertiary">
        It usually takes 1-2 minutes.
      </Text>
    </Flex>
  </Flex>
);

const TransferComplete = ({ onClose }: { onClose: () => void }) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <SuccessOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Complete!
      </Title>
      <Text className="text-neutral-tertiary">
        Funds transferred to the Agent wallet.
      </Text>
    </Flex>

    <Button onClick={onClose} type="primary" block size="large">
      Close
    </Button>
  </Flex>
);

const TransferFailed = ({ onTryAgain }: { onTryAgain: () => void }) => {
  const { toggleSupportModal } = useSupportModal();

  const openSupportModal = () => {
    toggleSupportModal();
  };

  return (
    <Flex gap={32} vertical>
      <Flex align="center" justify="center">
        <WarningOutlined />
      </Flex>

      <Flex gap={12} vertical className="text-center">
        <Title level={4} className="m-0">
          Transfer Failed
        </Title>
        <Text className="text-neutral-tertiary">
          Something went wrong with your transfer. Please try again or contact
          Valory support.
        </Text>
      </Flex>

      <Flex gap={16} vertical className="text-center">
        <Button onClick={onTryAgain} type="primary" block size="large">
          Try Again
        </Button>
        <Button onClick={openSupportModal} type="default" block size="large">
          Contact Support
        </Button>
      </Flex>
    </Flex>
  );
};

const useConfirmTransfer = () => {
  const { selectedService } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const { updateBalances } = useBalanceContext();
  const { setFundEntrySource } = useAgentWallet();
  const { isPending, isSuccess, isError, error, mutateAsync, reset } =
    useMutation<void, unknown, ChainFunds>({
      mutationFn: async (funds: ChainFunds) => {
        if (!selectedService) throw new Error('No service selected');

        const serviceConfigId = selectedService.service_config_id;
        await FundService.fundAgent({ funds, serviceConfigId });
      },
      onSuccess: () => {
        // Gas-error entry has been satisfied; future entries (e.g. via
        // AgentLowBalanceAlert) should use the default EOA-vs-Safe split.
        setFundEntrySource('normal');
        // Refetch funding requirements and wallet balances because balances are changed
        refetch();
        updateBalances();
      },
    });

  const onFundAgent = useCallback(
    async (fundsToPass: ChainFunds) => {
      try {
        await mutateAsync(fundsToPass);
      } catch (caughtError) {
        console.error(caughtError);
      }
    },
    [mutateAsync],
  );

  return {
    onFundAgent,
    isLoading: isPending,
    isSuccess,
    isError,
    error,
    resetMutation: reset,
  };
};

type ConfirmTransferProps = {
  canTransfer?: boolean;
  fundsToTransfer: TokenAmounts;
  onSuccess?: () => void;
};

/**
 * Prepares ChainFunds for a funding request.
 *
 * Converts user-entered amounts into keyed by token address amounts, allocating funds
 * to the service EOA first to cover its requirements, and sending any remainder to safe.
 *
 * When `forceEoaOnly` is true, native gas (AddressZero) bypasses the EOA-vs-Safe split
 * and routes 100% to the EOA — used when the user entered this flow from an
 * INSUFFICIENT_SIGNER_GAS modal where the EOA is the wallet that needs funding.
 * ERC20 amounts still follow the regular split.
 */
export const prepareAgentFundsForTransfer = ({
  fundsToTransfer,
  middlewareHomeChainId,
  serviceSafe,
  serviceEoa,
  eoaTokenRequirements,
  forceEoaOnly = false,
}: {
  fundsToTransfer: TokenAmounts;
  middlewareHomeChainId: MiddlewareChain;
  serviceSafe: { address: Address };
  serviceEoa: { address: Address };
  eoaTokenRequirements: Maybe<TokenBalanceRecord>;
  forceEoaOnly?: boolean;
}): ChainFunds => {
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)];
  const tokenAmountsByAddress: TokenAmountMap = {};

  Object.entries(fundsToTransfer).forEach(([untypedSymbol, { amount }]) => {
    const symbol = untypedSymbol as TokenSymbol;
    if (amount > 0 && chainTokenConfig[symbol]) {
      const tokenConfig = chainTokenConfig[symbol];
      if (!tokenConfig) return;

      const { address: tokenAddress, decimals } = tokenConfig;
      tokenAmountsByAddress[tokenAddress ?? AddressZero] = parseUnits(
        amount,
        decimals,
      );
    }
  });

  // Build agent funds fulfilling EOA requirements first, send remainder to Safe
  const eoaAddress = serviceEoa.address;
  const agentFunds: Record<Address, TokenAmountMap> = {};

  Object.entries(tokenAmountsByAddress).forEach(([tokenAddress, amount]) => {
    const amountBigInt = BigInt(amount);

    // Gas-error entry: route all native gas to the EOA regardless of the
    // polled eoaTokenRequirements (which may report 0 if the EOA is fine
    // for "normal operation" but not for the specific failed transaction).
    if (forceEoaOnly && tokenAddress === AddressZero) {
      set(agentFunds, `${eoaAddress}.${tokenAddress}`, amountBigInt.toString());
      return;
    }

    const requiredForEoa = BigInt(
      (eoaTokenRequirements?.[tokenAddress as Address] as string) || '0',
    );
    const allocateToEoa = bigintMin(amountBigInt, requiredForEoa);

    if (allocateToEoa > 0n) {
      set(
        agentFunds,
        `${eoaAddress}.${tokenAddress}`,
        allocateToEoa.toString(),
      );
    }

    const remaining = amountBigInt - allocateToEoa;
    if (remaining > 0n) {
      const safeAddress = serviceSafe.address;
      set(agentFunds, [safeAddress, tokenAddress], remaining.toString());
    }
  });

  const fundsTo: ChainFunds = {
    [middlewareHomeChainId]: agentFunds,
  };

  return fundsTo;
};

export const ConfirmTransfer = ({
  canTransfer,
  fundsToTransfer,
  onSuccess,
}: ConfirmTransferProps) => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceSafes, serviceEoa } = useService(
    selectedService?.service_config_id,
  );
  const { onFundAgent, isLoading, isSuccess, isError, error, resetMutation } =
    useConfirmTransfer();
  const { eoaTokenRequirements } = useAgentFundingRequests();
  const { fundEntrySource } = useAgentWallet();
  const { goto } = usePageState();

  const [isTransferStateModalVisible, setIsTransferStateModalVisible] =
    useState(false);

  const { middlewareHomeChainId, evmHomeChainId } = selectedAgentConfig;
  const serviceSafe = useMemo(
    () => serviceSafes?.find(({ evmChainId }) => evmChainId === evmHomeChainId),
    [serviceSafes, evmHomeChainId],
  );

  const handleConfirmTransfer = useCallback(() => {
    if (!serviceSafe || !serviceEoa) {
      throw new Error('Agents wallets are not available.');
    }

    const fundsTo = prepareAgentFundsForTransfer({
      fundsToTransfer,
      middlewareHomeChainId,
      serviceSafe,
      serviceEoa,
      eoaTokenRequirements,
      forceEoaOnly: fundEntrySource === 'gas-error',
    });

    setIsTransferStateModalVisible(true);
    onFundAgent(fundsTo);
  }, [
    onFundAgent,
    fundsToTransfer,
    middlewareHomeChainId,
    serviceSafe,
    serviceEoa,
    eoaTokenRequirements,
    fundEntrySource,
  ]);

  const handleClose = useCallback(() => {
    setIsTransferStateModalVisible(false);
    if (isSuccess) onSuccess?.();
  }, [isSuccess, onSuccess]);

  // Separate dismiss handler for the gas modal: closes the host modal but
  // never invokes onSuccess (gas-error and isSuccess are mutually exclusive
  // today, but coupling them via `handleClose` is a future-bug trap).
  const dismissGasErrorModal = useCallback(
    () => setIsTransferStateModalVisible(false),
    [],
  );

  const gasModalProps = useInsufficientGasModal({
    isError,
    error,
    caseType: 'fund-agent',
    onFund: (gasError) => {
      goto(PAGES.FundPearlWallet, {
        prefillAmountWei: gasError.prefill_amount_wei,
      });
    },
    onClose: dismissGasErrorModal,
    resetMutation,
  });

  const canConfirmTransfer = useMemo(() => {
    if (!serviceSafe) return false;
    if (isEmpty(fundsToTransfer)) return false;

    // Check if all amounts are zero
    if (values(fundsToTransfer).every((x) => x.amount === 0)) return false;

    return canTransfer;
  }, [fundsToTransfer, serviceSafe, canTransfer]);

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Button
        disabled={!canConfirmTransfer || isLoading}
        onClick={handleConfirmTransfer}
        type="primary"
        className="w-full"
        size="large"
      >
        Confirm Transfer
      </Button>

      {isTransferStateModalVisible &&
        (gasModalProps ? (
          <InsufficientSignerGasModal {...gasModalProps} />
        ) : (
          <Modal
            onCancel={isLoading ? undefined : handleClose}
            closable={!isLoading}
            centered
            open
            width={436}
            title={null}
            footer={null}
          >
            {isError ? (
              <TransferFailed onTryAgain={handleConfirmTransfer} />
            ) : isSuccess ? (
              <TransferComplete onClose={handleClose} />
            ) : (
              <TransferInProgress />
            )}
          </Modal>
        ))}
    </CardFlex>
  );
};
