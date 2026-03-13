'use client';

import { useState } from 'react';
import styles from './media-preview.module.scss';
import type { MediaPreviewItem } from '../store';
import PlayIcon from '@/components/icons/play-icon';

export interface MediaPreviewProps {
  items: MediaPreviewItem[];
}

export default function MediaPreview({ items }: MediaPreviewProps) {
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const handleMediaError = (id: string) => {
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const renderTile = (
    item: MediaPreviewItem,
    className?: string,
    size: 'big' | 'small' = 'small'
  ) => {
    const isVideo = item.type === 'video';
    const hasVideoThumbnail = isVideo && item.thumbnailUrl;
    const isBroken = brokenIds.has(item.id);

    const tile = isBroken ? (
      <div className={styles.brokenPlaceholder} />
    ) : isVideo && !item.thumbnailUrl ? (
        <video
          className={styles.video}
          src={item.url}
          muted
          playsInline
          preload="metadata"
          style={{ filter: item.blur ? 'blur(20px)' : 'none' }}
          onError={() => handleMediaError(item.id)}
        />
      ) : (
        <img
          src={hasVideoThumbnail ? item.thumbnailUrl : item.url}
          alt=""
          className={styles.image}
          style={{ filter: item.blur ? 'blur(20px)' : 'none' }}
          loading="lazy"
          decoding="async"
          onError={() => handleMediaError(item.id)}
        />
      );

    return (
      <div
        className={`${styles.tile} ${isVideo ? styles.tileVideo : ''} ${className || ''}`}
      >
        {tile}
        {isVideo && (
          <div
            className={`${styles.playOverlay} ${
              size === 'big' ? styles.playOverlayBig : styles.playOverlaySmall
            }`}
          >
            <div className={styles.playBadge}>
              <PlayIcon
                width={size === 'big' ? 28 : 22}
                height={size === 'big' ? 28 : 22}
                color="#1E1E1E"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1 медиа — одна большая картинка 16:9
  if (items.length === 1) {
    const item = items[0];
    if (!item.url) return null;
    return (
      <div className={styles.single}>
        {renderTile(item, styles.singleItem, 'big')}
      </div>
    );
  }

  const isVideoFirst = items[0]?.type === 'video';
  const rightItems = items.slice(1);
  const isVideoWithPhotosColumn =
    isVideoFirst &&
    rightItems.length > 0 &&
    rightItems.length <= 3;

  if (isVideoWithPhotosColumn) {
    return (
      <div className={styles.videoWithPhotos}>
        <div className={styles.videoColumn}>
          {renderTile(items[0], styles.videoColumnItem, 'big')}
        </div>
        <div className={`${styles.photoColumn} ${styles[`photoCount${rightItems.length}`]}`}>
          {rightItems.map((item) => (
            <div key={item.id} className={styles.photoTile}>
              {renderTile(item, undefined, 'small')}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2 медиа — два квадрата рядом
  if (items.length === 2) {
    if (!items[0].url || !items[1].url) return null;
    return (
      <div className={styles.dual}>
        {renderTile(items[0], styles.dualItem, 'small')}
        {renderTile(items[1], styles.dualItem, 'small')}
      </div>
    );
  }

  // 3+ медиа — первый большой + грид снизу
  const main = items[0];
  if (!main.url) return null;

  const thumbs = items.slice(1);

  return (
    <div className={styles.block}>
      <div className={styles.main}>{renderTile(main, undefined, 'big')}</div>

      {thumbs.length > 0 && (
        <div className={styles.grid}>
          {thumbs.map((item) => {
            if (!item.url) return <div key={item.id} className={styles.gridTile} />;
            return (
              <div key={item.id} className={styles.gridTile}>
                {renderTile(item, undefined, 'small')}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
