import { Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { ONE_MINUTE_INTERVAL } from '@/constants/intervals';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useService } from '@/hooks/useService';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { getLatestTransaction } from '@/service/Ethers';
import { TransactionInfo } from '@/types/TransactionInfo';
import { Optional } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { getTimeAgo } from '@/utils/time';

const { Text } = Typography;

const Loader = styled(Skeleton.Input)`
  line-height: 1;
  span {
    height: 12px !important;
    margin-top: 2px !important;
  }
`;

type LastTransactionProps = { serviceConfigId: Optional<string> };

/**
 * Displays the last transaction time and link to the transaction on explorer
 * by agent safe.
 */
export const LastTransaction = ({ serviceConfigId }: LastTransactionProps) => {
  const { activeStakingProgramMeta } = useStakingProgram();
  const { serviceSafes } = useService(serviceConfigId);

  const serviceSafe = serviceSafes?.[0];

  const chainId = activeStakingProgramMeta?.chainId;

  const [isFetching, setIsFetching] = useState(true);
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!serviceSafe?.address) return;
    if (!chainId) return;

    getLatestTransaction(serviceSafe.address, chainId)
      .then((tx) => setTransaction(tx))
      .catch((error) =>
        console.error('Failed to get latest transaction', error),
      )
      .finally(() => setIsFetching(false));
  }, [serviceSafe, chainId]);

  // Poll for the latest transaction
  useInterval(() => fetchTransaction(), ONE_MINUTE_INTERVAL);

  // Fetch the latest transaction on mount
  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  if (isFetching) {
    return <Loader active size="small" />;
  }

  if (!transaction) {
    return (
      <Text type="secondary" className="text-xs">
        No txs recently!
      </Text>
    );
  }

  return (
    <Text type="secondary" className="text-xs">
      Last tx:&nbsp;
      <Text
        ellipsis
        type="secondary"
        className="text-xs pointer hover-underline"
        style={{ maxWidth: 74 }}
        onClick={() =>
          window.open(
            `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(chainId)]}/tx/${transaction.hash}`,
          )
        }
      >
        {getTimeAgo(transaction.timestamp)}
      </Text>
      &nbsp;{UNICODE_SYMBOLS.EXTERNAL_LINK}
    </Text>
  );
};
