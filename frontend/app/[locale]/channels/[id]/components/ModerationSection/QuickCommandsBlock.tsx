'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useQuickCommandsQuery,
  useUpdateQuickCommandsMutation,
} from '@/store/channels';
import { QUICK_COMMANDS } from './constants';
import styles from '../ModerationSection.module.scss';

interface QuickCommandsBlockProps {
  channelId: number;
}

const QuickCommandsBlock: FC<QuickCommandsBlockProps> = ({ channelId }) => {
  const { showSuccess, showError } = useNotifications();
  const query = useQuickCommandsQuery(channelId);
  const update = useUpdateQuickCommandsMutation();

  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (query.data) {
      setEnabled(query.data.commands_enabled);
      setSelected(query.data.enabled_commands ?? []);
    }
  }, [query.data]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const send = (nextEnabled: boolean, nextSelected: string[], successMsg: string) => {
    update.mutate(
      { channelId, enabled: nextEnabled, commands: nextSelected },
      {
        onSuccess: () => showSuccess(successMsg),
        onError: () => showError('Ошибка сохранения'),
      },
    );
  };

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    send(next, selected, next ? 'Команды включены' : 'Команды отключены');
  };

  const handleCommandToggle = (commandId: string) => {
    const next = selected.includes(commandId)
      ? selected.filter((c) => c !== commandId)
      : [...selected, commandId];
    setSelected(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => send(enabled, next, 'Команды обновлены'), 800);
  };

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Быстрые команды</span>
        <Toggle checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && (
        <div className={styles.expandedContent}>
          <div className={styles.commandList}>
            {QUICK_COMMANDS.map((cmd) => (
              <div key={cmd.id} className={styles.checkboxRow} onClick={() => handleCommandToggle(cmd.id)}>
                <Checkbox
                  checked={selected.includes(cmd.id)}
                  onChange={() => handleCommandToggle(cmd.id)}
                  label={cmd.label}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default QuickCommandsBlock;
