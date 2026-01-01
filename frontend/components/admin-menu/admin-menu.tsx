'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin-menu.module.scss';

export default function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'Главная' },
    { href: '/admin/hero', label: 'Hero' },
    { href: '/admin/advantages', label: 'Advantages' },
    { href: '/admin/templates', label: 'Templates' },
    { href: '/admin/key-advantages', label: 'Key Advantages' },
    { href: '/admin/pricing', label: 'Pricing' },
    { href: '/admin/faq', label: 'FAQ' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/lama', label: 'Lama' },
    { href: '/admin/footer', label: 'Footer' },
  ];

  return (
    <div className={styles.menu}>
      <button 
        className={styles.burger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Меню"
      >
        <span className={isOpen ? styles.open : ''}></span>
        <span className={isOpen ? styles.open : ''}></span>
        <span className={isOpen ? styles.open : ''}></span>
      </button>

      {isOpen && (
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? styles.active : ''}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

