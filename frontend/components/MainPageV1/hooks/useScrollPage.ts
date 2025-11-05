import { useEffect, useRef } from 'react';

import { useServices } from '@/hooks';
import { usePageState } from '@/hooks/usePageState';

export const useScrollPage = () => {
  const { pageState } = usePageState();
  const { selectedAgentType } = useServices();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when page or selected agent is changed
  useEffect(() => {
    contentContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageState, selectedAgentType]);

  return contentContainerRef;
};
