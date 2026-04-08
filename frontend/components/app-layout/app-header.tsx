'use client';

import { useState } from 'react';
import styles from './app-layout.module.scss';
import BellIcon from '@/components/icons/bell-icon';
import BurgerIcon from '@/components/icons/burger-icon';
import MobileBurgerMenu from './mobile-burger-menu';

interface AppHeaderProps {
  pageTitle?: string;
}

export default function AppHeader({ pageTitle }: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
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
