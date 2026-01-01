'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import Input from '@/components/input/input';
import Button from '@/components/button/button';
import styles from './templates-admin.module.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type TemplateItem = {
  id: number;
  slug?: string | null;
  sourceCardIndex: number;
  title: string;
  description: string;
  linkText?: string | null;
  linkUrl?: string | null;
};

type TemplatesIndex = {
  count: number;
  templates: TemplateItem[];
};

type TemplatePageContent = {
  headline: string;
  lead: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  images?: Array<{ url: string; alt: string }>;
};

function normalizeTemplateContent(data: Partial<TemplatePageContent> | null | undefined): TemplatePageContent {
  const safe = data ?? {};
  const images = Array.isArray(safe.images) ? safe.images : [];
  const normalizedImages = Array.from({ length: 5 }, (_, i) => {
    const img = images[i] ?? { url: '', alt: '' };
    return {
      url: (img as any)?.url ?? '',
      alt: (img as any)?.alt ?? '',
    };
  });
  return {
    headline: safe.headline ?? '',
    lead: safe.lead ?? '',
    body: safe.body ?? '',
    ctaText: safe.ctaText ?? '',
    ctaUrl: safe.ctaUrl ?? '',
    images: normalizedImages,
  };
}

export default function TemplatesAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [data, setData] = useState<TemplatesIndex>({ count: 0, templates: [] });
  const [loading, setLoading] = useState(true);

  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [content, setContent] = useState<TemplatePageContent>({
    headline: '',
    lead: '',
    body: '',
    ctaText: '',
    ctaUrl: '',
    images: [
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
      { url: '', alt: '' },
    ],
  });

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/templates?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const templates = useMemo(() => (Array.isArray(data?.templates) ? data.templates : []), [data]);

  useEffect(() => {
    if (!selectedSlug && templates.length > 0) {
      const first = templates.find((t) => t.slug) || templates[0];
      if (first?.slug) setSelectedSlug(first.slug);
    }
  }, [templates, selectedSlug]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => (t.slug || '') === selectedSlug) || null,
    [templates, selectedSlug]
  );

  useEffect(() => {
    if (!selectedSlug) return;
    setContentLoading(true);
    setMessage('');
    fetch(`${API_BASE_URL}/templates/slug/${encodeURIComponent(selectedSlug)}/content?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        setContent(normalizeTemplateContent(data));
        setContentLoading(false);
      })
      .catch(() => {
        setContentLoading(false);
        setMessage('❌ Не удалось загрузить контент шаблона');
      });
  }, [selectedSlug, locale]);

  const handleSave = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    setMessage('');
    try {
      const images = (Array.isArray(content.images) ? content.images : [])
        .map((img) => ({ url: img?.url || '', alt: img?.alt || '' }))
        .filter((img) => Boolean(img.url));

      const res = await fetch(`${API_BASE_URL}/templates/slug/${encodeURIComponent(selectedSlug)}/content?locale=${locale}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: content.headline,
            lead: content.lead,
            body: content.body,
            ctaText: content.ctaText,
            ctaUrl: content.ctaUrl,
            images,
          }),
        }
      );

      if (!res.ok) {
        setMessage('❌ Ошибка сохранения');
        return;
      }
      setMessage('✅ Сохранено');
    } catch {
      setMessage('❌ Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setMessage('❌ Неподдерживаемый формат. Используйте PNG, JPG, SVG, WebP или GIF');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        setMessage('❌ Ошибка загрузки');
        return null;
      }
      const data = await res.json();
      return data?.url || null;
    } catch {
      setMessage('❌ Ошибка загрузки');
      return null;
    }
  };

  const handleDropImage = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const newImages = Array.isArray(content.images) ? [...content.images] : [];
    while (newImages.length < 5) newImages.push({ url: '', alt: '' });
    newImages[index] = { url, alt: `Template hero ${index + 1}` };
    setContent((p) => ({ ...p, images: newImages }));
    setMessage('✅ Картинка загружена');
  };

  const handleSelectImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const newImages = Array.isArray(content.images) ? [...content.images] : [];
    while (newImages.length < 5) newImages.push({ url: '', alt: '' });
    newImages[index] = { url, alt: `Template hero ${index + 1}` };
    setContent((p) => ({ ...p, images: newImages }));
    setMessage('✅ Картинка загружена');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Templates</h1>
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

        <div className={styles.note}>
          Количество шаблонов = количество карточек Advantages без CTA. Сейчас: <b>{templates.length}</b>
        </div>

        <div className={styles.layout}>
          <div className={styles.list}>
            {templates.map((t) => {
              const id = t.id;
              const publicUrl = `/${locale}/template/${t.slug || id}`;
              const isActive = (t.slug || '') === selectedSlug;

              return (
                <div
                  key={id}
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => t.slug && setSelectedSlug(t.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      t.slug && setSelectedSlug(t.slug);
                    }
                  }}
                >
                  <div className={styles.itemTitle}>
                    Template {id}
                    {t?.title ? ` — ${t.title}` : ''}
                  </div>
                  <div className={styles.itemUrl}>{publicUrl}</div>
                  <a
                    className={styles.openLink}
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Открыть
                  </a>
                </div>
              );
            })}
          </div>

          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <div>
                <div className={styles.editorTitle}>Контент шаблона</div>
                <div className={styles.editorMeta}>
                  {selectedTemplate?.title ? selectedTemplate.title : selectedSlug ? `/${locale}/template/${selectedSlug}` : ''}
                </div>
              </div>
              <div className={styles.editorActions}>
                <Button
                  text={saving ? 'Сохранение…' : 'Сохранить'}
                  onClick={handleSave}
                  showArrow={false}
                  size="small"
                  loading={saving}
                />
              </div>
            </div>

            {message ? <div className={styles.message}>{message}</div> : null}

            {contentLoading ? (
              <div className={styles.loading}>Загрузка контента…</div>
            ) : (
              <div className={styles.form}>
                <Input
                  label="Hero: заголовок"
                  value={content.headline}
                  onChange={(v) => setContent((p) => ({ ...p, headline: v }))}
                />
                <Input
                  label="Hero: paragraph"
                  value={content.lead}
                  onChange={(v) => setContent((p) => ({ ...p, lead: v }))}
                />

                <div className={styles.textareaField}>
                  <div className={styles.textareaLabel}>Hero: paragraphSecondary</div>
                  <textarea
                    className={styles.textarea}
                    value={content.body}
                    onChange={(e) => setContent((p) => ({ ...p, body: e.target.value }))}
                    rows={10}
                  />
                </div>

                <Input
                  label="Hero: buttonText"
                  value={String(content.ctaText ?? '')}
                  onChange={(v) => setContent((p) => ({ ...p, ctaText: v }))}
                />

                <div className={styles.imagesSection}>
                  <div className={styles.imagesTitle}>Hero: картинки (для этого шаблона)</div>
                  <div className={styles.imagesGrid}>
                    {(Array.isArray(content.images) ? content.images : []).map((image, index) => (
                      <div key={index} className={styles.imageCard}>
                        <div
                          className={styles.imagePreview}
                          onDrop={(e) => handleDropImage(index, e)}
                          onDragOver={handleDragOver}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSelectImage(index, e)}
                            className={styles.fileInput}
                          />
                          {image?.url ? (
                            <img src={image.url} alt={image.alt || ''} />
                          ) : (
                            <div className={styles.placeholder}>
                              <span>Картинка {index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.dropHint}>Перетащите или кликните</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
