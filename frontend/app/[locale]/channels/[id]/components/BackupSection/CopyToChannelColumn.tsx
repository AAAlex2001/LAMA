'use client';

import { FC, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
import AiInputBar from '@/components/ai-input-bar';
import type { Channel } from '@/types/channel';
import { POST_TYPE_OPTIONS, CONTENT_TYPE_LEFT, CONTENT_TYPE_RIGHT } from './constants';
import styles from '../BackupSection.module.scss';

interface CopyToChannelColumnProps {
  channels: Channel[];
  copyEnabled: boolean;
  selectedTargets: number[];
  postTypes: string[];
  contentTypes: string[];
  saving: boolean;
  onToggleCopy: (next: boolean) => void;
  onToggleTarget: (channelId: number) => void;
  onTogglePostType: (id: string) => void;
  onToggleContentType: (id: string) => void;
  onAiSubmit: (prompt: string) => Promise<void>;
}

const CopyToChannelColumn: FC<CopyToChannelColumnProps> = ({
  channels,
  copyEnabled,
  selectedTargets,
  postTypes,
  contentTypes,
  saving,
  onToggleCopy,
  onToggleTarget,
  onTogglePostType,
  onToggleContentType,
  onAiSubmit,
}) => {
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredChannels = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((ch) =>
      ch.title.toLowerCase().includes(q) || ch.username?.toLowerCase().includes(q),
    );
  }, [channels, search]);

  const selectedNames = channels
    .filter((ch) => selectedTargets.includes(ch.id))
    .map((ch) => ch.title)
    .join(', ');

  const hasAttachments = postTypes.includes('with_attachments');

  return (
    <div className={styles.column}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Копировать новые посты в резервный канал</span>
        <Toggle checked={copyEnabled} onChange={onToggleCopy} disabled={saving} />
      </div>

      {copyEnabled && (
        <div className={styles.expandedContent}>
          <button
            className={styles.channelSelectorRow}
            type="button"
            onClick={() => setChannelsOpen(!channelsOpen)}
          >
            <span className={styles.subLabel}>Канал-ретранслятор:</span>
            <span className={styles.channelSelectorValue}>{selectedNames || 'Не выбран'}</span>
            <ChevronDownIcon
              width={16}
              height={16}
              color="#000000"
              className={`${styles.subChevron} ${channelsOpen ? styles.subChevronOpen : ''}`}
            />
          </button>

          {channelsOpen && (
            <div className={styles.channelPicker}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Введите название канала"
              />
              <div className={styles.channelList}>
                {filteredChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className={styles.channelItem}
                    onClick={() => onToggleTarget(ch.id)}
                  >
                    <Checkbox
                      checked={selectedTargets.includes(ch.id)}
                      onChange={() => onToggleTarget(ch.id)}
                      label={ch.title}
                    />
                  </div>
                ))}
                {filteredChannels.length === 0 && (
                  <span className={styles.emptyText}>Нет каналов</span>
                )}
              </div>
            </div>
          )}

          <div className={styles.aiSection}>
            <span className={styles.sectionLabel}>ИИ-промт для ретранслятора</span>
            <AiInputBar onSubmit={onAiSubmit} />
          </div>

          <div className={styles.postTypesRow}>
            <div className={styles.postTypesColumn}>
              <span className={styles.sectionLabel}>Типы публикаций:</span>
              <div className={styles.checkboxList}>
                {POST_TYPE_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className={styles.checkboxItem}
                    onClick={() => onTogglePostType(opt.id)}
                  >
                    <Checkbox
                      checked={postTypes.includes(opt.id)}
                      onChange={() => onTogglePostType(opt.id)}
                      label={opt.label}
                    />
                  </div>
                ))}
              </div>
            </div>

            {hasAttachments && (
              <div className={styles.contentTypesColumn}>
                <span className={styles.sectionLabel}>Настройки ретранслятора:</span>
                <div className={styles.contentTypeGrid}>
                  {[CONTENT_TYPE_LEFT, CONTENT_TYPE_RIGHT].map((col, ci) => (
                    <div key={ci} className={styles.contentTypeColumn}>
                      {col.map((ct) => (
                        <div
                          key={ct.id}
                          className={styles.checkboxItem}
                          onClick={() => onToggleContentType(ct.id)}
                        >
                          <Checkbox
                            checked={contentTypes.includes(ct.id)}
                            onChange={() => onToggleContentType(ct.id)}
                            label={ct.label}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CopyToChannelColumn;
