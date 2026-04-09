'use client';

import { useEffect } from 'react';

export default function LandingScrollBehavior() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverflowX = document.body.style.overflowX;
    const prevBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'visible';
    document.body.style.overflowX = 'hidden';
    document.body.style.height = 'auto';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overflowX = prevBodyOverflowX;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  return null;
}
