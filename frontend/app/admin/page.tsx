'use client';

import Link from 'next/link';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './admin.module.scss';

export default function AdminPage() {
  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <h1 className={styles.title}>Панель администратора</h1>
        <p className={styles.subtitle}>Управление контентом лендинга</p>

        <div className={styles.sections}>
          <Link href="/admin/hero" className={styles.sectionCard}>
            <h2>Hero секция</h2>
            <p>Редактирование заголовка, текстов и изображений главной секции</p>
          </Link>

          <Link href="/admin/advantages" className={styles.sectionCard}>
            <h2>Advantages секция</h2>
            <p>Управление карточками преимуществ и CTA блоками</p>
          </Link>

          <Link href="/admin/key-advantages" className={styles.sectionCard}>
            <h2>Key Advantages секция</h2>
            <p>Редактирование ключевых преимуществ с иконками</p>
          </Link>

          <Link href="/admin/pricing" className={styles.sectionCard}>
            <h2>Pricing секция</h2>
            <p>Управление тарифными планами и ценами</p>
          </Link>

          <Link href="/admin/faq" className={styles.sectionCard}>
            <h2>FAQ секция</h2>
            <p>Редактирование часто задаваемых вопросов</p>
          </Link>

          <Link href="/admin/users" className={styles.sectionCard}>
            <h2>Users секция</h2>
            <p>Управление текстами секции пользователей</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

