import { useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';

/**
 * Provides an onScroll handler that hides/shows the bottom nav
 * based on scroll direction. Attach to any scrollable container.
 */
export function useScrollNav() {
  const setNavVisible = useStore(s => s.setNavVisible);
  const lastY = useRef(0);
  const threshold = 8;

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const y = el.scrollTop;
    const delta = y - lastY.current;

    if (Math.abs(delta) > threshold) {
      if (delta > 0 && y > 60) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
    }
    lastY.current = y;
  }, [setNavVisible]);

  return { onScroll };
}
