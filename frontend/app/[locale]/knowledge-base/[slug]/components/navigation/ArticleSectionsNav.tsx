'use client';

import { useEffect, useRef, useState } from 'react';
import Tooltip from '@/components/tooltip/tooltip';
import type { KnowledgeArticle } from '../../types';
import { slugify } from '../slugify';
import styles from './ArticleSectionsNav.module.scss';

type NavEntry = { id: string; title: string; level: 'main' | 'sub' };

function ActiveIcon() {
  return (
    <svg
      className={styles.activeIcon}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#3B82F6"
        d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 11.25a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0v4.25ZM8 5.4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
      />
    </svg>
  );
}

function MainDot() {
  return <span className={styles.mainDot} />;
}

function SubDot() {
  return <span className={styles.subDot} />;
}

export default function ArticleSectionsNav({ article }: { article: KnowledgeArticle }) {
  const entries: NavEntry[] = article.sections
    .filter((s) => 'title' in s && typeof s.title === 'string' && s.title.length > 0)
    .map((s) => {
      const titled = s as { title: string; titleLevel?: 'h1' | 'h3' };
      return {
        id: slugify(titled.title),
        title: titled.title,
        level: titled.titleLevel === 'h1' ? 'main' : 'sub',
      };
    });

  const idsRef = useRef(entries);
  idsRef.current = entries;

  const [activeId, setActiveId] = useState(entries[0]?.id ?? '');
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

  if (!entries.length) return null;

  return (
    <div className={styles.col}>
      <nav className={styles.nav} aria-label="Разделы статьи">
        <div className={styles.frame}>
          <div className={styles.list}>
            {entries.map((h) => {
              const isActive = h.id === activeId;
              return (
                <button
                  key={h.id}
                  type="button"
                  className={styles.item}
                  onClick={() => handleClick(h.id)}
                  onMouseEnter={() => setHoverId(h.id)}
                  onMouseLeave={() => setHoverId((v) => (v === h.id ? null : v))}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive ? <ActiveIcon /> : h.level === 'main' ? <MainDot /> : <SubDot />}
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
