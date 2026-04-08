'use client';

import { FC } from 'react';
import ModalBase from '@/components/modal-base';
import Loader from '@/components/loader/loader';
import type { BotStatsPayload } from '@/store/bots';

interface BotStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: BotStatsPayload | null;
  loading: boolean;
  botTitle?: string;
}

const BotStatsModal: FC<BotStatsModalProps> = ({ isOpen, onClose, stats, loading, botTitle }) => (
  <ModalBase isOpen={isOpen} onOpenChange={onClose}>
    <ModalBase.Content size="lg">
      <ModalBase.Header>
        <ModalBase.Title>Статистика{botTitle ? `: ${botTitle}` : ''}</ModalBase.Title>
        <ModalBase.Close />
      </ModalBase.Header>
      <ModalBase.Body>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader size={32} color="blue" />
          </div>
        )}
        {!loading && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatRow label="Всего сообщений" value={stats.total_messages} />
            <StatRow label="Входящих" value={stats.incoming_messages} />
            <StatRow label="Исходящих" value={stats.outgoing_messages} />
            <StatRow label="Команд (всего)" value={stats.total_commands} />
            <StatRow label="Команд (активных)" value={stats.active_commands} />
            {stats.last_message_at && (
              <StatRow label="Последнее сообщение" value={new Date(stats.last_message_at).toLocaleString('ru-RU')} />
            )}
          </div>
        )}
        {!loading && !stats && (
          <p style={{ textAlign: 'center', color: '#B0B4B8' }}>Нет данных</p>
        )}
      </ModalBase.Body>
    </ModalBase.Content>
  </ModalBase>
);

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#B0B4B8' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#000000' }}>{value}</span>
    </div>
  );
}

export default BotStatsModal;
