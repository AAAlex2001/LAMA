'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/new-button';
import Checkbox from '@/components/checkbox/checkbox';
import SearchBar from '@/components/search-bar/search-bar';
import type { ChannelBasic } from '@/types';
import styles from '../CreateBotCommandModal.module.scss';

type ClaimRecipientTarget = 'ADMINS' | 'INBOX' | 'SPECIFIC_CHANNEL';

interface ClaimAdminSectionProps {
  recipientTarget: ClaimRecipientTarget;
  onRecipientTargetChange: (next: ClaimRecipientTarget) => void;
  selectedChannelIds: number[];
  onSelectedChannelIdsChange: (updater: (prev: number[]) => number[]) => void;
  channels: ChannelBasic[];
  onConnectClick: () => void;
}

const ClaimAdminSection: FC<ClaimAdminSectionProps> = ({
  recipientTarget,
  onRecipientTargetChange,
  selectedChannelIds,
  onSelectedChannelIdsChange,
  channels,
  onConnectClick,
}) => {
  const [search, setSearch] = useState('');

  const filteredChannels = search.trim()
    ? channels.filter((c) => c.title.toLowerCase().includes(search.trim().toLowerCase()))
    : channels;

  return (
    <div className={styles.claimRecipientSection}>
      <div className={styles.claimRecipientHeading}>Получатель:</div>

      <div className={styles.claimRecipientPanel}>
        <div className={styles.claimList} aria-label="Получатели жалобы">
          <label className={styles.claimItem}>
            <Checkbox
              variant="radio"
              checked={recipientTarget === 'ADMINS'}
              onChange={(checked) => { if (checked) onRecipientTargetChange('ADMINS'); }}
            />
            <span className={styles.claimItemLabel}>Все администраторы</span>
          </label>

          <label className={styles.claimItem}>
            <Checkbox
              variant="radio"
              checked={recipientTarget === 'INBOX'}
              onChange={(checked) => { if (checked) onRecipientTargetChange('INBOX'); }}
            />
            <span className={styles.claimItemLabel}>В Inbox</span>
          </label>

          <label className={styles.claimItem}>
            <Checkbox
              variant="radio"
              checked={recipientTarget === 'SPECIFIC_CHANNEL'}
              onChange={(checked) => { if (checked) onRecipientTargetChange('SPECIFIC_CHANNEL'); }}
            />
            <span className={styles.claimItemLabel}>В конкретный канал</span>
          </label>
        </div>

        {recipientTarget === 'SPECIFIC_CHANNEL' && (
          <>
            <div className={styles.claimSearchRow}>
              <SearchBar
                placeholder="Введите название канала"
                value={search}
                onChange={setSearch}
              />
            </div>

            <div className={styles.claimChannelList} aria-label="Список каналов">
              {filteredChannels.length === 0 ? (
                <div className={styles.claimEmpty}>Каналы не найдены</div>
              ) : (
                filteredChannels.map((ch) => {
                  const checked = selectedChannelIds.includes(ch.id);
                  return (
                    <label key={ch.id} className={styles.claimChannelItem}>
                      <Checkbox
                        checked={checked}
                        onChange={(next) => {
                          onSelectedChannelIdsChange((prev) => {
                            if (next) return prev.includes(ch.id) ? prev : [...prev, ch.id];
                            return prev.filter((id) => id !== ch.id);
                          });
                        }}
                      />
                      <span className={styles.claimChannelLabel}>{ch.title}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className={styles.claimAddRow}>
              <Button
                variant="outline"
                intent="gradient"
                size="md"
                className={styles.claimAddBtn}
                onClick={onConnectClick}
              >
                Подключить новый
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimAdminSection;
