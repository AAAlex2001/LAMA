'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Input from '@/components/input/input';
import CurrencySelect from '@/components/currency-select';
import Toggle from '@/components/toggle/toggle';
import { ChevronDownIcon } from '@/components/icons';
import SearchBar from '@/components/search-bar/search-bar';
import DateInputPopover from './DateInputPopover';
import { useChannelsQuery } from '@/store/channels';
import { useBotsQuery } from '@/store/bots';
import type { AdRevenueCreatePayload } from '@/store/wallet';
import styles from './AddAdExpenseModal.module.scss';

interface AddAdExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AdRevenueCreatePayload) => Promise<void> | void;
}

interface PromotedTarget {
  kind: 'channel' | 'bot';
  id: number;
  label: string;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddAdExpenseModal({ isOpen, onClose, onSubmit }: AddAdExpenseModalProps) {
  const [buyer, setBuyer] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [channelUsername, setChannelUsername] = useState('');
  const [target, setTarget] = useState<PromotedTarget | null>(null);
  const [revenueDate, setRevenueDate] = useState(todayIso());
  const [postLink, setPostLink] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isAutoDelete, setIsAutoDelete] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const targetRef = useRef<HTMLDivElement>(null);

  const channelsQuery = useChannelsQuery();
  const botsQuery = useBotsQuery();

  const targets: PromotedTarget[] = useMemo(() => {
    const channels = (channelsQuery.data?.items ?? []).map<PromotedTarget>((c) => ({
      kind: 'channel',
      id: c.id,
      label: c.title,
    }));
    const bots = (botsQuery.data?.items ?? []).map<PromotedTarget>((b) => ({
      kind: 'bot',
      id: b.id,
      label: b.title || `@${b.username}`,
    }));
    return [...channels, ...bots];
  }, [channelsQuery.data, botsQuery.data]);

  const filteredTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.label.toLowerCase().includes(q));
  }, [targets, targetSearch]);

  useEffect(() => {
    if (!targetOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!targetRef.current?.contains(e.target as Node)) setTargetOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [targetOpen]);

  const handleSubmit = async () => {
    if (!amount) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type: 'expense',
        buyer: buyer.trim() || null,
        amount,
        currency,
        revenue_date: revenueDate,
        note: note.trim() || null,
        channel_username: channelUsername.trim() || null,
        post_link: postLink.trim() || null,
        channel_id: target?.kind === 'channel' ? target.id : null,
        bot_id: target?.kind === 'bot' ? target.id : null,
        is_pinned: isPinned,
        is_auto_delete: isAutoDelete,
        is_repeating: isRepeating,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="lg" padding="md" className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>Добавить рекламный расход</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Продавец</span>
              <Input value={buyer} onChange={setBuyer} placeholder="Введите текст" />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Цена покупки</span>
              <div className={styles.amountRow}>
                <Input value={amount} onChange={setAmount} placeholder="Введите сумму" />
                <CurrencySelect value={currency} onChange={setCurrency} />
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Канал размещения</span>
              <Input
                value={channelUsername}
                onChange={setChannelUsername}
                placeholder="Введите @username канала"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Продвигаемое сообщество</span>
              <div
                className={clsx(styles.targetWrap, targetOpen && styles.targetWrapOpen)}
                ref={targetRef}
              >
                {!targetOpen ? (
                  <button
                    type="button"
                    className={styles.targetTrigger}
                    onClick={() => setTargetOpen(true)}
                  >
                    <span className={target ? styles.targetValue : styles.targetPlaceholder}>
                      {target ? target.label : 'Выберите сообщество или бота'}
                    </span>
                    <span className={styles.targetArrow}>
                      <ChevronDownIcon width={16} height={16} color="#383F45" />
                    </span>
                  </button>
                ) : (
                  <div className={styles.targetExpanded}>
                    <button
                      type="button"
                      className={styles.targetHeader}
                      onClick={() => setTargetOpen(false)}
                    >
                      <span className={target ? styles.targetValue : styles.targetPlaceholder}>
                        {target ? target.label : 'Выберите сообщество или бота'}
                      </span>
                      <span className={clsx(styles.targetArrow, styles.targetArrowUp)}>
                        <ChevronDownIcon width={16} height={16} color="#383F45" />
                      </span>
                    </button>

                    <SearchBar
                      placeholder="Поиск"
                      value={targetSearch}
                      onChange={setTargetSearch}
                      className={styles.targetSearch}
                    />

                    <div className={styles.targetList}>
                      {filteredTargets.length === 0 ? (
                        <span className={styles.targetEmpty}>Нет совпадений</span>
                      ) : (
                        filteredTargets.map((t) => {
                          const checked = target?.kind === t.kind && target?.id === t.id;
                          return (
                            <button
                              key={`${t.kind}-${t.id}`}
                              type="button"
                              className={styles.targetOption}
                              role="option"
                              aria-selected={checked}
                              onClick={() => {
                                setTarget(t);
                                setTargetOpen(false);
                                setTargetSearch('');
                              }}
                            >
                              <span className={clsx(styles.targetRadio, checked && styles.targetRadioActive)}>
                                <span className={styles.targetRadioDot} />
                              </span>
                              <span className={styles.targetOptionLabel}>{t.label}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Дата публикации</span>
              <DateInputPopover value={revenueDate} onChange={setRevenueDate} />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Ссылка на публикацию</span>
              <Input value={postLink} onChange={setPostLink} placeholder="Ссылка.." />
            </div>

            <div className={clsx(styles.field, styles.fieldFull)}>
              <div className={styles.togglesRow}>
                <div className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>Закрепленный пост</span>
                  <Toggle checked={isPinned} onChange={setIsPinned} />
                </div>
                <div className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>Автоудаление</span>
                  <Toggle checked={isAutoDelete} onChange={setIsAutoDelete} />
                </div>
                <div className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>Повтор</span>
                  <Toggle checked={isRepeating} onChange={setIsRepeating} />
                </div>
              </div>
            </div>

            <div className={clsx(styles.field, styles.fieldFull)}>
              <span className={styles.label}>Примечание</span>
              <Input
                value={note}
                onChange={setNote}
                placeholder="Введите примечание для учета рекламных расходов..."
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="outline"
              intent="gradient"
              size="lg"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: '1 1 0', justifyContent: 'center' }}
            >
              Отменить
            </Button>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              onClick={handleSubmit}
              disabled={!amount || submitting}
              loading={submitting}
              style={{ flex: '1 1 0', justifyContent: 'center' }}
            >
              Добавить расход
            </Button>
          </div>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
}
