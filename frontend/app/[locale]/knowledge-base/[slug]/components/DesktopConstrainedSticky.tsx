'use client';

import { useEffect, useRef } from 'react';
import styles from './DesktopConstrainedSticky.module.scss';

type Props = {
  top: number;
  disableWhenTooTall?: boolean;
  children: React.ReactNode;
};

export default function DesktopConstrainedSticky({ top, disableWhenTooTall = false, children }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner) return;

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
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const innerHeight = inner.offsetHeight;
      const shellTop = window.scrollY + shellRect.top;
      const shellWidth = shellRect.width;
      const boundaryRect = boundary.getBoundingClientRect();
      const boundaryTop = window.scrollY + boundaryRect.top;
      const boundaryBottom = boundaryTop + boundary.offsetHeight;
      const effectiveHeight = innerHeight;

      shell.style.height = `${effectiveHeight}px`;

      if (window.scrollY + top <= shellTop) {
        inner.style.position = 'static';
        inner.style.top = '';
        inner.style.left = '';
        inner.style.width = '';
        return;
      }

      if (window.scrollY + top + effectiveHeight >= boundaryBottom) {
        inner.style.position = 'absolute';
        inner.style.top = `${Math.max(0, boundaryBottom - shellTop - effectiveHeight)}px`;
        inner.style.left = '0';
        inner.style.width = `${shellWidth}px`;
        return;
      }

      inner.style.position = 'fixed';
      inner.style.top = `${top}px`;
      inner.style.left = `${shellRect.left}px`;
      inner.style.width = `${shellWidth}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [disableWhenTooTall, top]);

  return (
    <div ref={shellRef} className={styles.shell}>
      <div ref={innerRef} className={styles.inner}>
        {children}
      </div>
    </div>
  );
}