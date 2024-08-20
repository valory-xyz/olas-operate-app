import { useContext } from 'react';

import { ElectronApiContext } from '@/context/electron/ElectronApiProvider';

export const useElectronApi = () => useContext(ElectronApiContext);
