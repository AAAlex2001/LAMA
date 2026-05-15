'use client';

import { useEffect, useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Input from '@/components/input/input';
import CurrencySelect from '@/components/currency-select';
import DateInputPopover from './DateInputPopover';
import type { AdRevenue, AdRevenueUpdatePayload } from '@/store/wallet';
import styles from './EditAdRevenueModal.module.scss';

interface EditAdRevenueModalProps {
  item: AdRevenue;
  onClose: () => void;
  onSave: (id: number, payload: AdRevenueUpdatePayload) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
}

const TITLE_BY_TYPE = {
  income: 'Изменить рекламный доход',
  expense: 'Изменить рекламный расход',
} as const;

const AMOUNT_LABEL_BY_TYPE = {
  income: 'Цена продажи',
  expense: 'Сумма расхода',
} as const;

const DATE_LABEL_BY_TYPE = {
  income: 'Дата дохода',
  expense: 'Дата расхода',
} as const;

export default function EditAdRevenueModal({ item, onClose, onSave, onDelete }: EditAdRevenueModalProps) {
  const [buyer, setBuyer] = useState(item.buyer ?? '');
  const [amount, setAmount] = useState(String(item.amount ?? ''));
  const [currency, setCurrency] = useState(item.currency || 'RUB');
  const [revenueDate, setRevenueDate] = useState(item.revenue_date || '');
  const [note, setNote] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setBuyer(item.buyer ?? '');
    setAmount(String(item.amount ?? ''));
    setCurrency(item.currency || 'RUB');
    setRevenueDate(item.revenue_date || '');
    setNote(item.note ?? '');
  }, [item]);

  const handleSave = async () => {
    if (!amount) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        buyer: buyer.trim() || null,
        amount,
        currency,
        revenue_date: revenueDate,
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalBase isOpen onOpenChange={(open) => !open && onClose()}>
      <ModalBase.Content size="lg" padding="md" className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>{TITLE_BY_TYPE[item.type]}</h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Покупатель</span>
              <Input value={buyer} onChange={setBuyer} placeholder="Введите никнейм" />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{AMOUNT_LABEL_BY_TYPE[item.type]}</span>
              <div className={styles.amountRow}>
                <Input value={amount} onChange={setAmount} placeholder="Введите сумму" />
                <CurrencySelect value={currency} onChange={setCurrency} />
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{DATE_LABEL_BY_TYPE[item.type]}</span>
              <DateInputPopover value={revenueDate} onChange={setRevenueDate} />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Примечание</span>
              <Input value={note} onChange={setNote} placeholder="Введите примечание" />
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="outline"
              intent="destructive"
              size="lg"
              onClick={handleDelete}
              disabled={saving || deleting}
              loading={deleting}
              style={{ flex: '0 0 auto', justifyContent: 'center' }}
            >
              Удалить
            </Button>
            <Button
              variant="outline"
              intent="gradient"
              size="lg"
              onClick={onClose}
              disabled={saving || deleting}
              style={{ flex: '1 1 0', justifyContent: 'center' }}
            >
              Отменить
            </Button>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              onClick={handleSave}
              disabled={!amount || saving || deleting}
              loading={saving}
              style={{ flex: '1 1 0', justifyContent: 'center' }}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
}
