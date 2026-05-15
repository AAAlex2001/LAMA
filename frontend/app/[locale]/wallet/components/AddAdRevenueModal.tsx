'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Input from '@/components/input/input';
import PostSourcePanel from './PostSourcePanel';
import AttachedPostCard from './AttachedPostCard';
import CurrencySelect from '@/components/currency-select';
import DateInputPopover from './DateInputPopover';
import type { Draft } from '@/types/post';
import { AdRevenueCreatePayload, AdRevenueType } from '@/store/wallet';
import styles from './AddAdRevenueModal.module.scss';

interface AddAdRevenueModalProps {
  isOpen: boolean;
  type: AdRevenueType;
  onClose: () => void;
  onSubmit: (payload: AdRevenueCreatePayload) => Promise<void> | void;
}

const TITLE_BY_TYPE: Record<AdRevenueType, string> = {
  income: 'Добавить рекламный доход',
  expense: 'Добавить рекламный расход',
};

const SUBMIT_BY_TYPE: Record<AdRevenueType, string> = {
  income: 'Добавить рекламу',
  expense: 'Добавить расход',
};

const AMOUNT_LABEL_BY_TYPE: Record<AdRevenueType, string> = {
  income: 'Цена продажи',
  expense: 'Сумма расхода',
};

const DATE_LABEL_BY_TYPE: Record<AdRevenueType, string> = {
  income: 'Дата дохода',
  expense: 'Дата расхода',
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddAdRevenueModal({ isOpen, type, onClose, onSubmit }: AddAdRevenueModalProps) {
  const [buyer, setBuyer] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [revenueDate, setRevenueDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [attachedPost, setAttachedPost] = useState<Draft | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type,
        buyer: buyer.trim() || null,
        amount,
        currency,
        revenue_date: revenueDate,
        note: note.trim() || null,
        publication_id: attachedPost?.id ?? null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostSelect = (draft: Draft) => {
    setAttachedPost(draft);
    setAttachOpen(false);
  };

  const handlePostRemove = () => {
    setAttachedPost(null);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content
        size={attachOpen ? 'xl' : 'lg'}
        padding="md"
        className={attachOpen ? styles.wideContent : styles.content}
      >
        <div className={styles.layout}>
          <div className={styles.formColumn}>
            <h2 className={styles.title}>{TITLE_BY_TYPE[type]}</h2>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <span className={styles.label}>Покупатель</span>
                <Input value={buyer} onChange={setBuyer} placeholder="Введите никнейм" />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>{AMOUNT_LABEL_BY_TYPE[type]}</span>
                <div className={styles.amountRow}>
                  <Input value={amount} onChange={setAmount} placeholder="Введите сумму" />
                  <CurrencySelect value={currency} onChange={setCurrency} />
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>{DATE_LABEL_BY_TYPE[type]}</span>
                <DateInputPopover value={revenueDate} onChange={setRevenueDate} />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>&nbsp;</span>
                <Button
                  variant="outline"
                  intent="gradient"
                  size="lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setAttachOpen((v) => !v)}
                >
                  {attachedPost ? 'Сменить прикреплённый пост' : 'Прикрепить рекламный пост'}
                </Button>
              </div>

              {attachedPost && (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.label}>Прикреплённый пост</span>
                  <AttachedPostCard post={attachedPost} onRemove={handlePostRemove} />
                </div>
              )}

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Примечание</span>
                <Input
                  value={note}
                  onChange={setNote}
                  placeholder="Введите примечание для учета рекламных доходов..."
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
                {SUBMIT_BY_TYPE[type]}
              </Button>
            </div>
          </div>

          {attachOpen && (
            <PostSourcePanel
              onClose={() => setAttachOpen(false)}
              onSelect={handlePostSelect}
            />
          )}
        </div>

      </ModalBase.Content>
    </ModalBase>
  );
}
