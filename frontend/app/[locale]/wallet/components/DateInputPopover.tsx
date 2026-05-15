'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import DatePicker from '@/components/date-picker/date-picker';
import { CalendarIcon } from '@/components/icons';
import styles from './DateInputPopover.module.scss';

interface DateInputPopoverProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatRu(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return '';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${parsed.getFullYear()}`;
}

export default function DateInputPopover({ value, onChange, placeholder = 'ДД.ММ.ГГГГ' }: DateInputPopoverProps) {
  const [open, setOpen] = useState(false);
  const display = formatRu(value);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <span className={display ? styles.value : styles.placeholder}>
          {display || placeholder}
        </span>
        <CalendarIcon width={20} height={20} color="#1E1E1E" />
      </button>

      <ModalBase isOpen={open} onOpenChange={setOpen}>
        <ModalBase.Content size="sm" padding="md" className={styles.modal}>
          <DatePicker
            value={parseIso(value)}
            onChange={(date) => {
              onChange(toIso(date));
              setOpen(false);
            }}
            locale="ru"
            minDate={null}
            className={styles.calendar}
          />
        </ModalBase.Content>
      </ModalBase>
    </>
  );
}
