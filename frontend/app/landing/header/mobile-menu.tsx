'use client';

import { useState } from 'react';
import styles from './mobile-menu.module.scss';
import Button from '@/components/button/button';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

const toolsItems = [
  { title: 'Новая публикация', href: '/publications/new' },
  { title: 'Календарь', href: '/calendar' },
  { title: 'Заметки', href: '/notes' },
  { title: 'Каналы/группы', href: '/channels' },
  { title: 'Боты', href: '/bots' },
  { title: 'Inbox', href: '/inbox' },
  { title: 'Парсер', href: '/parser' }
];

export default function MobileMenu({ isOpen, onClose, locale }: MobileMenuProps) {
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
                <span className={styles.lama}>LAMA</span>planner
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
          <a href="/about" className={styles.navLink} onClick={handleClose}>О проекте</a>
          
          <div className={styles.toolsAccordion}>
            <button 
              className={`${styles.navLink} ${styles.toolsToggle} ${isToolsOpen ? styles.toolsToggleOpen : ''}`}
              onClick={() => setIsToolsOpen(!isToolsOpen)}
            >
              Инструменты
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
              {toolsItems.map((item, index) => (
                <a 
                  key={index} 
                  href={item.href} 
                  className={styles.toolsItem}
                  onClick={handleClose}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          
          <a href="/pricing" className={styles.navLink} onClick={handleClose}>Тарифы</a>
          <a href="/knowledge-base" className={styles.navLink} onClick={handleClose}>База знаний</a>
        </nav>

        <div className={styles.actions}>
          <Button 
            text="Зарегистрироваться" 
            href={`/${locale}/login`}
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

