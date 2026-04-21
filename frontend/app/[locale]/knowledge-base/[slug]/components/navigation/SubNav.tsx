'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainIcon from '@/components/icons/brain-icon';
import { useScrollContainer } from '@/components/app-layout/app-layout';
import { MenuIcon } from '../icons';
import KnowledgeNavDropdown from '../knowledge-nav-dropdown/KnowledgeNavDropdown';
import ArticleToc from './ArticleToc';
import styles from './SubNav.module.scss';

import type { NavigationCategory } from '../../types';

type Heading = { id: string; title: string };

type Props = {
  headings?: Heading[];
  navigation?: NavigationCategory[];
  locale?: string;
  currentSlug?: string;
  isEmbeddedInApp?: boolean;
  isLoggedIn?: boolean;
};

export default function SubNav({
  headings = [],
  navigation,
  locale = 'ru',
  currentSlug,
  isEmbeddedInApp = false,
  isLoggedIn = false,
}: Props) {
  const scrollContainer = useScrollContainer();
  const [open, setOpen] = useState<'nav' | 'toc' | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const innerClassName = `${styles.inner} ${styles.innerConstrained}`;

  useEffect(() => {
    const getScrollTop = () => {
      if (scrollContainer) {
        return scrollContainer.scrollTop;
      }

      const se = document.scrollingElement as HTMLElement | null;
      return window.scrollY || window.pageYOffset || se?.scrollTop || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const HIDE_DELTA = 6;
    const TOP_THRESHOLD = 0;
    let ticking = false;

    lastScrollY.current = getScrollTop();

    const sync = () => {
      const currentY = getScrollTop();
      const delta = currentY - lastScrollY.current;

      if (currentY <= TOP_THRESHOLD) {
        setIsVisible(true);
        lastScrollY.current = currentY;
      } else if (delta > HIDE_DELTA) {
        setIsVisible((p) => (p ? false : p));
        setOpen((o) => (o ? null : o));
        lastScrollY.current = currentY;
      } else if (delta < -HIDE_DELTA) {
        setIsVisible((p) => (p ? p : true));
        lastScrollY.current = currentY;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', onScroll);
      };
    }

    const scrollingEl = document.scrollingElement as HTMLElement | null;
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    if (scrollingEl && scrollingEl !== document.documentElement && scrollingEl !== document.body) {
      scrollingEl.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
      if (scrollingEl) {
        scrollingEl.removeEventListener('scroll', onScroll);
      }
    };
  }, [scrollContainer]);

  return (
    <motion.nav
      className={styles.subnav}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: isVisible ? 0 : -160, opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className={innerClassName}>
        <button
          type="button"
          className={`${styles.pill} ${open === 'nav' ? styles.pillActive : ''}`}
          onClick={() => setOpen((v) => (v === 'nav' ? null : 'nav'))}
        >
          <span className={styles.label}>Блоки знаний</span>
          <BrainIcon width={20} height={20} color={open === 'nav' ? '#3B82F6' : '#000000'} />
        </button>
        <button
          type="button"
          className={`${styles.menuBtn} ${open === 'toc' ? styles.menuBtnActive : ''}`}
          aria-label="Меню"
          onClick={() => setOpen((v) => (v === 'toc' ? null : 'toc'))}
        >
          <MenuIcon />
        </button>
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key={open}
              className={styles.dropdownWrap}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {open === 'nav' ? (
                <KnowledgeNavDropdown
                  headings={headings}
                  navigation={navigation}
                  locale={locale}
                  currentSlug={currentSlug}
                  isLoggedIn={isLoggedIn}
                />
              ) : (
                <ArticleToc
                  headings={headings}
                  navigation={navigation}
                  locale={locale}
                  currentSlug={currentSlug}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
