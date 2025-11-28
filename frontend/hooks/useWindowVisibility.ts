import { useEffect, useState } from 'react';

export type WindowState = 'focused' | 'visible' | 'hidden';

export const useWindowVisibility = (): WindowState => {
  const [state, setState] = useState<WindowState>('focused');

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState('hidden');
      } else {
        // If visible, check if focused
        setState(document.hasFocus() ? 'focused' : 'visible');
      }
    };

    const handleFocus = () => {
      setState('focused');
    };

    const handleBlur = () => {
      // When blurred, it might still be visible (e.g. clicking on another window on same screen)
      // or it might be hidden. document.hidden is the source of truth for hidden.
      if (!document.hidden) {
        setState('visible');
      }
    };

    // Initial check
    handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return state;
};
