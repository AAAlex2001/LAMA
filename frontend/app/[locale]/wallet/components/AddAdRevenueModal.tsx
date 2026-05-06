'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Input from '@/components/input/input';
import AttachPostSourceModal, { PostSource } from './AttachPostSourceModal';
import PostPickerModal from './PostPickerModal';
import CurrencySelect from './CurrencySelect';
import DateInputPopover from './DateInputPopover';
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
  const [publicationId, setPublicationId] = useState<number | null>(null);
  const [publicationLabel, setPublicationLabel] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pickerSource, setPickerSource] = useState<PostSource | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAttach = (source: PostSource) => {
    setPickerSource(source);
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
            <span className={styles.label}>Покупатель</span>
            <Input value={buyer} onChange={setBuyer} placeholder="Введите текст" />
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
              onClick={() => setAttachOpen(true)}
            >
              {publicationLabel ?? 'Прикрепить рекламный пост'}
            </Button>
          </div>

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

        <AttachPostSourceModal
          isOpen={attachOpen}
          onClose={() => setAttachOpen(false)}
          onAttach={handleAttach}
        />

        {pickerSource && (
          <PostPickerModal
            isOpen
            source={pickerSource}
            onClose={() => setPickerSource(null)}
            onSelect={(pub) => {
              setPublicationId(pub.id);
              setPublicationLabel(
                (pub.text || '').trim().slice(0, 40) || `Пост #${pub.id}`,
              );
            }}
          />
        )}
      </ModalBase.Content>
    </ModalBase>
  );
}
