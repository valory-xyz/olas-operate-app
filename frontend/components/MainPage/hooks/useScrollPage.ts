import { useEffect, useRef } from 'react';

import { useServices } from '@/hooks';
import { usePageState } from '@/hooks/usePageState';

export const useScrollPage = () => {
  const { pageState } = usePageState();
  const { selectedServiceConfigId } = useServices();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when page or selected instance is changed
  useEffect(() => {
    contentContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageState, selectedServiceConfigId]);

  return contentContainerRef;
};
