'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from "./header.module.scss";
import MobileMenu from "./mobile-menu";
import Button from "@/components/button/button";
import ToolsPopup from "@/components/tools-popup/tools-popup";

type Locale = 'ru' | 'sr' | 'en';

type Props = {
  locale: string;
};

export default function Header({ locale: localeProp }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (localeProp as Locale) || 'ru';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const toolsRef = useRef<HTMLAnchorElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const localeLabels = {
    ru: { flag: '🇷🇺', name: 'Русский' },
    sr: { flag: '🇷🇸', name: 'Сербский' },
    en: { flag: '🇬🇧', name: 'Английский' },
  };

  const handleLanguageChange = (newLocale: string) => {
    router.push(`/${newLocale}`);
    setIsLangOpen(false);
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 10) {
        setIsVisible(true);
      } else if (delta > 3) {
        setIsVisible(false);
        setIsToolsOpen(false);
        setIsLangOpen(false);
      } else if (delta < -3) {
        setIsVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`${styles.header} ${!isVisible ? styles.hidden : ''}`}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <h1 className={styles.brandName}>
              <span className={styles.lama}>LAMA</span>planner
            </h1>
          </div>

          <nav className={styles.nav}>
            <a href="/about" className={styles.navLink}>О проекте</a>
            <div className={styles.navLinkWrapper}>
              <a 
                ref={toolsRef}
                href="#" 
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  setIsToolsOpen(!isToolsOpen);
                }}
              >
                Инструменты
              </a>
              <ToolsPopup 
                isOpen={isToolsOpen} 
                onClose={() => setIsToolsOpen(false)}
                anchorElement={toolsRef.current}
              />
            </div>
            <a href="/pricing" className={styles.navLink}>Тарифы</a>
            <a href="/knowledge-base" className={styles.navLink}>База знаний</a>
          </nav>

          <div className={styles.right}>
            <div className={styles.languageWrapper} ref={langRef}>
              <button 
                className={styles.language}
                onClick={() => setIsLangOpen(!isLangOpen)}
              >
                {localeLabels[locale].flag}
              </button>
              {isLangOpen && (
                <div className={styles.languageDropdown}>
                  {Object.entries(localeLabels).map(([code, { flag, name }]) => (
                    <button
                      key={code}
                      className={styles.languageOption}
                      onClick={() => handleLanguageChange(code)}
                    >
                      <span className={styles.languageFlag}>{flag}</span>
                      <span className={styles.languageName}>{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.loginButtonSmall}>
              <Button 
                text="Войти" 
                href="/login" 
                showArrow={false}
                size="small"
              />
            </div>
            <div className={styles.loginButtonMedium}>
              <Button 
                text="Войти" 
                href="/login" 
                showArrow={false}
                size="medium"
              />
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
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}

