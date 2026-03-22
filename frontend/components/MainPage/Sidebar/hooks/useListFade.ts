import { useCallback, useEffect, useRef, useState } from 'react';

export const useListFade = () => {
  const [fade, setFade] = useState({ top: false, bottom: false });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const updateFade = useCallback(() => {
    const node = scrollAreaRef.current;
    if (!node) return;

    const { scrollTop, scrollHeight, clientHeight } = node;
    setFade({
      top: scrollTop > 0,
      bottom: scrollTop + clientHeight < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    const node = scrollAreaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(updateFade);
    observer.observe(node);
    node.addEventListener('scroll', updateFade);

    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', updateFade);
    };
  }, [updateFade]);

  return { fade, ref: scrollAreaRef };
};
