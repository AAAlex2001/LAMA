'use client';

import { FC, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChatChevronIcon } from '@/components/icons';
import FilterTabs from '@/components/filter-tabs/filter-tabs';
import styles from './SettingsHeader.module.scss';

const SETTINGS_TABS = [
  { id: 'settings', label: 'Общая информация' },
  { id: 'backup', label: 'Резервное копирование' },
  { id: 'moderation', label: 'Модерация' },
  { id: 'automation', label: 'Автоматизация' },
];

interface SettingsHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SettingsHeader: FC<SettingsHeaderProps> = ({ activeTab = 'settings', onTabChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  return (
    <div className={styles.header}>
      <div className={styles.row}>
        <button className={styles.backBtn} onClick={() => router.push(`/${locale}/channels`)} type="button">
          <ChatChevronIcon width={37} height={37} />
        </button>
      </div>

      <FilterTabs
        options={SETTINGS_TABS}
        selectedFilter={activeTab}
        onFilterChange={(id) => onTabChange?.(id)}
        stretch
        className={styles.tabs}
      />
    </div>
  );
};

export default SettingsHeader;
