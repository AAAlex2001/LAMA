'use client';

import { useEffect, useRef, useState } from 'react';
import type { Draft } from '@/types/post';
import DraftContentIcons from './DraftContentIcons';
import DraftCardActions from './DraftCardActions';
import Loader from '@/components/loader';
import styles from './draft-card.module.scss';

interface DraftCardProps {
  draft: Draft;
  onPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function formatDraftDate(dateStr: string): { time: string; date: string } {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(2);
  return {
    time: `${hours}:${minutes}`,
    date: `${day}.${month}.${year}`,
  };
}

function getDraftPreviewHtml(draft: Draft): string {
  return draft.formatted_content?.html
    || draft.formatted_content?.text
    || draft.text_content
    || '';
}

function getThumbnail(draft: Draft): string | null {
  if (draft.media_thumbnail_urls?.length) {
    const thumb = draft.media_thumbnail_urls.find(u => u);
    if (thumb) return thumb;
  }
  if (draft.media_urls?.length) {
    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    const imageUrl = draft.media_urls.find(url => {
      const ext = url.split('.').pop()?.toLowerCase() || '';
      return imageExts.includes(ext);
    });
    if (imageUrl) return imageUrl;
  }
  return null;
}

export default function DraftCard({
  draft,
  onPreview,
  onShare,
  onDelete,
  onEdit,
}: DraftCardProps) {
  const { time, date } = formatDraftDate(draft.updated_at || draft.created_at);
  const previewHtml = getDraftPreviewHtml(draft);
  const thumbnail = getThumbnail(draft);
  const isSeries = (draft.series_count ?? 0) > 1;
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setThumbnailLoaded(false);
    setThumbnailError(false);
    const timerId = window.setTimeout(() => {
      if (imgRef.current?.complete) {
        setThumbnailLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [thumbnail]);

  return (
    <div className={styles.card}>
      <div className={styles.topSection}>
        <div className={styles.dateRow}>
          <span className={styles.time}>{time}</span>
          <span className={styles.date}>{date}</span>
          {isSeries && <span className={styles.seriesBadge}>Серия · {draft.series_count}</span>}
        </div>

        {draft.tags && draft.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {draft.tags.map(tag => (
              <span
                key={tag.id}
                className={styles.tag}
                style={{ backgroundColor: tag.color || '#B8DBF1' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className={styles.previewRow}>
          {previewHtml.trim().length > 0 && (
            <div
              className={styles.preview}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
          {thumbnail && (
            <div className={styles.thumbnail}>
              {!thumbnailLoaded && !thumbnailError && (
                <div className={styles.thumbnailLoader}>
                  <Loader size={18} color="blue" />
                </div>
              )}
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                ref={imgRef}
                onLoad={() => setThumbnailLoaded(true)}
                onError={() => {
                  setThumbnailError(true);
                  setThumbnailLoaded(true);
                }}
                style={{ opacity: thumbnailLoaded ? 1 : 0 }}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.bottomSection}>
        <DraftContentIcons draft={draft} />
        <DraftCardActions
          onPreview={onPreview}
          onShare={onShare}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}
