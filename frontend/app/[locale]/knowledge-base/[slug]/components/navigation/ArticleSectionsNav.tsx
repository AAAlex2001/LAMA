'use client';

import { useEffect, useRef, useState } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import type { KnowledgeArticle } from '../../types';
import { slugify } from '../slugify';
import styles from './ArticleSectionsNav.module.scss';

function GrayDot() {
  return <span className={styles.grayDot} />;
}

function InfoDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 9.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 1.5 0v3.75ZM8 6a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"
        fill="#3B82F6"
      />
    </svg>
  );
}

export default function ArticleSectionsNav({ article }: { article: KnowledgeArticle }) {
  const ids = article.sections
    .filter((s) => 'title' in s && typeof s.title === 'string' && s.title.length > 0)
    .map((s) => ({ id: slugify((s as { title: string }).title), title: (s as { title: string }).title }));

  const idsRef = useRef(ids);
  idsRef.current = ids;

  const [activeId, setActiveId] = useState(ids[0]?.id ?? '');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (skipRef.current) return;
      let found = '';
      for (const h of idsRef.current) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 150) found = h.id;
      }
      if (found) setActiveId(found);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    skipRef.current = true;
    setActiveId(id);
    const scrollEl = document.scrollingElement || document.documentElement;
    const y = el.getBoundingClientRect().top + scrollEl.scrollTop - 110;
    scrollEl.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(() => { skipRef.current = false; }, 1000);
  };

  if (!ids.length) return null;

  return (
    <div className={styles.col}>
      <nav className={styles.nav} aria-label="Разделы статьи">
        <div className={styles.frame}>
          <div className={styles.list}>
            {ids.map((h) => (
              <button
                key={h.id}
                type="button"
                className={styles.item}
                onClick={() => handleClick(h.id)}
                onMouseEnter={() => setHoverId(h.id)}
                onMouseLeave={() => setHoverId((v) => (v === h.id ? null : v))}
              >
                {h.id === activeId ? <InfoDot /> : <GrayDot />}
                <Tooltip text={h.title} placement="left" visible={hoverId === h.id} />
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
