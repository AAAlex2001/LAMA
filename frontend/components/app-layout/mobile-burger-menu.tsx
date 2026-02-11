'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './app-layout.module.scss';
import { CloseIcon } from '@/components/icons';
import PostIcon from '@/components/icons/post-icon';
import CalendarIcon from '@/components/icons/calendar-icon';
import { DraftsIcon } from '@/components/icons';
import ChannelsIcon from '@/components/icons/channels-icon';
import BotsIcon from '@/components/icons/bots-icon';
import InboxIcon from '@/components/icons/inbox-icon';
import ParserIcon from '@/components/icons/parser-icon';
import WalletIcon from '@/components/icons/wallet-icon';
import BrainIcon from '@/components/icons/brain-icon';
import ExitIcon from '@/components/icons/exit-icon';
import UserIcon from '@/components/icons/user-icon';
import BellIcon from '@/components/icons/bell-icon';

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
    onClose();
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const mainItems: MenuItem[] = [
    { id: 'create-post', icon: <PostIcon width={24} height={24} color="#383F45" />, label: 'Новая публикация', href: `/${locale}/create-post` },
    { id: 'calendar', icon: <CalendarIcon width={24} height={24} color="#383F45" />, label: 'Календарь', disabled: true },
    { id: 'drafts', icon: <DraftsIcon width={24} height={24} color="#383F45" />, label: 'Черновики', href: `/${locale}/drafts` },
    { id: 'channels', icon: <ChannelsIcon width={24} height={24} color="#383F45" />, label: 'Каналы и группы', disabled: true },
    { id: 'bots', icon: <BotsIcon width={24} height={24} color="#383F45" />, label: 'Боты', disabled: true },
    { id: 'inbox', icon: <InboxIcon width={24} height={24} color="#383F45" />, label: 'Входящие', disabled: true },
    { id: 'parser', icon: <ParserIcon width={24} height={24} color="#383F45" />, label: 'Парсер', disabled: true },
    { id: 'wallet', icon: <WalletIcon width={24} height={24} color="#383F45" />, label: 'Рекламный кабинет', disabled: true },
  ];

  const footerItems: MenuItem[] = [
    { id: 'profile', icon: <UserIcon width={20} height={20} color="#383F45" />, label: 'Профиль', href: `/${locale}/profile` },
    { id: 'knowledge', icon: <BrainIcon width={20} height={20} color="#383F45" />, label: 'База знаний', disabled: true },
    { id: 'logout', icon: <ExitIcon width={18} height={18} color="#383F45" />, label: 'Выйти', onClick: handleLogout },
  ];

  const isActive = (item: MenuItem) => {
    if (!item.href) return false;
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

  if (!isOpen) return null;

  return (
    <div className={styles.mobileMenuOverlay} onClick={onClose}>
      <div className={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mobileMenuHeader}>
          <button className={styles.mobileMenuNotification} type="button" aria-label="Уведомления">
            <BellIcon width={24} height={24} color="#383F45" />
          </button>

          <a href="/" className={styles.headerLogo}>
            <span className={styles.headerLogoPrefix}>LAMA</span>
            <span className={styles.headerLogoSuffix}>planner</span>
          </a>

          <button
            className={styles.mobileMenuClose}
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <CloseIcon width={24} height={24} color="#383F45" />
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
      </div>
    </div>
  );
}
