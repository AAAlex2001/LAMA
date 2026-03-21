'use client';

import { FC, useEffect, useState, useMemo } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import SearchBar from '@/components/search-bar/search-bar';
import Checkbox from '@/components/checkbox/checkbox';
import AiInputBar from '@/components/ai-input-bar';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch, useAppSelector } from '../../store';
import { initFromChannel, setCopyEnabled, setSaveArchive, setAiPrompt } from '../../store/slices/backup';
import {
  disableBackupThunk,
  toggleBackupTargetThunk,
  toggleBackupPostTypeThunk,
  toggleBackupContentTypeThunk,
  updateBackupAiPromptThunk,
  restoreBackupThunk,
} from '../../store/thunks/backup';
import { API_BASE_URL, getAuthToken } from '@/store/api';
import type { Channel } from '@/types/channel';
import styles from './BackupSection.module.scss';

interface BackupSectionProps {
  channel: Channel;
}

const POST_TYPE_OPTIONS = [
  { id: 'with_buttons', label: 'Посты с кнопками' },
  { id: 'with_attachments', label: 'Посты с вложениями' },
  { id: 'text_posts', label: 'Текстовые посты' },
];

const CONTENT_TYPE_LEFT = [
  { id: 'photo', label: 'Фотографии' },
  { id: 'video', label: 'Видеозаписи' },
  { id: 'animation', label: 'Гифки' },
];

const CONTENT_TYPE_RIGHT = [
  { id: 'document', label: 'Файлы' },
  { id: 'text', label: 'Текст' },
  { id: 'buttons', label: 'Кнопки' },
];

