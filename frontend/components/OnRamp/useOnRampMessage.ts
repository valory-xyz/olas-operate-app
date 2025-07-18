import { useCallback } from 'react';

import { useMessageApi } from '@/context/MessageProvider';

const messageKey = 'onRampWidgetMessage';

export const useOnRampMessage = () => {
  const message = useMessageApi();

  const orderInProgressMessage = useCallback(() => {
    message.open({
      key: messageKey,
      type: 'info',
      content: 'Order in progress. Please wait...',
    });
  }, [message]);

  const successfulTransactionMessage = useCallback(() => {
    message.open({
      key: messageKey,
      type: 'success',
      content: 'Transaction successful',
    });
  }, [message]);

  const errorTransactionMessage = useCallback(() => {
    message.open({
      key: messageKey,
      type: 'error',
      content: 'Something went wrong with the transaction. Please try again.',
    });
  }, [message]);

  return {
    orderInProgressMessage,
    successfulTransactionMessage,
    errorTransactionMessage,
  };
};
