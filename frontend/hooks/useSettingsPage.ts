import { useContext } from 'react';

import { SettingsPageContext } from '@/context/SettingsPageProvider';

export const useSettingsPage = () => useContext(SettingsPageContext);
