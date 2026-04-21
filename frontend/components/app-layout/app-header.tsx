'use client';

import { useEffect, useState } from 'react';
import styles from './app-layout.module.scss';
import BellIcon from '@/components/icons/bell-icon';
import BurgerIcon from '@/components/icons/burger-icon';
import MobileBurgerMenu from './mobile-burger-menu';

const MOBILE_BREAKPOINT_PX = 1440;

interface AppHeaderProps {
  pageTitle?: string;
  shouldHideOnScroll?: boolean;
  scrollContainer?: HTMLElement | null;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export default function AppHeader({ pageTitle, shouldHideOnScroll: shouldHideOnScrollRaw = false, scrollContainer, onVisibilityChange }: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const syncIsMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    syncIsMobile();
    window.addEventListener('resize', syncIsMobile);
    return () => window.removeEventListener('resize', syncIsMobile);
  }, []);

  const shouldHideOnScroll = shouldHideOnScrollRaw && isMobile;

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  useEffect(() => {
    if (!shouldHideOnScroll) {
      setIsVisible(true);
      return;
    }

    const target: HTMLElement | Window = scrollContainer ?? window;

    const getScrollTop = () => {
      if (scrollContainer) return scrollContainer.scrollTop;
      const se = document.scrollingElement as HTMLElement | null;
      return (
        window.scrollY ||
        window.pageYOffset ||
        se?.scrollTop ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const TOP_THRESHOLD = 0;
    let rafId = 0;
    let ticking = false;

    const syncHeader = () => {
      setIsVisible(getScrollTop() <= TOP_THRESHOLD);
      ticking = false;
    };

    syncHeader();

    const onAnyScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(syncHeader);
    };

    target.addEventListener('scroll', onAnyScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', onAnyScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [shouldHideOnScroll, scrollContainer]);

  return (
    <>
      <header className={`${styles.header} ${shouldHideOnScroll && !isVisible ? styles.headerHidden : ''}`}>
        <a href="/" className={styles.headerLogo}>
          <span className={styles.headerLogoPrefix}>LAMA</span>
          <span className={styles.headerLogoSuffix}>planner</span>
        </a>

        {pageTitle && (
          <span className={styles.headerPageTitle}>{pageTitle}</span>
        )}

        <div className={styles.headerRight}>
          <button className={styles.headerIconButton} type="button" aria-label="Уведомления">
            <BellIcon width={24} height={24} color="#000000" />
          </button>

          <button 
            className={styles.headerAvatar}
            type="button"
            aria-label="Профиль"
            onClick={() => { window.location.href = '/profile'; }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#E8EDF5" />
              <path d="M20 20C21.3261 20 22.5979 19.4732 23.5355 18.5355C24.4732 17.5979 25 16.3261 25 15C25 13.6739 24.4732 12.4021 23.5355 11.4645C22.5979 10.5268 21.3261 10 20 10C18.6739 10 17.4021 10.5268 16.4645 11.4645C15.5268 12.4021 15 13.6739 15 15C15 16.3261 15.5268 17.5979 16.4645 18.5355C17.4021 19.4732 18.6739 20 20 20ZM20 22.5C14.47 22.5 10 24.735 10 27.5V30H30V27.5C30 24.735 25.53 22.5 20 22.5Z" fill="#B0B4B8" />
            </svg>
          </button>

          <button
            className={styles.headerBurgerButton}
            type="button"
            aria-label="Меню"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <BurgerIcon width={44} height={44} color="#000000" />
          </button>
        </div>
      </header>

      <MobileBurgerMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
