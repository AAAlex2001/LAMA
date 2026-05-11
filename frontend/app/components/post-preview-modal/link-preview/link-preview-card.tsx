'use client';

import { useEffect, useState } from 'react';
import Loader from '@/components/loader';
import styles from './link-preview-card.module.scss';

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string;
  site_name: string;
  favicon: string;
}

interface LinkPreviewCardProps {
  url: string;
  token?: string;
}

export default function LinkPreviewCard({ url, token }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(
          `${apiBase}/link-preview?url=${encodeURIComponent(url)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );

        if (!response.ok) throw new Error('Failed to fetch preview');

        const data = await response.json();
        setPreview(data);
        setError(false);
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url, token, apiBase]);

  if (loading) {
    return (
      <div className={styles.linkPreviewCard}>
        <div className={styles.loading}><Loader size={18} color="blue" /></div>
      </div>
    );
  }

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  let displayUrl = url;
  try {
    displayUrl = new URL(url).hostname.replace('www.', '');
  } catch {
    displayUrl = url;
  }

  const fallbackPreview: LinkPreviewData = {
    url,
    title: displayUrl,
    description: '',
    image: '',
    site_name: displayUrl,
    favicon: '',
  };

  const data = !error && preview ? preview : fallbackPreview;

  return (
    <div className={styles.linkPreviewCard} onClick={handleClick}>
      {data.image && (
        <img
          src={data.image}
          alt={data.title}
          className={styles.linkImage}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className={styles.linkContent}>
        {data.title && <h4 className={styles.linkTitle}>{data.title}</h4>}
        {data.description && (
          <p className={styles.linkDescription}>{data.description}</p>
        )}
        <div className={styles.linkUrl}>
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className={styles.favicon}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span>{data.site_name || displayUrl}</span>
        </div>
      </div>
    </div>
  );
}
