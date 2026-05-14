'use client';

import LinkIcon from '@/components/icons/link-icon';
import AdTypeIcons from './AdTypeIcons';
import { Ad } from './AdCard';
import styles from './AdsTable.module.scss';

interface Column {
  key: string;
  label: string;
  center?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'date', label: 'Дата' },
  { key: 'community', label: 'Сообщество' },
  { key: 'price', label: 'Цена' },
  { key: 'buyer', label: 'Покупатель' },
  { key: 'post', label: 'Публикация' },
  { key: 'type', label: 'Тип', center: true },
  { key: 'link', label: 'Ссылка', center: true },
  { key: 'comments', label: 'Комментарии', center: true },
  { key: 'views', label: 'Просмотры', center: true },
  { key: 'clicks', label: 'Клики', center: true },
  { key: 'reactions', label: 'Реакции', center: true },
];

interface AdsTableProps {
  ads: Ad[];
}

export default function AdsTable({ ads }: AdsTableProps) {
  return (
    <div className={styles.tableWrap}>
      <div className={styles.headerRow}>
        {COLUMNS.map((col, idx) => (
          <div
            key={col.key}
            className={styles[`col_${col.key}`]}
            style={{
              borderLeft: idx === 0 ? 'none' : '1px solid #F0F4FA',
              textAlign: col.center ? 'center' : 'left',
            }}
          >
            <span className={styles.headerLabel}>{col.label}</span>
          </div>
        ))}
      </div>

      {ads.map((ad) => (
        <div key={ad.id} className={styles.dataRow}>
          <div className={styles.col_date}>
            <span className={styles.dateText}>{ad.date}</span>
          </div>
          <div className={styles.col_community}>
            <span className={styles.community}>{ad.title}</span>
          </div>
          <div className={styles.col_price}>
            <span className={styles.price}>{ad.amount}</span>
          </div>
          <div className={styles.col_buyer}>
            <span className={styles.buyer}>{ad.username || ad.buyer}</span>
          </div>
          <div className={styles.col_post}>
            {ad.postLink ? (
              <a
                href={ad.postLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.postLink}
              >
                {ad.postLink.startsWith('@') ? ad.postLink : `@${ad.postLink.replace(/^https?:\/\//, '')}`}
              </a>
            ) : (
              <span className={styles.empty}>—</span>
            )}
          </div>
          <div className={styles.col_type}>
            <AdTypeIcons types={ad.types} />
          </div>
          <div className={styles.col_link}>
            {ad.postLink ? (
              <a
                href={ad.postLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Открыть пост"
                className={styles.linkIcon}
              >
                <LinkIcon width={14} height={14} color="#B0B4B8" />
              </a>
            ) : (
              <span className={styles.empty}>—</span>
            )}
          </div>
          <div className={styles.col_comments}>
            <span className={styles.metric}>{ad.metrics.comments}</span>
          </div>
          <div className={styles.col_views}>
            <span className={styles.metric}>{ad.metrics.views}</span>
          </div>
          <div className={styles.col_clicks}>
            <span className={styles.metric}>{ad.metrics.clicks}</span>
          </div>
          <div className={styles.col_reactions}>
            <span className={styles.metric}>{ad.metrics.likes}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
