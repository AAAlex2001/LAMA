'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import styles from './app-layout.module.scss';
import AppHeader from './app-header';
import AppSidebar from './app-sidebar';

const ScrollContainerContext = createContext<HTMLElement | null>(null);

export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  return (
    <div className={styles.appLayout}>
      <AppHeader pageTitle={pageTitle} />
      <div className={styles.appBody}>
        <AppSidebar />
        <main ref={setScrollContainer} className={styles.appContent}>
          <ScrollContainerContext.Provider value={scrollContainer}>
            {children}
          </ScrollContainerContext.Provider>
        </main>
      </div>
    </div>
  );
}
