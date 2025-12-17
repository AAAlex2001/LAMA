'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './mobile-menu.module.scss';
import Button from '@/components/button/button';
import ToolsPopup from '@/components/tools-popup/tools-popup';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLAnchorElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

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
            <h1 className={styles.brandName}>
              <span className={styles.lama}>LAMA</span>planner
            </h1>
          </div>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          <a href="/about" className={styles.navLink} onClick={handleClose}>О проекте</a>
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
          <a href="/pricing" className={styles.navLink} onClick={handleClose}>Тарифы</a>
          <a href="/knowledge-base" className={styles.navLink} onClick={handleClose}>База знаний</a>
          <div className={styles.language}>RU</div>
        </nav>

        <div className={styles.actions}>
          <Button 
            text="Зарегистрироваться" 
            href="/login" 
            showArrow={false}
            className={styles.loginButton}
            fullWidth={true}
            onClick={handleClose}
          />
          <Button 
            text="Telegram канал" 
            href="/telegram-channel" 
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

