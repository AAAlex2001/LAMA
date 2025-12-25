'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './footer-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface FooterLink {
  text: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterContent {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: FooterColumn[];
}

export default function FooterAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [content, setContent] = useState<FooterContent>({
    brandName: '',
    copyright: '',
    telegramLink: '',
    instagramLink: '',
    columns: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/footer?locale=${locale}`)
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
      const res = await fetch(`${API_BASE_URL}/footer?locale=${locale}`, {
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

  const addColumn = () => {
    setContent({
      ...content,
      columns: [...content.columns, { title: '', links: [] }]
    });
  };

  const removeColumn = (index: number) => {
    const newColumns = content.columns.filter((_, i) => i !== index);
    setContent({ ...content, columns: newColumns });
  };

  const updateColumn = (index: number, field: 'title', value: string) => {
    const newColumns = [...content.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setContent({ ...content, columns: newColumns });
  };

  const addLink = (columnIndex: number) => {
    const newColumns = [...content.columns];
    newColumns[columnIndex].links.push({ text: '', href: '' });
    setContent({ ...content, columns: newColumns });
  };

  const removeLink = (columnIndex: number, linkIndex: number) => {
    const newColumns = [...content.columns];
    newColumns[columnIndex].links = newColumns[columnIndex].links.filter((_, i) => i !== linkIndex);
    setContent({ ...content, columns: newColumns });
  };

  const updateLink = (columnIndex: number, linkIndex: number, field: 'text' | 'href', value: string) => {
    const newColumns = [...content.columns];
    newColumns[columnIndex].links[linkIndex] = { ...newColumns[columnIndex].links[linkIndex], [field]: value };
    setContent({ ...content, columns: newColumns });
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Редактирование Footer секции</h1>
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
            <h2>Основное</h2>
            
            <label className={styles.field}>
              <span>Название бренда</span>
              <input
                type="text"
                value={content.brandName}
                onChange={e => setContent({ ...content, brandName: e.target.value })}
                placeholder="LAMAplanner"
              />
            </label>

            <label className={styles.field}>
              <span>Копирайт</span>
              <input
                type="text"
                value={content.copyright}
                onChange={e => setContent({ ...content, copyright: e.target.value })}
                placeholder="© 2025 LamaPlanner. Все права защищены."
              />
            </label>

            <label className={styles.field}>
              <span>Ссылка Telegram</span>
              <input
                type="text"
                value={content.telegramLink}
                onChange={e => setContent({ ...content, telegramLink: e.target.value })}
                placeholder="/telegram"
              />
            </label>

            <label className={styles.field}>
              <span>Ссылка Instagram</span>
              <input
                type="text"
                value={content.instagramLink}
                onChange={e => setContent({ ...content, instagramLink: e.target.value })}
                placeholder="/instagram"
              />
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Колонки</h2>
              <button className={styles.addButton} onClick={addColumn}>
                + Добавить колонку
              </button>
            </div>
            
            {content.columns.map((column, columnIndex) => (
              <div key={columnIndex} className={styles.columnEditor}>
                <div className={styles.columnHeader}>
                  <h3>Колонка {columnIndex + 1}</h3>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeColumn(columnIndex)}
                  >
                    Удалить
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Заголовок колонки</span>
                  <input
                    type="text"
                    value={column.title}
                    onChange={e => updateColumn(columnIndex, 'title', e.target.value)}
                    placeholder="Продукт"
                  />
                </label>

                <div className={styles.linksSection}>
                  <div className={styles.linksHeader}>
                    <h4>Ссылки</h4>
                    <button 
                      className={styles.addLinkButton}
                      onClick={() => addLink(columnIndex)}
                    >
                      + Добавить ссылку
                    </button>
                  </div>
                  
                  {column.links.map((link, linkIndex) => (
                    <div key={linkIndex} className={styles.linkRow}>
                      <input
                        type="text"
                        value={link.text}
                        onChange={e => updateLink(columnIndex, linkIndex, 'text', e.target.value)}
                        placeholder="Текст ссылки"
                        className={styles.linkInput}
                      />
                      <input
                        type="text"
                        value={link.href}
                        onChange={e => updateLink(columnIndex, linkIndex, 'href', e.target.value)}
                        placeholder="/href"
                        className={styles.linkInput}
                      />
                      <button
                        className={styles.removeLinkButton}
                        onClick={() => removeLink(columnIndex, linkIndex)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
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

