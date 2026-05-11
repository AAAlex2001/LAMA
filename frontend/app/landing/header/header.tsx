'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from "./header.module.scss";
import MobileMenu from "./mobile-menu";
import { Button } from "@/components/new-button";
import ToolsPopup from "@/components/tools-popup/tools-popup";
import { normalizeLocalizedHref } from '../normalize-localized-href';

type Locale = 'ru' | 'sr' | 'en';

type Props = {
  locale: string;
  content?: {
    brandPrefix?: string;
    brandSuffix?: string;
    toolsLabel?: string;
    toolsOrder?: number;
    loginText?: string;
    loginHref?: string;
    navLinks?: Array<{ text: string; href: string; order?: number }>;
    registerText?: string;
    registerHref?: string;
    telegramText?: string;
    telegramHref?: string;
  };
  toolsItems?: Array<{ title: string; description?: string | null; href: string; order?: number }>;
};

export default function Header({ locale: localeProp, content, toolsItems }: Props) {
  const router = useRouter();
  const locale = (localeProp as Locale) || 'ru';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const toolsRef = useRef<HTMLAnchorElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const navLinks = content?.navLinks ?? [];
  const brandPrefix = content?.brandPrefix ?? '';
  const brandSuffix = content?.brandSuffix ?? '';
  const toolsLabel = content?.toolsLabel ?? '';
  const loginText = content?.loginText ?? '';
  const loginHref = content?.loginHref ?? '';
  const toolsOrder = content?.toolsOrder;
  const hasTools = Boolean(toolsLabel && toolsItems && toolsItems.length > 0);
  const sortedNavLinks = [...navLinks].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  );
  const navItems = [
    ...sortedNavLinks.map((link, index) => ({ type: 'link' as const, order: link.order, index, link })),
    ...(hasTools ? [{ type: 'tools' as const, order: toolsOrder }] : []),
  ].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    if (a.type === 'link' && b.type === 'link') return a.index - b.index;
    return a.type === 'tools' ? 1 : -1;
  });

  const localeLabels = {
    ru: { code: 'RU', name: 'RU Русский' },
    sr: { code: 'SR', name: 'SR Srpski' },
    en: { code: 'EN', name: 'EN English' },
  };

  const handleLanguageChange = (newLocale: string) => {
    router.push(`/${newLocale}`);
    setIsLangOpen(false);
  };

  useEffect(() => {
    const getScrollTop = () => {
      const se = document.scrollingElement as HTMLElement | null;
      return window.scrollY || window.pageYOffset || se?.scrollTop || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const HIDE_DELTA = 1;
    const TOP_THRESHOLD = 8;
    let rafId = 0;
    let ticking = false;
    lastScrollY.current = getScrollTop();

    const syncHeader = () => {
      const currentY = getScrollTop();
      const delta = currentY - lastScrollY.current;

      if (currentY <= TOP_THRESHOLD) {
        setIsVisible(true);
      } else if (delta > HIDE_DELTA) {
        setIsVisible(false);
        setIsToolsOpen(false);
        setIsLangOpen(false);
      } else if (delta < -HIDE_DELTA) {
        setIsVisible(true);
      }

      lastScrollY.current = currentY;
      ticking = false;
    };

    const onAnyScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(syncHeader);
    };

    const scrollingEl = document.scrollingElement as HTMLElement | null;
    window.addEventListener('scroll', onAnyScroll, { passive: true });
    document.addEventListener('scroll', onAnyScroll, { passive: true, capture: true });
    if (scrollingEl && scrollingEl !== document.documentElement && scrollingEl !== document.body) {
      scrollingEl.addEventListener('scroll', onAnyScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', onAnyScroll);
      document.removeEventListener('scroll', onAnyScroll, true);
      if (scrollingEl && scrollingEl !== document.documentElement && scrollingEl !== document.body) {
        scrollingEl.removeEventListener('scroll', onAnyScroll);
      }
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <header className={`${styles.header} ${!isVisible ? styles.hidden : ''}`}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <a href={`/${locale}`} className={styles.brandName}>
              <h1>
                <span className={styles.lama}>{brandPrefix}</span>{brandSuffix}
              </h1>
            </a>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item, index) => {
              if (item.type === 'link') {
                return (
                  <a key={`link-${index}`} href={normalizeLocalizedHref(item.link.href, locale)} className={styles.navLink}>
                    {item.link.text}
                  </a>
                );
              }

              return (
                <div key="tools" className={styles.navLinkWrapper}>
                  <a 
                    ref={toolsRef}
                    href="#" 
                    className={styles.navLink}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsToolsOpen(!isToolsOpen);
                    }}
                  >
                    {toolsLabel}
                  </a>
                  <ToolsPopup 
                    isOpen={isToolsOpen} 
                    onClose={() => setIsToolsOpen(false)}
                    anchorElement={toolsRef.current}
                    items={toolsItems}
                  />
                </div>
              );
            })}
          </nav>

          <div className={styles.right}>
            <div className={styles.languageWrapper} ref={langRef}>
              <button 
                className={styles.language}
                onClick={() => setIsLangOpen(!isLangOpen)}
              >
                {localeLabels[locale].code}
              </button>
              {isLangOpen && (
                <div className={styles.languageDropdown}>
                  {Object.entries(localeLabels).map(([code, { name }]) => (
                    <button
                      key={code}
                      className={styles.languageOption}
                      onClick={() => handleLanguageChange(code)}
                    >
                      <span className={styles.languageName}>{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.loginButtonSmall}>
              <Button
                href={normalizeLocalizedHref(loginHref, locale)}
                size="sm"
              >
                {loginText}
              </Button>
            </div>
            <div className={styles.loginButtonMedium}>
              <Button
                href={normalizeLocalizedHref(loginHref, locale)}
                size="md"
              >
                {loginText}
              </Button>
            </div>
            <button 
              className={styles.menuButton} 
              aria-label="Menu"
              onClick={() => setIsMenuOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 6H21M3 18H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        locale={locale}
        headerContent={content}
        toolsItems={toolsItems?.map((item) => ({
          title: item.title,
          href: normalizeLocalizedHref(item.href, locale),
        }))}
      />
    </>
  );
}

