'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './app-layout.module.scss';
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
    { id: 'wallet', icon: <WalletIcon width={24} height={24} />, label: 'Рекламный кабинет', disabled: true },
  ];

  const footerItems: SidebarItem[] = [
    { id: 'knowledge', icon: <BrainIcon width={20} height={20} />, label: 'База знаний', disabled: true },
    { id: 'logout', icon: <ExitIcon width={18} height={18} />, label: 'Выйти', onClick: handleLogout },
  ];

  const isActive = (item: SidebarItem) => {
    if (!item.href) return false;
    if (item.id === 'drafts') {
      return pathname.startsWith(item.href) || 
             pathname.includes('/create-draft') || 
             pathname.includes('/edit-draft');
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
