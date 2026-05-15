'use client';

import { useState, useEffect} from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './hero-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface HeroImage {
  url: string;
  alt: string;
}

interface HeroContent {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  buttonUrl: string;
  images: HeroImage[];
}

function normalizeHeroContent(data: Partial<HeroContent> | null | undefined): HeroContent {
  const safe = data ?? {};
  const images = Array.isArray(safe.images) ? safe.images : [];
  const normalizedImages = Array.from({ length: 5 }, (_, i) => {
    const img = images[i] ?? { url: '', alt: '' };
    return {
      url: img.url ?? '',
      alt: img.alt ?? '',
    };
  });

  return {
    headline: safe.headline ?? '',
    paragraph: safe.paragraph ?? '',
    paragraphSecondary: safe.paragraphSecondary ?? '',
    buttonText: safe.buttonText ?? '',
    buttonUrl: safe.buttonUrl ?? '',
    images: normalizedImages,
  };
}

export default function HeroAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [content, setContent] = useState<HeroContent>({
    headline: '',
    paragraph: '',
    paragraphSecondary: '',
    buttonText: '',
    buttonUrl: '',
    images: [
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' }
    ],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/hero?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setContent(normalizeHeroContent(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/hero?locale=${locale}`, {
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

  const handleDrop = async (index: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;

      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setMessage('❌ Неподдерживаемый формат. Используйте PNG, JPG, SVG, WebP или GIF');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE_URL}/upload-image`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const newImages = [...content.images];
          newImages[index] = { url: data.url, alt: `Hero landing ${index + 1}` };
          setContent({ ...content, images: newImages });
          setMessage('✅ Картинка загружена');
        } else {
          setMessage('❌ Ошибка загрузки');
        }
      } catch {
        setMessage('❌ Ошибка загрузки');
      }
    };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const newImages = [...content.images];
        newImages[index] = { url: data.url, alt: `Hero landing ${index + 1}` };
        setContent({ ...content, images: newImages });
        setMessage('✅ Картинка загружена');
      }
    } catch {
      setMessage('❌ Ошибка загрузки');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Редактирование Hero секции</h1>
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
            <span>Заголовок</span>
            <input
              type="text"
              value={content.headline}
              onChange={e => setContent({ ...content, headline: e.target.value })}
              placeholder="Управляйте сообществами и ботами Telegram..."
            />
          </label>

          <label className={styles.field}>
            <span>Основной текст</span>
            <textarea
              value={content.paragraph}
              onChange={e => setContent({ ...content, paragraph: e.target.value })}
              placeholder="Экономьте время на рутине..."
              rows={3}
            />
          </label>

          <label className={styles.field}>
            <span>Дополнительный текст</span>
            <input
              type="text"
              value={content.paragraphSecondary}
              onChange={e => setContent({ ...content, paragraphSecondary: e.target.value })}
              placeholder="Вы здесь не случайно..."
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

        <div className={styles.section}>
          <h2>Картинки лендинга (перетащите или кликните)</h2>
          
          <div className={styles.imagesGrid}>
              {content.images.map((image, index) => (
                <div
                  key={index}
                  className={styles.imageCard}
                >
                  <div
                    className={styles.imagePreview}
                    onDrop={e => handleDrop(index, e)}
                    onDragOver={handleDragOver}
                  >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileSelect(index, e)}
                        className={styles.fileInput}
                      />
                    {image.url ? (
                      <img src={image.url} alt={image.alt} />
                    ) : (
                      <div className={styles.placeholder}>
                        <span>Картинка {index + 1}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.dropHint}>
                    Перетащите или кликните
                  </div>
                </div>
              ))}
            </div>
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

