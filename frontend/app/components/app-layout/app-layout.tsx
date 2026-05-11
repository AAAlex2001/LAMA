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
  shouldHideOnScroll?: boolean;
}

export default function AppLayout({ children, pageTitle, shouldHideOnScroll = false }: AppLayoutProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const isHeaderHidden = shouldHideOnScroll && !isHeaderVisible;

  return (
    <div className={`${styles.appLayout} ${isHeaderHidden ? styles.appLayoutHeaderHidden : ''}`}>
      <AppHeader
        pageTitle={pageTitle}
        shouldHideOnScroll={shouldHideOnScroll}
        scrollContainer={scrollContainer}
        onVisibilityChange={setIsHeaderVisible}
      />
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
