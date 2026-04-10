'use client';

import { useEffect, useRef } from 'react';
import { useScrollContainer } from '@/components/app-layout/app-layout';
import styles from './DesktopConstrainedSticky.module.scss';

type Props = {
  top: number;
  disableWhenTooTall?: boolean;
  children: React.ReactNode;
};

export default function DesktopConstrainedSticky({ top, disableWhenTooTall = false, children }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainer = useScrollContainer();

  useEffect(() => {
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;

    const getScrollTop = () => {
      if (scrollContainer) {
        return scrollContainer.scrollTop;
      }

      return window.scrollY || window.pageYOffset || 0;
    };

    const updatePosition = () => {
      const boundary =
        (shell.closest('[data-sticky-boundary="article"]') as HTMLElement | null) ||
        shell.parentElement;
      if (!boundary) return;

      if (window.innerWidth < 1440) {
        shell.style.height = '';
        inner.style.position = '';
        inner.style.top = '';
        inner.style.left = '';
        inner.style.width = '';
        inner.style.zIndex = '';
        return;
      }

      const scrollTop = getScrollTop();
      const shellRect = shell.getBoundingClientRect();
      const innerHeight = inner.offsetHeight;
      const shellWidth = shellRect.width;
      const boundaryRect = boundary.getBoundingClientRect();
      const effectiveHeight = innerHeight;
      const viewportTop = scrollContainer ? scrollContainer.getBoundingClientRect().top : 0;
      const shellTop = scrollContainer
        ? scrollTop + (shellRect.top - viewportTop)
        : scrollTop + shellRect.top;
      const boundaryTop = scrollContainer
        ? scrollTop + (boundaryRect.top - viewportTop)
        : scrollTop + boundaryRect.top;
      const boundaryBottom = boundaryTop + boundary.offsetHeight;
      const fixedTop = scrollContainer ? viewportTop + top : top;

      shell.style.height = `${effectiveHeight}px`;

      if (scrollTop + top <= shellTop) {
        inner.style.position = 'static';
        inner.style.top = '';
        inner.style.left = '';
        inner.style.width = '';
        inner.style.zIndex = '';
        return;
      }

      if (scrollTop + top + effectiveHeight >= boundaryBottom) {
        inner.style.position = 'absolute';
        inner.style.top = `${Math.max(0, boundaryBottom - shellTop - effectiveHeight)}px`;
        inner.style.left = '0';
        inner.style.width = `${shellWidth}px`;
        inner.style.zIndex = '100';
        return;
      }

      inner.style.position = 'fixed';
      inner.style.top = `${fixedTop}px`;
      inner.style.left = `${shellRect.left}px`;
      inner.style.width = `${shellWidth}px`;
      inner.style.zIndex = '100';
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition, { passive: true });
    } else {
      window.addEventListener('scroll', updatePosition, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePosition);
      } else {
        window.removeEventListener('scroll', updatePosition);
      }
    };
  }, [disableWhenTooTall, scrollContainer, top]);

  return (
    <div ref={shellRef} className={styles.shell}>
      <div ref={innerRef} className={styles.inner}>
        {children}
      </div>
    </div>
  );
}