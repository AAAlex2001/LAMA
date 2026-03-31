'use client';

import { useEffect } from 'react';

export default function LandingScrollBehavior() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverflowX = document.body.style.overflowX;

    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overflowX = prevBodyOverflowX;
    };
  }, []);

  return null;
}
