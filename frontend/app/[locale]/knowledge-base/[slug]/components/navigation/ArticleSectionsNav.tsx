'use client';

import { useEffect, useRef, useState } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import type { ArticleSection, KnowledgeArticle } from '../../mock';
import { slugify } from '../slugify';
import styles from './ArticleSectionsNav.module.scss';

type Heading = { id: string; title: string };

const hasTitle = (s: ArticleSection): s is Extract<ArticleSection, { title?: string }> & { title: string } =>
  'title' in s && typeof s.title === 'string' && s.title.length > 0;

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
  const headings: Heading[] = article.sections
    .filter(hasTitle)
    .map((s) => ({ id: slugify(s.title), title: s.title }));

  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = headings[0] ? document.getElementById(headings[0].id) : null;
    const col = colRef.current;
    if (first && col) {
      const parent = (col.offsetParent as HTMLElement) || document.body;
      const firstRect = first.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      setTopOffset(firstRect.top - parentRect.top);
    }
  }, [headings]);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  if (!headings.length) return null;

  return (
    <div
      ref={colRef}
      className={styles.col}
      style={topOffset !== null ? { top: `${topOffset}px` } : undefined}
    >
      <nav className={styles.nav} aria-label="Разделы статьи">
        <div className={styles.frame}>
          <div className={styles.list}>
            {headings.map((h) => {
              const isActive = h.id === activeId;
              return (
                <button
                  key={h.id}
                  type="button"
                  className={styles.item}
                  onClick={() => handleClick(h.id)}
                  onMouseEnter={() => setHoverId(h.id)}
                  onMouseLeave={() => setHoverId((v) => (v === h.id ? null : v))}
                >
                  {isActive ? <InfoDot /> : <GrayDot />}
                  <Tooltip text={h.title} placement="left" visible={hoverId === h.id} />
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
