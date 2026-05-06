'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import AttachPostSourceModal, { PostSource } from './AttachPostSourceModal';
import { AdRevenueCreatePayload, AdRevenueType } from '../store/types';
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddAdRevenueModal({ isOpen, type, onClose, onSubmit }: AddAdRevenueModalProps) {
  const [buyer, setBuyer] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [revenueDate, setRevenueDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [publicationId, setPublicationId] = useState<number | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAttach = (_source: PostSource) => {
    // TODO: open post picker by selected source; пока сохраняем фейковый id-маркер
    setPublicationId(null);
  };

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
        publication_id: publicationId,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="lg" padding="md" className={styles.content}>
        <h2 className={styles.title}>{TITLE_BY_TYPE[type]}</h2>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Покупатель</label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="Введите текст"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{type === 'income' ? 'Цена продажи' : 'Сумма расхода'}</label>
            <div className={styles.amountRow}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Введите сумму"
                className={styles.input}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={styles.currencySelect}
              >
                <option value="RUB">РУБ</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Дата дохода</label>
            <input
              type="date"
              value={revenueDate}
              onChange={(e) => setRevenueDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>&nbsp;</label>
            <button
              type="button"
              className={styles.attachBtn}
              onClick={() => setAttachOpen(true)}
            >
              {publicationId ? 'Пост прикреплён' : 'Прикрепить рекламный пост'}
            </button>
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Примечание</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Введите примечание для учета рекламных доходов..."
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Отменить
          </button>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            onClick={handleSubmit}
            disabled={!amount || submitting}
            loading={submitting}
            className={styles.submitBtn}
          >
            {SUBMIT_BY_TYPE[type]}
          </Button>
        </div>

        <AttachPostSourceModal
          isOpen={attachOpen}
          onClose={() => setAttachOpen(false)}
          onAttach={handleAttach}
        />
      </ModalBase.Content>
    </ModalBase>
  );
}
