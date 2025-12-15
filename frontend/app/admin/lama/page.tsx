'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './lama-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface LamaContent {
  headline: string;
  channel: string;
  description: string;
  buttonText: string;
  buttonHref: string;
}

export default function LamaAdminPage() {
  const [content, setContent] = useState<LamaContent>({
    headline: '',
    channel: '',
    description: '',
    buttonText: '',
    buttonHref: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/lama`)
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/lama`, {
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
        <h1 className={styles.title}>Редактирование Lama секции</h1>
        
        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.form}>
          <div className={styles.section}>
            <h2>Тексты</h2>
            
            <label className={styles.field}>
              <span>Заголовок</span>
              <input
                type="text"
                value={content.headline}
                onChange={e => setContent({ ...content, headline: e.target.value })}
                placeholder="Подписаться на Telegram-канал"
              />
            </label>

            <label className={styles.field}>
              <span>Канал</span>
              <input
                type="text"
                value={content.channel}
                onChange={e => setContent({ ...content, channel: e.target.value })}
                placeholder="@LamaPlanner"
              />
            </label>

            <label className={styles.field}>
              <span>Описание</span>
              <textarea
                value={content.description}
                onChange={e => setContent({ ...content, description: e.target.value })}
                placeholder="Присоединяйтесь к комьюнити SMM-специалистов и узнавайте о новых функциях LAMAplanner раньше остальных"
                rows={3}
              />
            </label>

            <label className={styles.field}>
              <span>Текст кнопки</span>
              <input
                type="text"
                value={content.buttonText}
                onChange={e => setContent({ ...content, buttonText: e.target.value })}
                placeholder="Подписаться"
              />
            </label>

            <label className={styles.field}>
              <span>Ссылка кнопки</span>
              <input
                type="text"
                value={content.buttonHref}
                onChange={e => setContent({ ...content, buttonHref: e.target.value })}
                placeholder="/telegram-channel"
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

