import { useContext } from 'react';

import { MasterSafeContext } from '@/context/main/MasterSafeProvider';

export const useMasterSafe = () => {
  return useContext(MasterSafeContext);
};
