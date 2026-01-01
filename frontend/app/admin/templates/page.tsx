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
  blocks?: Array<{
    title: string;
    subtitle: string;
    description: string;
    advantages?: Array<{ text: string }>;
    image?: { url: string; alt: string };
    imagePosition?: 'left' | 'right';
  }>;
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

  const blocksIn = Array.isArray((safe as any).blocks) ? ((safe as any).blocks as any[]) : [];
  const normalizedBlocks = blocksIn
    .filter((b) => b && typeof b === 'object')
    .map((b) => {
      const advantagesIn = Array.isArray((b as any).advantages) ? ((b as any).advantages as any[]) : [];
      const advantages = advantagesIn
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({ text: String((a as any).text ?? '').trim() }))
        .filter((a) => Boolean(a.text));

      const imageIn = (b as any).image && typeof (b as any).image === 'object' ? (b as any).image : null;
      const imageUrl = imageIn ? String(imageIn.url ?? '').trim() : '';
      const imageAlt = imageIn ? String(imageIn.alt ?? '').trim() : '';
      const image = imageUrl ? { url: imageUrl, alt: imageAlt } : undefined;

      return {
        title: String((b as any).title ?? ''),
        subtitle: String((b as any).subtitle ?? ''),
        description: String((b as any).description ?? ''),
        advantages: advantages.length > 0 ? advantages : undefined,
        image,
        imagePosition: ((b as any).imagePosition === 'left' ? 'left' : 'right') as 'left' | 'right',
      };
    });

  return {
    headline: safe.headline ?? '',
    lead: safe.lead ?? '',
    body: safe.body ?? '',
    ctaText: safe.ctaText ?? '',
    ctaUrl: safe.ctaUrl ?? '',
    images: normalizedImages,
    blocks: normalizedBlocks,
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
    blocks: [],
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

      const blocks = (Array.isArray(content.blocks) ? content.blocks : [])
        .map((b) => {
          const title = String(b?.title ?? '').trim();
          const subtitle = String(b?.subtitle ?? '').trim();
          const description = String(b?.description ?? '').trim();

          const advantages = (Array.isArray(b?.advantages) ? b.advantages : [])
            .map((a) => ({ text: String(a?.text ?? '').trim() }))
            .filter((a) => Boolean(a.text));

          const imageUrl = String(b?.image?.url ?? '').trim();
          const imageAlt = String(b?.image?.alt ?? '').trim();
          const image = imageUrl ? { url: imageUrl, alt: imageAlt } : undefined;

          const hasAny = Boolean(title || subtitle || description || advantages.length > 0 || image);
          if (!hasAny) return null;

          return {
            title,
            subtitle,
            description,
            advantages: advantages.length > 0 ? advantages : undefined,
            image,
            imagePosition: b?.imagePosition === 'left' ? 'left' : 'right',
          };
        })
        .filter(Boolean);

      const res = await fetch(`${API_BASE_URL}/templates/slug/${encodeURIComponent(selectedSlug)}/content?locale=${locale}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: content.headline,
            lead: content.lead,
            body: '',
            ctaText: content.ctaText,
            ctaUrl: content.ctaUrl,
            images,
            blocks,
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

  const addBlock = () => {
    setContent((p) => ({
      ...p,
      blocks: [
        ...(Array.isArray(p.blocks) ? p.blocks : []),
        { title: '', subtitle: '', description: '', advantages: [], image: undefined, imagePosition: 'right' as const },
      ],
    }));
  };

  const removeBlock = (blockIndex: number) => {
    setContent((p) => ({
      ...p,
      blocks: (Array.isArray(p.blocks) ? p.blocks : []).filter((_, i) => i !== blockIndex),
    }));
  };

  const updateBlockField = (
    blockIndex: number,
    field: 'title' | 'subtitle' | 'description' | 'imagePosition',
    value: string
  ) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex] || { title: '', subtitle: '', description: '', imagePosition: 'right' };
      blocks[blockIndex] = { ...current, [field]: value };
      return { ...p, blocks };
    });
  };

  const updateBlockImage = (blockIndex: number, url: string, alt: string) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const cleanUrl = String(url ?? '').trim();
      const cleanAlt = String(alt ?? '');
      const image = cleanUrl ? { url: cleanUrl, alt: cleanAlt } : undefined;
      blocks[blockIndex] = { ...current, image };
      return { ...p, blocks };
    });
  };

  const clearBlockImage = (blockIndex: number) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex];
      if (!current) return p;
      blocks[blockIndex] = { ...current, image: undefined };
      return { ...p, blocks };
    });
  };

  const addAdvantage = (blockIndex: number) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const advantages = Array.isArray(current.advantages) ? [...current.advantages] : [];
      advantages.push({ text: '' });
      blocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks };
    });
  };

  const updateAdvantage = (blockIndex: number, advIndex: number, text: string) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex] || { title: '', subtitle: '', description: '' };
      const advantages = Array.isArray(current.advantages) ? [...current.advantages] : [];
      while (advantages.length <= advIndex) advantages.push({ text: '' });
      advantages[advIndex] = { text };
      blocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks };
    });
  };

  const removeAdvantage = (blockIndex: number, advIndex: number) => {
    setContent((p) => {
      const blocks = Array.isArray(p.blocks) ? [...p.blocks] : [];
      const current = blocks[blockIndex];
      if (!current) return p;
      const advantages = (Array.isArray(current.advantages) ? current.advantages : []).filter((_, i) => i !== advIndex);
      blocks[blockIndex] = { ...current, advantages };
      return { ...p, blocks };
    });
  };

  const handleDropBlockImage = async (blockIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const currentAlt = String((content.blocks?.[blockIndex] as any)?.image?.alt ?? `Template block ${blockIndex + 1}`);
    updateBlockImage(blockIndex, url, currentAlt);
    setMessage('✅ Картинка загружена');
  };

  const handleSelectBlockImage = async (blockIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (!url) return;

    const currentAlt = String((content.blocks?.[blockIndex] as any)?.image?.alt ?? `Template block ${blockIndex + 1}`);
    updateBlockImage(blockIndex, url, currentAlt);
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

                <div className={styles.blocksSection}>
                  <div className={styles.blocksHeader}>
                    <div className={styles.blocksTitle}>Blocks (контент ниже Hero)</div>
                    <Button
                      text="Добавить блок"
                      onClick={addBlock}
                      showArrow={false}
                      size="small"
                    />
                  </div>

                  {(Array.isArray(content.blocks) ? content.blocks : []).length === 0 ? (
                    <div className={styles.blocksEmpty}>Пока нет блоков</div>
                  ) : null}

                  {(Array.isArray(content.blocks) ? content.blocks : []).map((block, blockIndex) => {
                    const imageUrl = String(block?.image?.url ?? '');
                    const imageAlt = String(block?.image?.alt ?? '');
                    const advantages = Array.isArray(block?.advantages) ? block.advantages : [];

                    return (
                      <div key={blockIndex} className={styles.blockCard}>
                        <div className={styles.blockTopRow}>
                          <div className={styles.blockLabel}>Блок {blockIndex + 1}</div>
                          <Button
                            text="Удалить"
                            onClick={() => removeBlock(blockIndex)}
                            showArrow={false}
                            size="small"
                          />
                        </div>

                        <Input
                          label="Title"
                          value={String(block?.title ?? '')}
                          onChange={(v) => updateBlockField(blockIndex, 'title', v)}
                        />
                        <Input
                          label="Subtitle"
                          value={String(block?.subtitle ?? '')}
                          onChange={(v) => updateBlockField(blockIndex, 'subtitle', v)}
                        />

                        <div className={styles.textareaField}>
                          <div className={styles.textareaLabel}>Description</div>
                          <textarea
                            className={styles.textarea}
                            value={String(block?.description ?? '')}
                            onChange={(e) => updateBlockField(blockIndex, 'description', e.target.value)}
                            rows={4}
                          />
                          <div className={styles.formatHint}>Форматирование: ``слово`` — жирный, `слово` — градиент</div>
                        </div>

                        <div className={styles.textareaField}>
                          <div className={styles.textareaLabel}>Позиция картинки</div>
                          <select
                            className={styles.select}
                            value={block?.imagePosition ?? 'right'}
                            onChange={(e) => updateBlockField(blockIndex, 'imagePosition', e.target.value)}
                          >
                            <option value="right">Справа</option>
                            <option value="left">Слева</option>
                          </select>
                        </div>

                        <div className={styles.blockImageSection}>
                          <div className={styles.imagesTitle}>Картинка (опционально)</div>
                          <div
                            className={styles.blockImageCard}
                            onDrop={(e) => handleDropBlockImage(blockIndex, e)}
                            onDragOver={handleDragOver}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSelectBlockImage(blockIndex, e)}
                              className={styles.fileInput}
                            />
                            {imageUrl ? (
                              <img src={imageUrl} alt={imageAlt || ''} />
                            ) : (
                              <div className={styles.placeholder}>
                                <span>Перетащите или кликните</span>
                              </div>
                            )}
                          </div>
                          <div className={styles.dropHint}>Перетащите или кликните</div>

                          <Input
                            label="Image URL"
                            value={imageUrl}
                            onChange={(v) => updateBlockImage(blockIndex, v, imageAlt)}
                          />
                          <Input
                            label="Image ALT"
                            value={imageAlt}
                            onChange={(v) => updateBlockImage(blockIndex, imageUrl, v)}
                          />

                          {imageUrl ? (
                            <Button
                              text="Убрать картинку"
                              onClick={() => clearBlockImage(blockIndex)}
                              showArrow={false}
                              size="small"
                            />
                          ) : null}
                        </div>

                        <div className={styles.advantagesSection}>
                          <div className={styles.advantagesHeader}>
                            <div className={styles.advantagesTitle}>Advantages (опционально)</div>
                            <Button
                              text="Добавить"
                              onClick={() => addAdvantage(blockIndex)}
                              showArrow={false}
                              size="small"
                            />
                          </div>

                          {advantages.length === 0 ? (
                            <div className={styles.advantagesEmpty}>Пока нет преимуществ</div>
                          ) : null}

                          <div className={styles.advantagesList}>
                            {advantages.map((adv, advIndex) => (
                              <div key={advIndex} className={styles.advRow}>
                                <Input
                                  label={`Преимущество ${advIndex + 1}`}
                                  value={String(adv?.text ?? '')}
                                  onChange={(v) => updateAdvantage(blockIndex, advIndex, v)}
                                />
                                <Button
                                  text="Удалить"
                                  onClick={() => removeAdvantage(blockIndex, advIndex)}
                                  showArrow={false}
                                  size="small"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
