'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './users-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface UsersContent {
  number: number;
  textLine: string;
  textLine_1: string;
  buttonText: string;
  buttonUrl: string;
}

export default function UsersAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [content, setContent] = useState<UsersContent>({
    number: 500,
    textLine: '',
    textLine_1: '',
    buttonText: '',
    buttonUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/users?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/users?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      if (res.ok) {
        setMessage('✅ Сохранено!');
      } else {
        setMessage('❌ Ошибка сохранения');
      }
    } catch {
      setMessage('❌ Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Редактирование Users секции</h1>
          <select 
            className={styles.localeSelector}
            value={locale} 
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="ru">🇷🇺 Русский</option>
            <option value="sr">🇷🇸 Сербский</option>
            <option value="en">🇬🇧 Английский</option>
          </select>
        </div>
        
        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.form}>
          <div className={styles.section}>
            <h2>Тексты</h2>
            
            <label className={styles.field}>
              <span>Число пользователей</span>
              <input
                type="number"
                value={content.number}
                onChange={e => setContent({ ...content, number: parseInt(e.target.value) || 0 })}
                placeholder="500"
              />
            </label>

            <label className={styles.field}>
              <span>Текст после числа</span>
              <input
                type="text"
                value={content.textLine}
                onChange={e => setContent({ ...content, textLine: e.target.value })}
                placeholder="пользователей доверяют"
              />
            </label>

            <label className={styles.field}>
              <span>Основной текст</span>
              <textarea
                value={content.textLine_1}
                onChange={e => setContent({ ...content, textLine_1: e.target.value })}
                placeholder="Планируйте будущее вашего бренда вместе с нами"
                rows={3}
              />
            </label>

            <label className={styles.field}>
              <span>Текст кнопки</span>
              <input
                type="text"
                value={content.buttonText}
                onChange={e => setContent({ ...content, buttonText: e.target.value })}
                placeholder="Начать бесплатно"
              />
            </label>

            <label className={styles.field}>
              <span>Ссылка кнопки</span>
              <input
                type="text"
                value={content.buttonUrl}
                onChange={e => setContent({ ...content, buttonUrl: e.target.value })}
                placeholder="/ru/login или https://example.com"
              />
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <a href="/" className={styles.previewLink} target="_blank">
            Посмотреть на сайте →
          </a>
        </div>
      </div>
    </div>
  );
}

