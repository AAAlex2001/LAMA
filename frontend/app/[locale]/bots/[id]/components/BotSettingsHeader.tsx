'use client';

import { FC } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/new-button';
import { ChatChevronIcon } from '@/components/icons';
import FilterTabs from '@/components/filter-tabs/filter-tabs';
import styles from './BotSettingsHeader.module.scss';

const BOT_SETTINGS_TABS = [
  { id: 'settings', label: 'Настройка и статистика' },
  { id: 'messages', label: 'Сообщения и триггеры' },
];

interface BotSettingsHeaderProps {
  connectedCount: number;
  total: number;
  onConnect: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const BotSettingsHeader: FC<BotSettingsHeaderProps> = ({
  connectedCount,
  total,
  onConnect,
  activeTab = 'settings',
  onTabChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  return (
    <div className={styles.header}>
      <div className={styles.row}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(`/${locale}/bots`)}
          type="button"
        >
          <ChatChevronIcon width={37} height={37} />
        </button>

        <div className={styles.connectBlock}>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            className={styles.connectBtn}
            onClick={onConnect}
          >
            Подключить
          </Button>
          <span className={styles.info}>
            Подключено ботов: {connectedCount}/{total}
          </span>
        </div>
      </div>

      <FilterTabs
        options={BOT_SETTINGS_TABS}
        selectedFilter={activeTab}
        onFilterChange={(id) => onTabChange?.(id)}
        stretch
        className={styles.tabs}
      />
    </div>
  );
};

export default BotSettingsHeader;
