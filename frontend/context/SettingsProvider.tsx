import { createContext, PropsWithChildren, useState } from 'react';

import { SettingsScreen, SettingsScreenMap } from '@/constants/screen';

export const SettingsContext = createContext<{
  screen: SettingsScreen;
  goto: (screen: SettingsScreen) => void;
}>({
  screen: SettingsScreenMap.Main,
  goto: () => {},
});

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [screen, setScreen] = useState<SettingsScreen>(SettingsScreenMap.Main);

  const goto = (screen: SettingsScreen) => setScreen(screen);

  return (
    <SettingsContext.Provider value={{ screen, goto }}>
      {children}
    </SettingsContext.Provider>
  );
};
