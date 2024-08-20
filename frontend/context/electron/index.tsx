import { PropsWithChildren } from 'react';

import { ElectronApiProvider } from './ElectronApiProvider';
import { StoreProvider } from './StoreProvider';

export const ElectronProvider = ({ children }: PropsWithChildren) => {
  return (
    <ElectronApiProvider>
      <StoreProvider>{children}</StoreProvider>
    </ElectronApiProvider>
  );
};