const BackupSection: FC<BackupSectionProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const channels = useAppSelector((s) => s.channels.channels) as Channel[];
  const {
    copyEnabled,
    saveArchive,
    selectedTargets,
    postTypes,
    contentTypes,
    saving,
    error,
  } = useAppSelector((s) => s.backup);

  const [channelsOpen, setChannelsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(initFromChannel({
      backupMode: channel.backup_mode,
      backupTargetIds: channel.backup_target_ids,
      postTypes: channel.backup_post_types,
      contentTypes: channel.backup_content_types,
      aiPrompt: channel.backup_ai_prompt,
    }));
  }, [dispatch, channel.id]);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const otherChannels = useMemo(
    () => channels.filter((ch) => ch.id !== channel.id),
    [channels, channel.id],
  );

  const filteredChannels = useMemo(() => {
    if (!search.trim()) return otherChannels;
    const q = search.toLowerCase();
    return otherChannels.filter((ch) =>
      ch.title.toLowerCase().includes(q) || ch.username?.toLowerCase().includes(q),
    );
  }, [otherChannels, search]);

  const selectedNames = useMemo(
    () => otherChannels
      .filter((ch) => selectedTargets.includes(ch.id))
      .map((ch) => ch.title)
      .join(', '),
    [otherChannels, selectedTargets],
  );

  const restoreTargetName = useMemo(
    () => otherChannels.find((ch) => ch.id === restoreTargetId)?.title ?? '',
    [otherChannels, restoreTargetId],
  );

  const hasAttachments = postTypes.includes('with_attachments');

  const handleToggleCopy = (checked: boolean) => {
    if (!checked) {
      dispatch(disableBackupThunk(channel.id))
        .unwrap()
        .then(() => showSuccess('Резервное копирование отключено'))
        .catch(() => {});
    } else {
      dispatch(setCopyEnabled(true));
    }
  };

  const handleToggleTarget = (channelDbId: number) => {
    dispatch(toggleBackupTargetThunk({ channelId: channel.id, targetId: channelDbId }))
      .unwrap()
      .then(() => showSuccess('Настройки сохранены'))
      .catch(() => {});
  };

  const handleTogglePostType = (id: string) => {
    dispatch(toggleBackupPostTypeThunk({ channelId: channel.id, postType: id }))
      .unwrap()
      .then(() => showSuccess('Настройки сохранены'))
      .catch(() => {});
  };

  const handleToggleContentType = (id: string) => {
    dispatch(toggleBackupContentTypeThunk({ channelId: channel.id, contentType: id }))
      .unwrap()
      .then(() => showSuccess('Настройки сохранены'))
      .catch(() => {});
  };

  const handleAiSubmit = async (prompt: string) => {
    dispatch(setAiPrompt(prompt));
    dispatch(updateBackupAiPromptThunk({ channelId: channel.id, prompt }))
      .unwrap()
      .then(() => showSuccess('Промпт сохранён'))
      .catch(() => {});
  };

  const handleRestore = () => {
    if (!restoreTargetId) return;
    dispatch(restoreBackupThunk({ sourceChannelId: channel.id, targetChannelId: restoreTargetId }))
      .unwrap()
      .then(() => showSuccess('Восстановление запущено'))
      .catch(() => {});
  };

  const handleExport = async () => {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/channels/${channel.id}/export`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      showError('Ошибка экспорта');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${channel.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Резервное копирование</span>
      </div>

      <div className={styles.toggleList}>
        {/* --- Copy toggle --- */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Копировать новые посты в резервный канал</span>
          <Toggle checked={copyEnabled} onChange={handleToggleCopy} disabled={saving} />
        </div>

        {copyEnabled && (
          <div className={styles.expandedContent}>
            {/* Channel selector */}
            <div className={styles.channelSelector}>
              <button
                className={styles.subRow}
                type="button"
                onClick={() => setChannelsOpen(!channelsOpen)}
              >
                <span className={styles.subLabel}>Выбор каналов-ретрансляторов</span>
                <ChevronDownIcon
                  width={16}
                  height={16}
                  color="#383F45"
                  className={`${styles.subChevron} ${channelsOpen ? styles.subChevronOpen : ''}`}
                />
              </button>
              {selectedNames && (
                <span className={styles.selectedChannels}>{selectedNames}</span>
              )}

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
                        onClick={() => handleToggleTarget(ch.id)}
                      >
                        <Checkbox
                          checked={selectedTargets.includes(ch.id)}
                          onChange={() => handleToggleTarget(ch.id)}
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
            </div>

            {/* AI prompt */}
            <div className={styles.aiSection}>
              <span className={styles.sectionLabel}>ИИ-промпт для ретрансляции поста</span>
              <AiInputBar onSubmit={handleAiSubmit} />
            </div>

            {/* Post type checkboxes */}
            <div className={styles.postTypes}>
              <span className={styles.sectionLabel}>Типы публикаций</span>
              <div className={styles.checkboxList}>
                {POST_TYPE_OPTIONS.map((opt) => (
                  <div key={opt.id}>
                    <div
                      className={styles.checkboxItem}
                      onClick={() => handleTogglePostType(opt.id)}
                    >
                      <Checkbox
                        checked={postTypes.includes(opt.id)}
                        onChange={() => handleTogglePostType(opt.id)}
                        label={opt.label}
                      />
                    </div>

                    {/* Content types — only when "Посты с вложениями" checked */}
                    {opt.id === 'with_attachments' && hasAttachments && (
                      <div className={styles.contentTypes}>
                        <span className={styles.contentTypesLabel}>Типы вложений</span>
                        <div className={styles.contentTypeGrid}>
                          <div className={styles.contentTypeColumn}>
                            {CONTENT_TYPE_LEFT.map((ct) => (
                              <div
                                key={ct.id}
                                className={styles.checkboxItem}
                                onClick={() => handleToggleContentType(ct.id)}
                              >
                                <Checkbox
                                  checked={contentTypes.includes(ct.id)}
                                  onChange={() => handleToggleContentType(ct.id)}
                                  label={ct.label}
                                />
                              </div>
                            ))}
                          </div>
                          <div className={styles.contentTypeColumn}>
                            {CONTENT_TYPE_RIGHT.map((ct) => (
                              <div
                                key={ct.id}
                                className={styles.checkboxItem}
                                onClick={() => handleToggleContentType(ct.id)}
                              >
                                <Checkbox
                                  checked={contentTypes.includes(ct.id)}
                                  onChange={() => handleToggleContentType(ct.id)}
                                  label={ct.label}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Archive toggle --- */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Сохранять архив в системе LamaPlanner</span>
          <Toggle checked={saveArchive} onChange={(v) => dispatch(setSaveArchive(v))} disabled={saving} />
        </div>

        {saveArchive && (
          <div className={styles.archiveContent}>
            {/* Restore block */}
            <div className={styles.archiveBlock}>
              <div className={styles.archiveHeader}>
                <span className={styles.archiveTitle}>Восстановление данных</span>
                <span className={styles.archiveDesc}>Все сохранённые посты будут скопированы в выбранный канал</span>
              </div>
              <Button
                variant="outline"
                intent="gradient"
                size="md"
                className={styles.archiveBtn}
                onClick={handleRestore}
                disabled={saving || !restoreTargetId}
              >
                Восстановить данные
              </Button>
            </div>

            <button
              className={styles.restoreRow}
              type="button"
              onClick={() => setRestoreOpen(!restoreOpen)}
            >
              <div className={styles.restoreInfo}>
                <span className={styles.restoreLabel}>Канал для восстановления</span>
                <span className={styles.restoreValue}>{restoreTargetName || 'Не выбран'}</span>
              </div>
              <ChevronDownIcon
                width={16}
                height={16}
                color="#383F45"
                className={`${styles.subChevron} ${restoreOpen ? styles.subChevronOpen : ''}`}
              />
            </button>

            {restoreOpen && (
              <div className={styles.channelPicker}>
                <div className={styles.channelList}>
                  {otherChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className={styles.channelItem}
                      onClick={() => { setRestoreTargetId(ch.id); setRestoreOpen(false); }}
                    >
                      <Checkbox
                        checked={restoreTargetId === ch.id}
                        onChange={() => { setRestoreTargetId(ch.id); setRestoreOpen(false); }}
                        label={ch.title}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export block */}
            <div className={styles.archiveBlock}>
              <div className={styles.archiveHeader}>
                <span className={styles.archiveTitle}>Экспорт архива</span>
                <span className={styles.archiveDesc}>Скачать архив постов канала в формате JSON</span>
              </div>
              <Button
                variant="fill"
                intent="gradient"
                size="md"
                className={styles.archiveBtn}
                onClick={handleExport}
              >
                Скачать
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupSection;
