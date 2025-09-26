import { useMutation } from '@tanstack/react-query';
import { Button, Flex, Modal, Typography } from 'antd';
import { isEmpty, values } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { ServiceConfigId } from '@/client';
import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { CardFlex } from '@/components/ui/CardFlex';
import { TOKEN_CONFIG } from '@/config/tokens';
import {
  AddressZero,
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  SUPPORT_URL,
  SupportedMiddlewareChain,
  UNICODE_SYMBOLS,
} from '@/constants';
import { useService, useServices } from '@/hooks';
import { Address } from '@/types/Address';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

const { Title, Text, Link } = Typography;

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
        Funds transferred to the Pearl wallet.
      </Text>
    </Flex>

    <Button onClick={onClose} type="primary" block size="large">
      Close
    </Button>
  </Flex>
);

type TransferFailedProps = { onTryAgain: () => void };
const TransferFailed = ({ onTryAgain }: TransferFailedProps) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <WarningOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Failed
      </Title>
      <Text className="text-neutral-tertiary">
        Something went wrong with your transfer. Please try again or contact the
        Olas community.
      </Text>
    </Flex>

    <Flex gap={16} vertical className="text-center">
      <Button onClick={onTryAgain} type="primary" block size="large">
        Try Again
      </Button>
      <Link href={SUPPORT_URL} target="_blank" rel="noreferrer">
        Join Olas Community Discord Server {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Link>
    </Flex>
  </Flex>
);

type TokenAmountMap = {
  [address: Address]: string; // amount (in wei/units)
};

type ChainFunds = Partial<{
  [chain in SupportedMiddlewareChain]: {
    [safeAddress: Address]: TokenAmountMap;
  };
}>;

/**
 * Fund an agent by sending funds to its service safe.
 */
const fundAgent = async ({
  funds,
  serviceConfigId,
}: {
  funds: ChainFunds;
  serviceConfigId: ServiceConfigId;
}): Promise<{ error: string | null }> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/fund`, {
      method: 'POST',
      body: JSON.stringify(funds),
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    }).then((response) => {
      if (response.ok) {
        resolve(response.json());
      } else {
        reject('Failed to fund agent');
      }
    }),
  );

const useConfirmTransfer = () => {
  const { selectedService } = useServices();
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (funds: ChainFunds) => {
      if (!selectedService) throw new Error('No service selected');

      const serviceConfigId = selectedService.service_config_id;
      await fundAgent({ funds, serviceConfigId });
    },
  });

  const onFundAgent = useCallback(
    async (fundsToPass: ChainFunds) => {
      try {
        await mutateAsync(fundsToPass);
      } catch (error) {
        console.error(error);
      }
    },
    [mutateAsync],
  );

  return { onFundAgent, isLoading: isPending, isSuccess, isError };
};

type ConfirmTransferProps = {
  fundsToTransfer: Record<string, number>;
};

export const ConfirmTransfer = ({ fundsToTransfer }: ConfirmTransferProps) => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceSafes } = useService(selectedService?.service_config_id);
  const { onFundAgent, isLoading, isSuccess, isError } = useConfirmTransfer();

  const [isTransferStateModalVisible, setIsTransferStateModalVisible] =
    useState(false);

  const { middlewareHomeChainId, evmHomeChainId } = selectedAgentConfig;
  const serviceSafe = useMemo(
    () => serviceSafes?.find(({ evmChainId }) => evmChainId === evmHomeChainId),
    [serviceSafes, evmHomeChainId],
  );

  const onConfirmTransfer = useCallback(() => {
    if (!serviceSafe) {
      throw new Error('Service Safe is not available'); // Agent safe
    }

    const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareHomeChainId)];
    const fundsObj: TokenAmountMap = {};

    Object.entries(fundsToTransfer).forEach(([symbol, amount]) => {
      if (amount > 0) {
        const { address: tokenAddress, decimals } = chainTokenConfig[symbol];
        fundsObj[tokenAddress ?? AddressZero] = parseUnits(amount, decimals);
      }
    });

    const fundsTo: ChainFunds = {
      [middlewareHomeChainId]: {
        [serviceSafe.address]: fundsObj,
      },
    };

    setIsTransferStateModalVisible(true);
    onFundAgent(fundsTo);
  }, [onFundAgent, fundsToTransfer, middlewareHomeChainId, serviceSafe]);

  const handleCancel = useCallback(
    () => setIsTransferStateModalVisible(false),
    [],
  );

  const canConfirmTransfer = useMemo(() => {
    if (isEmpty(fundsToTransfer)) return false;
    return !values(fundsToTransfer).every((x) => x === 0);
  }, [fundsToTransfer]);

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Button
        disabled={!canConfirmTransfer || isLoading || isSuccess}
        onClick={onConfirmTransfer}
        type="primary"
        className="w-full"
        size="large"
      >
        Confirm Transfer
      </Button>

      {isTransferStateModalVisible && (
        <Modal
          onCancel={isLoading ? undefined : handleCancel}
          closable={!isLoading}
          open
          width={436}
          title={null}
          footer={null}
        >
          {isError ? (
            <TransferFailed onTryAgain={onConfirmTransfer} />
          ) : isSuccess ? (
            <TransferComplete onClose={handleCancel} />
          ) : (
            <TransferInProgress />
          )}
        </Modal>
      )}
    </CardFlex>
  );
};
