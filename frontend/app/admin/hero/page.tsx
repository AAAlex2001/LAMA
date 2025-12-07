'use client';

import { useState, useEffect} from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './hero-admin.module.scss';
import { API_BASE_URL } from "@/config";

interface HeroImage {
  url: string;
  alt: string;
}

interface HeroContent {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  images: HeroImage[];
}

export default function HeroAdminPage() {
  const [content, setContent] = useState<HeroContent>({
    headline: '',
    paragraph: '',
    paragraphSecondary: '',
    buttonText: '',
    images: [
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' }
    ]
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Загружаем текущий контент
  useEffect(() => {
    fetch(`${API_BASE_URL}/hero`)
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Сохраняем контент
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/hero`, {
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

  // Drag & drop для картинок
  const handleDrop = async (index: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;

      // Проверяем формат
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setMessage('❌ Неподдерживаемый формат. Используйте PNG, JPG, SVG, WebP или GIF');
        return;
      }

      // Загружаем файл
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
          newImages[index] = { url: data.url, alt: `Hero ${index + 1}` };
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

  // Загрузка по клику
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
        newImages[index] = { url: data.url, alt: `Hero ${index + 1}` };
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
      <h1 className={styles.title}>Редактирование Hero секции</h1>
      
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
        </div>

        <div className={styles.section}>
          <h2>Картинки (перетащите или кликните)</h2>
          
          <div className={styles.imagesGrid}>
              {content.images.map((image, index) => (
                <div
                  key={index}
                  className={styles.imageCard}
                >
                  <div
                    className={styles.imagePreview}
                    onDrop={e => handleDrop(index, e)}      // ← ПЕРЕНОСИМ СЮДА!
                    onDragOver={handleDragOver}             // ← ПЕРЕНОСИМ СЮДА!
                  >
                    {image.url ? (
                      <img src={image.url} alt={image.alt} />
                    ) : (
                      <div className={styles.placeholder}>
                        <span>📷</span>
                        <span>Картинка {index + 1}</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileSelect(index, e)}
                    className={styles.fileInput}
                  />

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

