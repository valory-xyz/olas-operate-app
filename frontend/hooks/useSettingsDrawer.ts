import { useQuery } from '@tanstack/react-query';

import { SettingsService } from '@/service/Settings';

export const useSettingsDrawer = () => {
  return useQuery({
    queryKey: ['settings-drawer'],
    queryFn: ({ signal }) => SettingsService.getSettings(signal),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
