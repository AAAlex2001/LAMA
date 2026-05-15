'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './app-layout.module.scss';
import {
  BellIcon,
  BotsIcon,
  BrainIcon,
  CalendarIcon,
  ChannelsIcon,
  CloseIcon,
  DraftsIcon,
  ExitIcon,
  InboxIcon,
  ParserIcon,
  PostIcon,
  UserIcon,
  WalletIcon,
} from '@/components/icons';

interface MobileBurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function MobileBurgerMenu({ isOpen, onClose }: MobileBurgerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('lamaplanner_access_token');
    router.push(`/${locale}/login`);
    handleClose();
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const mainItems: MenuItem[] = [
    { id: 'create-post', icon: <PostIcon width={24} height={24} color="#000000" />, label: 'Новая публикация', href: `/${locale}/create-post` },
    { id: 'calendar', icon: <CalendarIcon width={24} height={24} color="#000000" />, label: 'Календарь', href: `/${locale}/calendar` },
    { id: 'drafts', icon: <DraftsIcon width={24} height={24} color="#000000" />, label: 'Черновики', href: `/${locale}/drafts` },
    { id: 'channels', icon: <ChannelsIcon width={24} height={24} color="#000000" />, label: 'Каналы и группы', href: `/${locale}/channels` },
    { id: 'bots', icon: <BotsIcon width={24} height={24} color="#000000" />, label: 'Боты', href: `/${locale}/bots` },
    { id: 'inbox', icon: <InboxIcon width={24} height={24} color="#000000" />, label: 'Входящие', href: `/${locale}/inbox` },
    { id: 'parser', icon: <ParserIcon width={24} height={24} color="#000000" />, label: 'Парсер', disabled: true },
    { id: 'wallet', icon: <WalletIcon width={24} height={24} color="#000000" />, label: 'Рекламный кабинет', href: `/${locale}/wallet` },
  ];

  const footerItems: MenuItem[] = [
    { id: 'profile', icon: <UserIcon width={20} height={20} color="#000000" />, label: 'Профиль', href: `/${locale}/profile` },
    { id: 'knowledge', icon: <BrainIcon width={20} height={20} color="#000000" />, label: 'База знаний', href: `/${locale}/knowledge-base` },
    { id: 'logout', icon: <ExitIcon width={18} height={18} color="#000000" />, label: 'Выйти', onClick: handleLogout },
  ];

  const isActive = (item: MenuItem) => {
    if (!item.href) return false;
    if (item.id === 'knowledge') {
      return pathname.startsWith(item.href);
    }
    return pathname.startsWith(item.href);
  };

  const handleClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) {
      handleNavigate(item.href);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.mobileMenuOverlay}
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className={styles.mobileMenu}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
        <div className={styles.mobileMenuHeader}>
          <button className={styles.mobileMenuNotification} type="button" aria-label="Уведомления">
            <BellIcon width={24} height={24} color="#000000" />
          </button>

          <a href="/" className={styles.headerLogo}>
            <span className={styles.headerLogoPrefix}>LAMA</span>
            <span className={styles.headerLogoSuffix}>planner</span>
          </a>

          <button
            className={styles.mobileMenuClose}
            type="button"
            aria-label="Закрыть"
            onClick={handleClose}
          >
            <CloseIcon width={24} height={24} color="#000000" />
          </button>
        </div>

        <div className={styles.mobileMenuItems}>
          {mainItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.mobileMenuItem} ${isActive(item) ? styles.mobileMenuItemActive : ''} ${item.disabled ? styles.mobileMenuItemDisabled : ''}`}
              onClick={() => handleClick(item)}
              disabled={item.disabled}
              type="button"
            >
              {item.icon}
              <span className={styles.mobileMenuItemLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.mobileMenuFooter}>
          {footerItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.mobileMenuItem} ${isActive(item) ? styles.mobileMenuItemActive : ''} ${item.disabled ? styles.mobileMenuItemDisabled : ''}`}
              onClick={() => handleClick(item)}
              disabled={item.disabled}
              type="button"
            >
              {item.icon}
              <span className={styles.mobileMenuItemLabel}>{item.label}</span>
            </button>
          ))}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
