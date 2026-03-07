'use client';

import React, { useMemo } from 'react';
import { Checkbox } from '@/components/checkbox';
import { Button } from '@/components/new-button';
import SearchBar from '@/components/search-bar/search-bar';
import Loader from '@/components/loader/loader';
import buttonStyles from '@/components/new-button/styles.module.scss';
import styles from './styles.module.scss';

export interface Bot {
  id: number;
  username?: string;
  title?: string;
}

interface BotSearchSelectorProps {
  title?: string;
  bots: Bot[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedBotIds: Set<string>;
  onBotToggle: (botId: string) => void;
  isLoading?: boolean;
  maxBots?: number;
  onShowCreateBot?: () => void;
  searchPlaceholder?: string;
  createButtonLabel?: string;
}

const BotSearchSelector: React.FC<BotSearchSelectorProps> = ({
  title = 'Выберите бота',
  bots,
  searchValue,
  onSearchChange,
  selectedBotIds,
  onBotToggle,
  isLoading = false,
  maxBots,
  onShowCreateBot,
  searchPlaceholder = 'Поиск по ботам',
  createButtonLabel = 'Подключить новый',
}) => {
  const filteredBots = useMemo(() => {
    if (!searchValue.trim()) {
      return bots;
    }
    const searchLower = searchValue.toLowerCase();
    return bots.filter((bot) => {
      const username = bot.username?.toLowerCase() || '';
      const title = bot.title?.toLowerCase() || '';
      return username.includes(searchLower) || title.includes(searchLower);
    });
  }, [bots, searchValue]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
        <div className={styles.searchContainer}>
          <SearchBar
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        </div>
      <div className={styles.botsList}>
        {filteredBots.map((bot) => {
          const botId = bot.id.toString();
          const isSelected = selectedBotIds.has(botId);
          return (
            <div key={bot.id} className={styles.botItem}>
              <Checkbox
                checked={isSelected}
                onChange={() => onBotToggle(botId)}
              />
              <span className={styles.botItemName}>
                {bot.username || bot.title || `Bot ${bot.id}`}
              </span>
            </div>
          );
        })}
        {isLoading && (
          <div className={styles.loaderContainer}>
            <Loader size={32} color="blue" />
          </div>
        )}
        {onShowCreateBot && (
          <Button
            type="button"
            variant="outline"
            intent="gradient"
            size="lg"
            style={{ width: '100%', gap: '10px' }}
            onClick={onShowCreateBot}
          >
            <span className={buttonStyles.label}>{createButtonLabel}</span>
            {maxBots !== undefined && (
              <span className={styles.botsCount}>{`${bots.length}/${maxBots}`}</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BotSearchSelector;
