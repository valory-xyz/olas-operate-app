import { createContext, PropsWithChildren, useState } from 'react';

import { SettingsScreen } from '@/enums/SettingsScreen';

export const SettingsPageContext = createContext<{
  screen: SettingsScreen;
  goto: (screen: SettingsScreen) => void;
}>({
  screen: SettingsScreen.Main,
  goto: () => {},
});

export const SettingsPageProvider = ({ children }: PropsWithChildren) => {
  const [screen, setScreen] = useState<SettingsScreen>(SettingsScreen.Main);

  const goto = (screen: SettingsScreen) => setScreen(screen);

  return (
    <SettingsPageContext.Provider value={{ screen, goto }}>
      {children}
    </SettingsPageContext.Provider>
  );
};
