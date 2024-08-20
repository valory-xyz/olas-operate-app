import { useContext } from 'react';

import { StoreContext } from '@/context/electron/StoreProvider';

export const useStore = () => useContext(StoreContext);
