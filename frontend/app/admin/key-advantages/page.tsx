'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './key-advantages-admin.module.scss';

interface KeyAdvantage {
  icon: string | null;
  title: string;
  description: string;
}

interface KeyAdvantagesContent {
  headline: string;
  advantages: KeyAdvantage[];
}

export default function KeyAdvantagesAdminPage() {
  const [content, setContent] = useState<KeyAdvantagesContent>({
    headline: '',
    advantages: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/key-advantages')
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
      const res = await fetch('/api/key-advantages', {
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

  const addAdvantage = () => {
    setContent({
      ...content,
      advantages: [...content.advantages, { icon: null, title: '', description: '' }]
    });
  };

  const removeAdvantage = (index: number) => {
    const newAdvantages = content.advantages.filter((_, i) => i !== index);
    setContent({ ...content, advantages: newAdvantages });
  };

  const updateAdvantage = (index: number, field: keyof KeyAdvantage, value: string | null) => {
    const newAdvantages = [...content.advantages];
    newAdvantages[index] = { ...newAdvantages[index], [field]: value };
    setContent({ ...content, advantages: newAdvantages });
  };

  const handleIconUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        updateAdvantage(index, 'icon', data.url);
        setMessage('✅ Иконка загружена');
      }
    } catch {
      setMessage('❌ Ошибка загрузки иконки');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <h1 className={styles.title}>Редактирование Key Advantages секции</h1>
        
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
                placeholder="Почему выбирают LAMAplanner"
              />
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Преимущества</h2>
              <button className={styles.addButton} onClick={addAdvantage}>
                + Добавить преимущество
              </button>
            </div>
            
            {content.advantages.map((advantage, index) => (
              <div key={index} className={styles.advantageEditor}>
                <div className={styles.advantageHeader}>
                  <h3>Преимущество {index + 1}</h3>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeAdvantage(index)}
                  >
                    Удалить
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Заголовок</span>
                  <input
                    type="text"
                    value={advantage.title}
                    onChange={e => updateAdvantage(index, 'title', e.target.value)}
                    placeholder="Название преимущества"
                  />
                </label>

                <label className={styles.field}>
                  <span>Описание</span>
                  <textarea
                    value={advantage.description}
                    onChange={e => updateAdvantage(index, 'description', e.target.value)}
                    placeholder="Описание преимущества"
                    rows={3}
                  />
                </label>

                <label className={styles.field}>
                  <span>Иконка (SVG текст или URL)</span>
                  <textarea
                    value={advantage.icon || ''}
                    onChange={e => updateAdvantage(index, 'icon', e.target.value || null)}
                    placeholder="Вставьте SVG код или URL изображения"
                    rows={4}
                  />
                </label>

                <div className={styles.iconUpload}>
                  <span>Или загрузите файл:</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleIconUpload(index, e)}
                    className={styles.fileInput}
                  />
                </div>

                {advantage.icon && (
                  <div className={styles.iconPreview}>
                    {advantage.icon.startsWith('<svg') || advantage.icon.startsWith('http') || advantage.icon.startsWith('/') ? (
                      advantage.icon.startsWith('<svg') ? (
                        <div dangerouslySetInnerHTML={{ __html: advantage.icon }} />
                      ) : (
                        <img src={advantage.icon} alt="Icon preview" />
                      )
                    ) : null}
                  </div>
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

