'use client';

import type { ReactNode } from 'react';
import styles from './app-layout.module.scss';
import AppHeader from './app-header';
import AppSidebar from './app-sidebar';

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  return (
    <div className={styles.appLayout}>
      <AppHeader pageTitle={pageTitle} />
      <div className={styles.appBody}>
        <AppSidebar />
        <main className={styles.appContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
