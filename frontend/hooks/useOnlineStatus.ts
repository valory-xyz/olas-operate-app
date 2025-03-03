import { useContext } from 'react';

import { OnlineStatusContext } from '@/context/OnlineStatusProvider';

export const useOnlineStatusContext = () => useContext(OnlineStatusContext);
