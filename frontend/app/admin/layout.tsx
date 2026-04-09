'use client';

import { useEffect } from 'react';
import './admin-layout.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('admin-page');
    return () => {
      document.documentElement.classList.remove('admin-page');
    };
  }, []);

  return <>{children}</>;
}
