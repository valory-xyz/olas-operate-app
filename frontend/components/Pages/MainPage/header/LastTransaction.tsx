import { Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { useAddress } from '@/hooks/useAddress';
import { usePageState } from '@/hooks/usePageState';
import { getLatestTransaction } from '@/service/Ethers';
import { TransactionInfo } from '@/types/TransactionInfo';
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

const POLLING_INTERVAL = 60 * 1000; // 1 minute

/**
 * Displays the last transaction time and link to the transaction on GnosisScan
 * by agent safe.
 */
export const LastTransaction = () => {
  const { isPageLoadedAndOneMinutePassed } = usePageState();
  const { multisigAddress } = useAddress();

  const [isFetching, setIsFetching] = useState(true);
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!multisigAddress) return;

    getLatestTransaction(multisigAddress)
      .then((tx) => setTransaction(tx))
      .catch((error) =>
        console.error('Failed to get latest transaction', error),
      )
      .finally(() => setIsFetching(false));
  }, [multisigAddress]);

  // Poll for the latest transaction
  useInterval(() => fetchTransaction(), POLLING_INTERVAL);

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
          window.open(`https://gnosisscan.io/tx/${transaction.hash}`)
        }
      >
        {getTimeAgo(transaction.timestamp)} ↗
      </Text>
    </Text>
  );
};
