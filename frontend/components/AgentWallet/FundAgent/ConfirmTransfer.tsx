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

type FundsObj = {
  [address: Address]: string;
};

type FundsTo = {
  [chain in SupportedMiddlewareChain]: {
    [address: Address]: FundsObj;
  };
};

/**
 * Withdraws the balance of a service
 *
 * @param withdrawAddress Address
 * @param serviceTemplate ServiceTemplate
 * @returns Promise<Service>
 */
const fundAgent = async ({
  funds,
  serviceConfigId,
}: {
  funds: FundsTo;
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
        reject('Failed to withdraw balance');
      }
    }),
  );

const useConfirmTransfer = () => {
  const { selectedService } = useServices();
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (funds: FundsTo) => {
      if (!selectedService) {
        throw new Error('No service selected');
      }

      await fundAgent({
        funds,
        serviceConfigId: selectedService.service_config_id,
      });
    },
  });

  const onFundAgent = useCallback(
    async (fundsToPass: FundsTo) => {
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

  const middlewareChain = selectedAgentConfig.middlewareHomeChainId;

  // agent safe
  const serviceSafe = useMemo(
    () =>
      serviceSafes?.find(
        ({ evmChainId }) => evmChainId === selectedAgentConfig.evmHomeChainId,
      ),
    [serviceSafes, selectedAgentConfig.evmHomeChainId],
  );

  const onConfirmTransfer = useCallback(() => {
    if (!serviceSafe) {
      throw new Error('Service Safe is not available');
    }

    const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(middlewareChain)];

    const fundsObj: FundsObj = {};
    Object.entries(fundsToTransfer).forEach(([symbol, amount]) => {
      if (amount > 0) {
        const { address: tokenAddress, decimals } = chainTokenConfig[symbol];

        const address = tokenAddress ?? AddressZero;
        fundsObj[address] = parseUnits(amount, decimals);
      }
    });

    const fundsTo: FundsTo = {
      [middlewareChain]: {
        [serviceSafe.address]: fundsObj,
      },
    };

    console.log({ fundsTo });

    // onFundAgent(fundsTo as FundsTo);
    // setIsTransferStateModalVisible(true);
  }, [onFundAgent, fundsToTransfer, middlewareChain, serviceSafe]);

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Button
        disabled={
          isEmpty(fundsToTransfer) ||
          values(fundsToTransfer).every((x) => x === 0)
        }
        onClick={onConfirmTransfer}
        type="primary"
        className="w-full"
        size="large"
      >
        Confirm Transfer
      </Button>

      {isTransferStateModalVisible && (
        <Modal
          onCancel={
            isLoading ? undefined : () => setIsTransferStateModalVisible(false)
          }
          closable={!isLoading}
          open
          width={436}
          title={null}
          footer={null}
        >
          {/* TODO */}
          {isError ? (
            <TransferFailed onTryAgain={() => {}} />
          ) : isSuccess ? (
            <TransferComplete onClose={() => {}} />
          ) : (
            <TransferInProgress />
          )}
        </Modal>
      )}
    </CardFlex>
  );
};
