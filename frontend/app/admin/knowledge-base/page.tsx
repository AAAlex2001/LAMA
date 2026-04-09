'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './kb-admin.module.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface Category {
  id: number;
  slug: string;
  title: string;
  locale: string;
  order: number;
  is_active: boolean;
}

interface ArticleListItem {
  slug: string;
  title: string;
  description: string | null;
  readingMinutes: number;
  categorySlug: string | null;
}

export default function KBAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  const [newArtSlug, setNewArtSlug] = useState('');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtCategory, setNewArtCategory] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [navRes, artRes] = await Promise.all([
        fetch(`${API_BASE_URL}/kb/navigation?locale=${locale}`),
        fetch(`${API_BASE_URL}/kb/articles?locale=${locale}`),
      ]);
      const nav = await navRes.json();
      const artData = await artRes.json();

      const cats: Category[] = Array.isArray(nav)
        ? nav.map((c: Category, i: number) => ({ ...c, id: i, locale: locale.toUpperCase(), is_active: true }))
        : [];
      setCategories(cats);
      setArticles(artData.articles || []);
    } catch {
      setMessage('Ошибка загрузки');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [locale]);

  const createCategory = async () => {
    if (!newCatSlug || !newCatTitle) return;
    const res = await fetch(`${API_BASE_URL}/kb/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: newCatSlug, title: newCatTitle, locale: locale.toUpperCase() }),
    });
    if (res.ok) {
      setMessage('Категория создана');
      setNewCatSlug('');
      setNewCatTitle('');
      loadData();
    } else {
      setMessage('Ошибка создания категории');
    }
  };

  const deleteCategory = async (slug: string) => {
    if (!confirm(`Удалить категорию "${slug}"?`)) return;
    const res = await fetch(`${API_BASE_URL}/kb/categories/slug/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Категория удалена');
      loadData();
    }
  };

  const createArticle = async () => {
    if (!newArtSlug || !newArtTitle || !newArtCategory) return;
    const res = await fetch(`${API_BASE_URL}/kb/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categorySlug: newArtCategory,
        slug: newArtSlug,
        title: newArtTitle,
        locale: locale.toUpperCase(),
      }),
    });
    if (res.ok) {
      setMessage('Статья создана');
      setNewArtSlug('');
      setNewArtTitle('');
      loadData();
    } else {
      setMessage('Ошибка создания статьи');
    }
  };

  const deleteArticle = async (slug: string) => {
    if (!confirm(`Удалить статью "${slug}"?`)) return;
    const res = await fetch(`${API_BASE_URL}/kb/articles/slug/${slug}?locale=${locale}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Статья удалена');
      loadData();
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>База знаний</h1>
          <select className={styles.localeSelector} value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="ru">Русский</option>
            <option value="sr">Сербский</option>
            <option value="en">Английский</option>
          </select>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.form}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Категории</h2>
            </div>

            {categories.map((cat) => (
              <div key={cat.slug} className={styles.itemRow}>
                <span className={styles.itemSlug}>{cat.slug}</span>
                <span className={styles.itemTitle}>{cat.title}</span>
                <button className={styles.removeButton} onClick={() => deleteCategory(cat.slug)}>Удалить</button>
              </div>
            ))}

            <div className={styles.addRow}>
              <input
                type="text"
                placeholder="slug"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Название"
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                className={styles.input}
              />
              <button className={styles.addButton} onClick={createCategory}>Создать</button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Статьи</h2>
            </div>

            {articles.map((art) => (
              <div key={art.slug} className={styles.itemRow}>
                <span className={styles.itemSlug}>{art.slug}</span>
                <span className={styles.itemTitle}>{art.title}</span>
                <span className={styles.itemMeta}>{art.readingMinutes} мин</span>
                <Link href={`/admin/knowledge-base/${art.slug}?locale=${locale}`} className={styles.editLink}>
                  Редактировать
                </Link>
                <button className={styles.removeButton} onClick={() => deleteArticle(art.slug)}>Удалить</button>
              </div>
            ))}

            <div className={styles.addRow}>
              <select
                value={newArtCategory}
                onChange={(e) => setNewArtCategory(e.target.value)}
                className={styles.input}
              >
                <option value="">Категория</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="slug"
                value={newArtSlug}
                onChange={(e) => setNewArtSlug(e.target.value)}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Заголовок"
                value={newArtTitle}
                onChange={(e) => setNewArtTitle(e.target.value)}
                className={styles.input}
              />
              <button className={styles.addButton} onClick={createArticle}>Создать</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
