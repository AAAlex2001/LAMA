'use client';

import { useState } from 'react';
import styles from './mobile-menu.module.scss';
import Button from '@/components/button/button';
import { normalizeLocalizedHref } from '../normalize-localized-href';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  headerContent?: {
    brandPrefix?: string;
    brandSuffix?: string;
    toolsLabel?: string;
    toolsOrder?: number;
    loginText?: string;
    loginHref?: string;
    registerText?: string;
    registerHref?: string;
    telegramText?: string;
    telegramHref?: string;
    navLinks?: Array<{ text: string; href: string; order?: number }>;
  };
  toolsItems?: Array<{ title: string; href: string; order?: number }>; // mobile uses title only
}

export default function MobileMenu({ isOpen, onClose, locale, headerContent, toolsItems: toolsItemsProp }: MobileMenuProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const navLinks = headerContent?.navLinks ?? [];
  const toolsLabel = headerContent?.toolsLabel ?? '';
  const toolsList = toolsItemsProp ?? [];
  const brandPrefix = headerContent?.brandPrefix ?? '';
  const brandSuffix = headerContent?.brandSuffix ?? '';
  const registerText = headerContent?.registerText ?? '';
  const registerHref = headerContent?.registerHref ?? '';
  const telegramText = headerContent?.telegramText ?? '';
  const telegramHref = headerContent?.telegramHref ?? '';
  const toolsOrder = headerContent?.toolsOrder;
  const hasTools = Boolean(toolsLabel && toolsList.length > 0);
  const sortedNavLinks = [...navLinks].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  );
  const sortedToolsList = [...toolsList].sort(
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

  return (
    <div 
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`} 
      onClick={handleClose}
    >
      <div 
        className={`${styles.menu} ${isClosing ? styles.menuClosing : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.brand}>
            <a href={`/${locale}`} className={styles.brandName}>
              <h1>
                <span className={styles.lama}>{brandPrefix}</span>{brandSuffix}
              </h1>
            </a>
          </div>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item, index) => {
            if (item.type === 'link') {
              return (
                <a key={`link-${index}`} href={normalizeLocalizedHref(item.link.href, locale)} className={styles.navLink} onClick={handleClose}>
                  {item.link.text}
                </a>
              );
            }

            return (
              <div key="tools" className={styles.toolsAccordion}>
                <button 
                  className={`${styles.navLink} ${styles.toolsToggle} ${isToolsOpen ? styles.toolsToggleOpen : ''}`}
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                >
                  {toolsLabel}
                  <svg 
                    className={styles.chevron} 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                <div className={`${styles.toolsList} ${isToolsOpen ? styles.toolsListOpen : ''}`}>
                  {sortedToolsList.map((tool, toolIndex) => (
                    <a 
                      key={toolIndex} 
                      href={normalizeLocalizedHref(tool.href, locale)} 
                      className={styles.toolsItem}
                      onClick={handleClose}
                    >
                      {tool.title}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <Button 
            text={registerText} 
            href={normalizeLocalizedHref(registerHref, locale)}
            showArrow={false}
            className={styles.loginButton}
            fullWidth={true}
            onClick={handleClose}
          />
          <Button 
            text={telegramText} 
            href={normalizeLocalizedHref(telegramHref, locale)} 
            showArrow={false}
            className={styles.telegramButton}
            fullWidth={true}
            active={true}
            onClick={handleClose}
          />
        </div>
      </div>
    </div>
  );
}

