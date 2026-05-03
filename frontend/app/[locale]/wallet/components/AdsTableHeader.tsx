'use client';

import styles from './AdsTableHeader.module.scss';

const COLUMNS = ['Сообщество', 'Покупатель', 'Доход', 'Просмотры', 'Клики', 'Ссылка'];

export default function AdsTableHeader() {
  return (
    <div className={styles.row}>
      {COLUMNS.map((label, idx) => (
        <span key={label} className={idx === 0 ? styles.firstCol : styles.col}>
          {label}
        </span>
      ))}
    </div>
  );
}
