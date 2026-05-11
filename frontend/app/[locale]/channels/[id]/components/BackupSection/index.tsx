'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useChannelsQuery,
  useUpdateBackupModeMutation,
  useRestoreBackupMutation,
  type BackupModePayload,
} from '@/store/channels';
import { API_BASE_URL, getAuthToken } from '@/store/api';
import type { Channel } from '@/types/channel';
import RestoreModal from '../RestoreModal';
import ExportModal from '../ExportModal';
import CopyToChannelColumn from './CopyToChannelColumn';
import ArchiveColumn from './ArchiveColumn';
import { DEFAULT_POST_TYPES } from './constants';
import styles from '../BackupSection.module.scss';

interface BackupSectionProps {
  channel: Channel;
}

const BackupSection: FC<BackupSectionProps> = ({ channel }) => {
  const { showSuccess, showError } = useNotifications();
  const channelsQuery = useChannelsQuery();
  const updateBackupMode = useUpdateBackupModeMutation();
  const restoreBackup = useRestoreBackupMutation();
  const saving = updateBackupMode.isPending || restoreBackup.isPending;

  const allChannels = (channelsQuery.data?.items ?? []) as Channel[];

  const [copyEnabled, setCopyEnabled] = useState(channel.backup_mode === 'INSTANT');
  const [saveArchive, setSaveArchive] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<number[]>(channel.backup_target_ids ?? []);
  const [postTypes, setPostTypes] = useState<string[]>(channel.backup_post_types ?? DEFAULT_POST_TYPES);
  const [contentTypes, setContentTypes] = useState<string[]>(channel.backup_content_types ?? []);
  const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    setCopyEnabled(channel.backup_mode === 'INSTANT');
    setSelectedTargets(channel.backup_target_ids ?? []);
    setPostTypes(channel.backup_post_types ?? DEFAULT_POST_TYPES);
    setContentTypes(channel.backup_content_types ?? []);
  }, [channel.id, channel.backup_mode, channel.backup_target_ids, channel.backup_post_types, channel.backup_content_types]);

  const otherChannels = useMemo(
    () => allChannels.filter((ch) => ch.id !== channel.id),
    [allChannels, channel.id],
  );

  const buildPayload = (overrides: Partial<{
    copyEnabled: boolean;
    selectedTargets: number[];
    postTypes: string[];
    contentTypes: string[];
    aiPrompt: string | null;
  }> = {}): BackupModePayload => {
    const enabled = overrides.copyEnabled ?? copyEnabled;
    const targets = overrides.selectedTargets ?? selectedTargets;
    const types = overrides.postTypes ?? postTypes;
    const contents = overrides.contentTypes ?? contentTypes;
    return {
      backup_mode: enabled ? 'INSTANT' : 'DISABLED',
      backup_target_ids: targets.length > 0 ? targets : null,
      backup_post_types: types.length > 0 ? types : null,
      backup_content_types: contents.length > 0 ? contents : null,
      backup_ai_prompt: overrides.aiPrompt ?? channel.backup_ai_prompt ?? null,
    };
  };

  const sendUpdate = async (payload: BackupModePayload, successMsg: string) => {
    try {
      await updateBackupMode.mutateAsync({ channelId: channel.id, payload });
      showSuccess(successMsg);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка обновления настроек');
    }
  };

  const handleToggleCopy = async (checked: boolean) => {
    if (!checked) {
      setCopyEnabled(false);
      setSelectedTargets([]);
      await sendUpdate({
        backup_mode: 'DISABLED',
        backup_target_ids: null,
        backup_post_types: null,
        backup_content_types: null,
        backup_ai_prompt: null,
      }, 'Резервное копирование отключено');
    } else {
      setCopyEnabled(true);
    }
  };

  const handleToggleTarget = async (channelDbId: number) => {
    const next = selectedTargets.includes(channelDbId)
      ? selectedTargets.filter((id) => id !== channelDbId)
      : [...selectedTargets, channelDbId];
    setSelectedTargets(next);
    await sendUpdate(buildPayload({ selectedTargets: next }), 'Настройки сохранены');
  };

  const handleTogglePostType = async (id: string) => {
    const next = postTypes.includes(id)
      ? postTypes.filter((p) => p !== id)
      : [...postTypes, id];
    setPostTypes(next);
    await sendUpdate(buildPayload({ postTypes: next }), 'Настройки сохранены');
  };

  const handleToggleContentType = async (id: string) => {
    const next = contentTypes.includes(id)
      ? contentTypes.filter((c) => c !== id)
      : [...contentTypes, id];
    setContentTypes(next);
    await sendUpdate(buildPayload({ contentTypes: next }), 'Настройки сохранены');
  };

  const handleAiSubmit = async (prompt: string) => {
    await sendUpdate(buildPayload({ aiPrompt: prompt || null }), 'Промпт сохранён');
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

  const restoreTargetName = otherChannels.find((ch) => ch.id === restoreTargetId)?.title ?? '';

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Резервное копирование</span>
      </div>

      <div className={styles.columnsGrid}>
        <CopyToChannelColumn
          channels={otherChannels}
          copyEnabled={copyEnabled}
          selectedTargets={selectedTargets}
          postTypes={postTypes}
          contentTypes={contentTypes}
          saving={saving}
          onToggleCopy={handleToggleCopy}
          onToggleTarget={handleToggleTarget}
          onTogglePostType={handleTogglePostType}
          onToggleContentType={handleToggleContentType}
          onAiSubmit={handleAiSubmit}
        />
        <ArchiveColumn
          saveArchive={saveArchive}
          onToggleSaveArchive={setSaveArchive}
          channels={otherChannels}
          restoreTargetId={restoreTargetId}
          onRestoreTargetChange={setRestoreTargetId}
          onRestoreClick={() => setRestoreModalOpen(true)}
          onExportClick={() => setExportModalOpen(true)}
          saving={saving}
        />
      </div>

      <RestoreModal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={async (selectedContentTypes, dateRange) => {
          if (!restoreTargetId) return;
          try {
            await restoreBackup.mutateAsync({
              sourceChannelId: channel.id,
              targetChannelId: restoreTargetId,
              contentTypes: selectedContentTypes,
              dateRange,
            });
            showSuccess('Восстановление запущено');
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Ошибка восстановления');
          }
        }}
        channel={channel}
        targetChannelName={restoreTargetName}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirm={() => handleExport()}
        channel={channel}
      />
    </div>
  );
};

export default BackupSection;
