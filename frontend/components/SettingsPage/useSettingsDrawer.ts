import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { SettingsService } from '@/service/Settings';

export const useSettingsDrawer = () => {
  return useQuery({
    queryKey: [REACT_QUERY_KEYS.SETTING_DRAWER_QUERY_KEY],
    queryFn: ({ signal }) => SettingsService.getSettings(signal),
    staleTime: Infinity,
    retry: 3,
  });
};
