'use client';

import { useState, useMemo, type ReactNode, type CSSProperties } from 'react';
import classNames from 'classnames';
import UserIcon from '@/components/icons/user-icon';
import styles from './avatar.module.scss';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  fallback?: ReactNode;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0] ?? '';
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '');
}

export default function Avatar({
  src,
  name,
  size = 40,
  fallback,
  alt = '',
  className,
  style,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasSrc = !!src && !imgError;
  const showImage = hasSrc && imgLoaded;

  const initials = useMemo(() => (name ? getInitials(name) : ''), [name]);

  const fontSize = Math.round(size * 0.4);

  const renderFallback = () => {
    if (fallback) return fallback;
    if (initials) {
      return (
        <span className={styles.initials} style={{ fontSize }}>
          {initials}
        </span>
      );
    }
    const iconSize = Math.round(size * 0.55);
    return <UserIcon width={iconSize} height={iconSize} color="#B0B4B8" />;
  };

  return (
    <div
      className={classNames(styles.avatar, className)}
      style={{ width: size, height: size, ...style }}
    >
      {!showImage && renderFallback()}
      {hasSrc && (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={showImage ? undefined : { position: 'absolute', opacity: 0 }}
        />
      )}
    </div>
  );
}
