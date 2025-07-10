import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import React, { createContext, FC, ReactNode, useContext } from 'react';

const MessageContext = createContext<MessageInstance | null>(null);

type MessageProviderProps = {
  children: ReactNode;
};

export const MessageProvider: FC<MessageProviderProps> = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <MessageContext.Provider value={messageApi}>
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
};

export const useMessageApi = (): MessageInstance => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageApi must be used within a MessageProvider');
  }
  return context;
};
