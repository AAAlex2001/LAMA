'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/store/api';
import type { Draft, DraftListResponse } from '@/types/post';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import PostAccordion from '@/components/post-accordion/post-accordion';
import CalendarCard from '@/app/[locale]/calendar/shared/CalendarCard';
import createPostStyles from '../../create-post/create-post.module.scss';
import styles from './series-drafts.module.scss';

function sortSeriesDrafts(items: Draft[]): Draft[] {
  return [...items].sort((a, b) => {
    const ao = a.series_order ?? a.id;
    const bo = b.series_order ?? b.id;
    return ao - bo;
  });
}

export default function SeriesDraftsPageView() {
  const params = useParams();
  const router = useRouter();
  const locale = typeof params?.locale === 'string' ? params.locale : 'ru';
  const rawId = params?.seriesId;
  const seriesId = typeof rawId === 'string' ? Number.parseInt(rawId, 10) : NaN;
  const [openIndex, setOpenIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['drafts-series', seriesId],
    enabled: Number.isFinite(seriesId) && seriesId > 0,
    queryFn: async () => {
      const qs = new URLSearchParams({
        status: 'draft',
        series_id: String(seriesId),
        page_size: '200',
        sort_order: 'asc',
        date_mode: 'updated',
      });
      return apiRequest<DraftListResponse>(`/publications?${qs}`);
    },
  });

  const rows = data?.items ? sortSeriesDrafts(data.items) : [];

  const goEdit = (draftId: number) => {
    router.push(`/${locale}/edit-draft?draft=${draftId}`);
  };

  if (!Number.isFinite(seriesId) || seriesId <= 0) {
    return (
      <div className={styles.pageInner}>
        <p className={styles.error}>Некорректная ссылка на серию.</p>
        <Button text="К черновикам" showArrow={false} onClick={() => router.push(`/${locale}/drafts`)} />
      </div>
    );
  }

  return (
    <div className={styles.pageInner}>
      <div className={styles.topBar}>
        <Button
          text="← К списку черновиков"
          showArrow={false}
          onClick={() => router.push(`/${locale}/drafts`)}
        />
      </div>
      <div>
        <p className={styles.subtitle}>
          Серия · id {seriesId}
          {rows.length > 0 ? ` · ${rows.length} постов` : null}
        </p>
      </div>

      {isLoading && (
        <div className={styles.empty}>
          <Loader size={28} color="blue" />
        </div>
      )}

      {isError && (
        <p className={styles.error}>
          {error instanceof Error ? error.message : 'Не удалось загрузить серию'}
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className={styles.empty}>В этой серии нет черновиков или серия недоступна.</div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className={createPostStyles.seriesList}>
          {rows.map((draft, index) => (
            <PostAccordion
              key={draft.id}
              title={`Пост ${index + 1}`}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex((prev) => (prev === index ? -1 : index))}
            >
              {openIndex === index && (
                <div className={styles.accordionCard}>
                  <CalendarCard
                    post={draft}
                    listMode
                    onEdit={() => goEdit(draft.id)}
                  />
                </div>
              )}
            </PostAccordion>
          ))}
        </div>
      )}
    </div>
  );
}
