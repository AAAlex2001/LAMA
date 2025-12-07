'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './advantages-admin.module.scss';
import { API_BASE_URL } from "@/config";

interface AdvantagesCard {
  title: string;
  description: string;
  isCta: boolean;
  linkText: string | null;
}

interface AdvantagesContent {
  headline: string;
  subtitle: string;
  cards: AdvantagesCard[];
}

export default function AdvantagesAdminPage() {
  const [content, setContent] = useState<AdvantagesContent>({
    headline: '',
    subtitle: '',
    cards: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/advantages`)
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
      const res = await fetch(`${API_BASE_URL}/advantages`, {
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

  const addCard = () => {
    setContent({
      ...content,
      cards: [...content.cards, { title: '', description: '', isCta: false, linkText: null }]
    });
  };

  const removeCard = (index: number) => {
    const newCards = content.cards.filter((_, i) => i !== index);
    setContent({ ...content, cards: newCards });
  };

  const updateCard = (index: number, field: keyof AdvantagesCard, value: string | boolean) => {
    const newCards = [...content.cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setContent({ ...content, cards: newCards });
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <h1 className={styles.title}>Редактирование Advantages секции</h1>
        
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
                placeholder="Всё для продуктивной и лёгкой работы с контентом"
              />
            </label>

            <label className={styles.field}>
              <span>Подзаголовок</span>
              <textarea
                value={content.subtitle}
                onChange={e => setContent({ ...content, subtitle: e.target.value })}
                placeholder="Профессиональный инструмент для тех, кто ценит порядок и эффективность"
                rows={3}
              />
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Карточки</h2>
              <button className={styles.addButton} onClick={addCard}>
                + Добавить карточку
              </button>
            </div>
            
            {content.cards.map((card, index) => (
              <div key={index} className={styles.cardEditor}>
                <div className={styles.cardHeader}>
                  <h3>Карточка {index + 1}</h3>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeCard(index)}
                  >
                    Удалить
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Заголовок карточки</span>
                  <input
                    type="text"
                    value={card.title}
                    onChange={e => updateCard(index, 'title', e.target.value)}
                    placeholder="Название функции"
                  />
                </label>

                <label className={styles.field}>
                  <span>Описание</span>
                  <textarea
                    value={card.description}
                    onChange={e => updateCard(index, 'description', e.target.value)}
                    placeholder="Описание функции"
                    rows={3}
                  />
                </label>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={card.isCta}
                    onChange={e => updateCard(index, 'isCta', e.target.checked)}
                  />
                  <span>Это CTA карточка</span>
                </label>

                {!card.isCta && (
                  <label className={styles.field}>
                    <span>Текст ссылки (опционально)</span>
                    <input
                      type="text"
                      value={card.linkText || ''}
                      onChange={e => updateCard(index, 'linkText', e.target.value)}
                      placeholder="Узнать подробнее"
                    />
                  </label>
                )}
              </div>
            ))}
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

