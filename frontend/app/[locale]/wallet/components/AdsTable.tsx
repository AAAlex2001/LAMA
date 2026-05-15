'use client';

import LinkIcon from '@/components/icons/link-icon';
import AdTypeIcons from './AdTypeIcons';
import { Ad, AdPlacement } from './AdCard';
import styles from './AdsTable.module.scss';

interface Column {
  key: string;
  label: string;
  center?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'date',       label: 'Дата' },
  { key: 'community',  label: 'Сообщество' },
  { key: 'price',      label: 'Цена' },
  { key: 'buyer',      label: 'Покупатель' },
  { key: 'post',       label: 'Публикация' },
  { key: 'type',       label: 'Тип',         center: true },
  { key: 'link',       label: 'Ссылка',      center: true },
  { key: 'comments',   label: 'Комментарии', center: true },
  { key: 'views',      label: 'Просмотры',   center: true },
  { key: 'clicks',     label: 'Клики',       center: true },
  { key: 'reactions',  label: 'Реакции',     center: true },
];

interface AdsTableProps {
  ads: Ad[];
  onShowPlacements?: (placements: AdPlacement[]) => void;
}

export default function AdsTable({ ads, onShowPlacements }: AdsTableProps) {
  return (
    <div className={styles.tableWrap}>
      <div className={styles.headerRow}>
        {COLUMNS.map((col, idx) => (
          <div
            key={col.key}
            className={styles[`col_${col.key}`]}
            style={{
              borderLeft: idx === 0 ? 'none' : '1px solid #F0F4FA',
              justifyContent: col.center ? 'center' : 'flex-start',
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
            <CommunityCell ad={ad} onShowPlacements={onShowPlacements} />
          </div>
          <div className={styles.col_price}>
            <span className={styles.price}>{ad.amount}</span>
          </div>
          <div className={styles.col_buyer}>
            <span className={styles.buyer}>{ad.buyer || '—'}</span>
          </div>
          <div className={styles.col_post}>
            <PublicationCell ad={ad} onShowPlacements={onShowPlacements} />
          </div>
          <div className={styles.col_type}>
            <AdTypeIcons types={ad.types} />
          </div>
          <div className={styles.col_link}>
            <LinksCell ad={ad} onShowPlacements={onShowPlacements} />
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
            <span className={styles.metric}>{ad.metrics.reactions}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CellProps {
  ad: Ad;
  onShowPlacements?: (placements: AdPlacement[]) => void;
}

function CommunityCell({ ad, onShowPlacements }: CellProps) {
  const placements = ad.placements ?? [];
  if (placements.length === 0) {
    return <span className={styles.community}>{ad.title || '—'}</span>;
  }
  const first = placements[0];
  const extraCount = placements.length - 1;
  return (
    <div className={styles.communityCell}>
      <span className={styles.community} title={placements.map((p) => p.title).join(', ')}>
        {first.title}
      </span>
      {extraCount > 0 && (
        <button
          type="button"
          className={styles.communityExtra}
          onClick={() => onShowPlacements?.(placements)}
        >
          +{extraCount}
        </button>
      )}
    </div>
  );
}

function PublicationCell({ ad, onShowPlacements }: CellProps) {
  const placements = ad.placements ?? [];
  if (placements.length === 0) return <span className={styles.empty}>—</span>;

  const handles = placements
    .map((p) => (p.username ? `@${p.username.replace(/^@/, '')}` : ''))
    .filter(Boolean);
  if (handles.length === 0) return <span className={styles.empty}>—</span>;

  const first = handles[0];
  const extraCount = handles.length - 1;
  const link = placements[0].postLink;
  const title = handles.join(', ');

  if (extraCount > 0) {
    return (
      <button
        type="button"
        className={styles.postLink}
        title={title}
        onClick={() => onShowPlacements?.(placements)}
      >
        {first} +{extraCount}
      </button>
    );
  }
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={styles.postLink} title={title}>
      {first}
    </a>
  ) : (
    <span className={styles.postLink} title={title}>{first}</span>
  );
}

function LinksCell({ ad, onShowPlacements }: CellProps) {
  const placements = ad.placements ?? [];
  const links = placements.map((p) => p.postLink).filter((l): l is string => Boolean(l));
  if (links.length === 0 && !ad.postLink) return <span className={styles.empty}>—</span>;

  const extra = Math.max(links.length - 1, 0);
  if (extra > 0) {
    return (
      <button
        type="button"
        className={styles.linksCell}
        onClick={() => onShowPlacements?.(placements)}
        title={links.join('\n')}
        aria-label={`Открыть список ссылок (${links.length})`}
      >
        <LinkIcon width={14} height={14} color="#B0B4B8" />
        <span className={styles.linksExtra}>+{extra}</span>
      </button>
    );
  }
  const single = links[0] || ad.postLink || '';
  return (
    <div className={styles.linksCell}>
      <a
        href={single}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Открыть пост"
        className={styles.linkIcon}
      >
        <LinkIcon width={14} height={14} color="#B0B4B8" />
      </a>
    </div>
  );
}
