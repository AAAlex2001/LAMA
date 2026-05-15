'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './app-layout.module.scss';
import {
  BotsIcon,
  BrainIcon,
  CalendarIcon,
  ChannelsIcon,
  DraftsIcon,
  ExitIcon,
  InboxIcon,
  ParserIcon,
  PostIcon,
  WalletIcon,
} from '@/components/icons';

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const locale = pathname.split('/')[1] || 'ru';

  const handleLogout = () => {
    localStorage.removeItem('lamaplanner_access_token');
    router.push(`/${locale}/login`);
  };

  const mainItems: SidebarItem[] = [
    { id: 'create-post', icon: <PostIcon width={24} height={24} />, label: 'Новая публикация', href: `/${locale}/create-post` },
    { id: 'calendar', icon: <CalendarIcon width={24} height={24} />, label: 'Календарь публикаций', href: `/${locale}/calendar` },
    { id: 'drafts', icon: <DraftsIcon width={24} height={24} />, label: 'Черновики', href: `/${locale}/drafts` },
    { id: 'channels', icon: <ChannelsIcon width={24} height={24} />, label: 'Каналы и группы', href: `/${locale}/channels` },
    { id: 'bots', icon: <BotsIcon width={24} height={24} />, label: 'Боты', href: `/${locale}/bots` },
    { id: 'inbox', icon: <InboxIcon width={24} height={24} />, label: 'Входящие', href: `/${locale}/inbox` },
    { id: 'parser', icon: <ParserIcon width={24} height={24} />, label: 'Парсер контента', disabled: true },
    { id: 'wallet', icon: <WalletIcon width={24} height={24} />, label: 'Рекламный кабинет', href: `/${locale}/wallet` },
  ];

  const footerItems: SidebarItem[] = [
    { id: 'knowledge', icon: <BrainIcon width={20} height={20} />, label: 'База знаний', href: `/${locale}/knowledge-base` },
    { id: 'logout', icon: <ExitIcon width={18} height={18} />, label: 'Выйти', onClick: handleLogout },
  ];

  const isActive = (item: SidebarItem) => {
    if (!item.href) return false;
    if (item.id === 'drafts') {
      return pathname.startsWith(item.href) ||
             pathname.includes('/create-draft') ||
             pathname.includes('/edit-draft');
    }
    if (item.id === 'create-post') {
      return pathname.startsWith(item.href) || pathname.includes('/edit-post');
    }
    return pathname.startsWith(item.href);
  };

  const handleClick = (item: SidebarItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  const renderItem = (item: SidebarItem) => (
    <button
      key={item.id}
      className={`${styles.sidebarItem} ${isActive(item) ? styles.sidebarItemActive : ''} ${item.disabled ? styles.sidebarItemDisabled : ''}`}
      onClick={() => handleClick(item)}
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
      disabled={item.disabled}
      type="button"
    >
      {item.icon}
      {hoveredItem === item.id && (
        <div className={styles.sidebarTooltip}>
          <div className={styles.sidebarTooltipContent}>
            <span className={styles.sidebarTooltipText}>{item.label}</span>
          </div>
          <div className={styles.sidebarTooltipArrow} />
        </div>
      )}
    </button>
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarMenu}>
        {mainItems.map(renderItem)}
      </div>
      <div className={styles.sidebarFooter}>
        {footerItems.map(renderItem)}
      </div>
    </aside>
  );
}
