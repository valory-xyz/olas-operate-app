import { Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { MiddlewareChain } from '@/client';
import { ONE_MINUTE_INTERVAL } from '@/constants/intervals';
import { EXPLORER_URL } from '@/constants/urls';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { getLatestTransaction } from '@/service/Ethers';
import { TransactionInfo } from '@/types/TransactionInfo';
import { Optional } from '@/types/Util';
import { getTimeAgo } from '@/utils/time';

const { Text } = Typography;

const Loader = styled(Skeleton.Input)`
  line-height: 1;
  span {
    width: 120px !important;
    height: 12px !important;
    margin-top: 6px !important;
  }
`;

type LastTransactionProps = { serviceConfigId: Optional<string> };

/**
 * Displays the last transaction time and link to the transaction on explorer
 * by agent safe.
 */
export const LastTransaction = ({ serviceConfigId }: LastTransactionProps) => {
  const { isPageLoadedAndOneMinutePassed } = usePageState();
  const { activeStakingProgramMeta } = useStakingProgram();
  const { service } = useService({ serviceConfigId });
  const multisigAddress =
    service?.chain_configs[service?.home_chain_id].chain_data.multisig;
  const chainId = activeStakingProgramMeta?.chainId;

  const [isFetching, setIsFetching] = useState(true);
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!multisigAddress) return;
    if (!chainId) return;

    getLatestTransaction(multisigAddress, chainId)
      .then((tx) => setTransaction(tx))
      .catch((error) =>
        console.error('Failed to get latest transaction', error),
      )
      .finally(() => setIsFetching(false));
  }, [multisigAddress, chainId]);

  // Poll for the latest transaction
  useInterval(() => fetchTransaction(), ONE_MINUTE_INTERVAL);

  // Fetch the latest transaction on mount
  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // Do not show the last transaction if the delay is not reached
  if (!isPageLoadedAndOneMinutePassed) return null;

  if (isFetching) {
    return <Loader active size="small" />;
  }

  if (!transaction) {
    return (
      <Text type="secondary" className="text-xs">
        No transactions recently!
      </Text>
    );
  }

  return (
    <Text type="secondary" className="text-xs">
      Last txn:&nbsp;
      <Text
        type="secondary"
        className="text-xs pointer hover-underline"
        onClick={() =>
          window.open(
            `${EXPLORER_URL[MiddlewareChain.OPTIMISM]}/tx/${transaction.hash}`,
          )
        }
      >
        {getTimeAgo(transaction.timestamp)} ↗
      </Text>
    </Text>
  );
};
