import { Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useInterval } from 'usehooks-ts';

import { useAddress } from '@/hooks/useAddress';
import { getLatestTransaction } from '@/service/Ethers';
import { TransactionInfo } from '@/types/TransactionInfo';
import { getTimeAgo } from '@/utils/time';

const { Text } = Typography;

const POLLING_INTERVAL = 60 * 1000; // 1 minute

/**
 * Displays the last transaction time and link to the transaction on GnosisScan
 * by agent safe.
 */
export const LastTransaction = () => {
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

  if (isFetching) return null;

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
