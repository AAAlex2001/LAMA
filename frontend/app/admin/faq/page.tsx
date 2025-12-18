'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './faq-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQContent {
  headline: string;
  faqItems: FAQItem[];
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  helpText?: string;
  botLink?: string;
}

export default function FAQAdminPage() {
  const [content, setContent] = useState<FAQContent>({
    headline: '',
    faqItems: [],
    primaryButtonText: 'База знаний',
    primaryButtonLink: '/knowledge-base',
    secondaryButtonText: 'Telegram канал',
    secondaryButtonLink: '/telegram-channel',
    helpText: 'Не нашли ответ? Напишите нам в @LamaPlannerBot'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/faq`)
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
      const res = await fetch(`${API_BASE_URL}/faq`, {
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

  const addFAQItem = () => {
    setContent({
      ...content,
      faqItems: [...content.faqItems, { question: '', answer: '' }]
    });
  };

  const removeFAQItem = (index: number) => {
    const newItems = content.faqItems.filter((_, i) => i !== index);
    setContent({ ...content, faqItems: newItems });
  };

  const updateFAQItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...content.faqItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setContent({ ...content, faqItems: newItems });
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <h1 className={styles.title}>Редактирование FAQ секции</h1>
        
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
                placeholder="Часто задаваемые вопросы"
              />
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Вопросы и ответы</h2>
              <button className={styles.addButton} onClick={addFAQItem}>
                + Добавить вопрос
              </button>
            </div>
            
            {content.faqItems.map((item, index) => (
              <div key={index} className={styles.faqItemEditor}>
                <div className={styles.itemHeader}>
                  <h3>Вопрос {index + 1}</h3>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeFAQItem(index)}
                  >
                    Удалить
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Вопрос</span>
                  <input
                    type="text"
                    value={item.question}
                    onChange={e => updateFAQItem(index, 'question', e.target.value)}
                    placeholder="Введите вопрос"
                  />
                </label>

                <label className={styles.field}>
                  <span>Ответ</span>
                  <textarea
                    value={item.answer}
                    onChange={e => updateFAQItem(index, 'answer', e.target.value)}
                    placeholder="Введите ответ"
                    rows={4}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <h2>Кнопки</h2>
            
            <div className={styles.buttonGroup}>
              <label className={styles.field}>
                <span>Текст первой кнопки</span>
                <input
                  type="text"
                  value={content.primaryButtonText || ''}
                  onChange={e => setContent({ ...content, primaryButtonText: e.target.value })}
                  placeholder="База знаний"
                />
              </label>

              <label className={styles.field}>
                <span>Ссылка первой кнопки</span>
                <input
                  type="text"
                  value={content.primaryButtonLink || ''}
                  onChange={e => setContent({ ...content, primaryButtonLink: e.target.value })}
                  placeholder="/knowledge-base"
                />
              </label>
            </div>

            <div className={styles.buttonGroup}>
              <label className={styles.field}>
                <span>Текст второй кнопки</span>
                <input
                  type="text"
                  value={content.secondaryButtonText || ''}
                  onChange={e => setContent({ ...content, secondaryButtonText: e.target.value })}
                  placeholder="Telegram канал"
                />
              </label>

              <label className={styles.field}>
                <span>Ссылка второй кнопки</span>
                <input
                  type="text"
                  value={content.secondaryButtonLink || ''}
                  onChange={e => setContent({ ...content, secondaryButtonLink: e.target.value })}
                  placeholder="/telegram-channel"
                />
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Подпись</h2>
            
            <label className={styles.field}>
              <span>Текст подписи</span>
              <textarea
                value={content.helpText || ''}
                onChange={e => setContent({ ...content, helpText: e.target.value })}
                placeholder="Не нашли ответ? Напишите нам в @LamaPlannerBot"
                rows={3}
              />
            </label>

            <label className={styles.field}>
              <span>Ссылка на бота</span>
              <input
                type="text"
                value={content.botLink || ''}
                onChange={e => setContent({ ...content, botLink: e.target.value })}
                placeholder="https://t.me/LamaPlannerBot"
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

