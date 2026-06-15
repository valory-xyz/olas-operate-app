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
 * Converts user-entered amounts into amounts keyed by token address, then splits
 * each token between the service EOA and Safe by their respective requirements:
 *
 * - The EOA is funded up to its requirement (`eoaTokenRequirements`).
 * - For native gas (AddressZero): the Safe receives only up to its own
 *   requirement (`safeTokenRequirements`); any excess goes to the EOA. Only the
 *   signer EOA spends native gas, so stranding excess native in the Safe leaves
 *   the signer under-funded (re-triggering the low-balance alert) and surfaces
 *   the gas as a portfolio asset.
 * - For ERC20: the remainder beyond the EOA requirement goes to the Safe, the
 *   agent's operating/investment wallet.
 *
 * When `forceEoaOnly` is true, native gas bypasses the Safe entirely and routes
 * 100% to the EOA — used when the user entered this flow from an
 * INSUFFICIENT_SIGNER_GAS modal where the EOA is the wallet that needs funding.
 */
export const prepareAgentFundsForTransfer = ({
  fundsToTransfer,
  middlewareHomeChainId,
  serviceSafe,
  serviceEoa,
  eoaTokenRequirements,
  safeTokenRequirements,
  forceEoaOnly = false,
}: {
  fundsToTransfer: TokenAmounts;
  middlewareHomeChainId: MiddlewareChain;
  serviceSafe: { address: Address };
  serviceEoa: { address: Address };
  eoaTokenRequirements: Maybe<TokenBalanceRecord>;
  safeTokenRequirements: Maybe<TokenBalanceRecord>;
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

  const eoaAddress = serviceEoa.address;
  const safeAddress = serviceSafe.address;
  const agentFunds: Record<Address, TokenAmountMap> = {};

  Object.entries(tokenAmountsByAddress).forEach(
    ([untypedTokenAddress, amount]) => {
      const tokenAddress = untypedTokenAddress as Address;
      const amountBigInt = BigInt(amount);
      const isNative = tokenAddress === AddressZero;

      // 1. Fund the EOA up to its own requirement.
      const requiredForEoa = BigInt(
        (eoaTokenRequirements?.[tokenAddress] as string) || '0',
      );
      const allocateToEoa = bigintMin(amountBigInt, requiredForEoa);
      const afterEoa = amountBigInt - allocateToEoa;

      // 2. Distribute the remainder.
      let toEoa = allocateToEoa;
      let toSafe = 0n;

      if (isNative) {
        // The Safe receives native only up to its own requirement; the signer
        // EOA spends all gas, so any excess native belongs there. A gas-error
        // entry (forceEoaOnly) keeps 100% of native on the EOA.
        const safeNativeTarget = forceEoaOnly
          ? 0n
          : BigInt((safeTokenRequirements?.[tokenAddress] as string) || '0');
        toSafe = bigintMin(afterEoa, safeNativeTarget);
        toEoa += afterEoa - toSafe; // native excess → signer EOA
      } else {
        // ERC20 remainder (requirement + any excess) goes to the Safe.
        toSafe = afterEoa;
      }

      if (toEoa > 0n) {
        set(agentFunds, [eoaAddress, tokenAddress], toEoa.toString());
      }
      if (toSafe > 0n) {
        set(agentFunds, [safeAddress, tokenAddress], toSafe.toString());
      }
    },
  );

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
  const { eoaTokenRequirements, safeTokenRequirements } =
    useAgentFundingRequests();
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
      safeTokenRequirements,
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
    safeTokenRequirements,
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
