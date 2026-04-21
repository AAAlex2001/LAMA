'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import AdminMenu from '@/components/admin-menu/admin-menu';
import KbRichTextEditor from './KbRichTextEditor';
import styles from './article-editor.module.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type HeadingLevel = 'h1' | 'h3';

type ArticleSection =
  | { type: 'text'; title?: string; titleLevel?: HeadingLevel; body?: string }
  | { type: 'image'; title?: string; titleLevel?: HeadingLevel; src: string; alt?: string }
  | { type: 'image-pair'; title?: string; titleLevel?: HeadingLevel; src1: string; src2: string };

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  readingMinutes: number;
  sections: ArticleSection[];
  metaTitle: string;
  metaDescription: string;
  categorySlug: string;
}

function emptyArticle(): ArticleData {
  return {
    slug: '',
    title: '',
    description: '',
    cardTitle: '',
    cardDescription: '',
    readingMinutes: 5,
    sections: [],
    metaTitle: '',
    metaDescription: '',
    categorySlug: '',
  };
}

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${apiBase}/upload-image`, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL или загрузите файл"
          style={{ flex: 1 }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ flexShrink: 0 }}
        >
          {uploading ? '...' : 'Загрузить'}
        </button>
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 8, marginTop: 8, objectFit: 'cover' }} />
      )}
    </div>
  );
}

export default function ArticleEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const locale = searchParams.get('locale') || 'ru';

  const [article, setArticle] = useState<ArticleData>(emptyArticle());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/kb/articles/slug/${encodeURIComponent(slug)}?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        setArticle({
          slug: data.slug || slug,
          title: data.title || '',
          description: data.description || '',
          cardTitle: data.cardTitle || '',
          cardDescription: data.cardDescription || '',
          readingMinutes: data.readingMinutes || 5,
          sections: data.sections || [],
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          categorySlug: data.categorySlug || '',
        });
        setLoading(false);
      })
      .catch(() => {
        setMessage('Ошибка загрузки статьи');
        setLoading(false);
      });
  }, [slug, locale]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch(`${API_BASE_URL}/kb/articles/slug/${encodeURIComponent(slug)}?locale=${locale}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title,
        description: article.description || null,
        cardTitle: article.cardTitle || null,
        cardDescription: article.cardDescription || null,
        sections: article.sections,
        metaTitle: article.metaTitle || null,
        metaDescription: article.metaDescription || null,
        readingMinutes: article.readingMinutes,
      }),
    });
    if (res.ok) {
      setMessage('Сохранено');
    } else {
      setMessage('Ошибка сохранения');
    }
    setSaving(false);
  };

  const updateSection = (index: number, updated: ArticleSection) => {
    const next = [...article.sections];
    next[index] = updated;
    setArticle({ ...article, sections: next });
  };

  const removeSection = (index: number) => {
    setArticle({ ...article, sections: article.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...article.sections];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    setArticle({ ...article, sections: next });
  };

  const addSection = (type: string) => {
    let section: ArticleSection;
    switch (type) {
      case 'image':
        section = { type: 'image', title: '', src: '', alt: '' };
        break;
      case 'image-pair':
        section = { type: 'image-pair', title: '', src1: '', src2: '' };
        break;
      default:
        section = { type: 'text', title: '', body: '' };
    }
    setArticle({ ...article, sections: [...article.sections, section] });
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin/knowledge-base" className={styles.backLink}>
              ← Назад к списку
            </Link>
            <h1 className={styles.title}>{article.title || slug}</h1>
          </div>
          <span className={styles.localeSelector}>{locale.toUpperCase()}</span>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.form}>
          <div className={styles.section}>
            <h2>Основное</h2>
            <label className={styles.field}>
              <span>Заголовок</span>
              <input
                type="text"
                value={article.title}
                onChange={(e) => setArticle({ ...article, title: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Описание</span>
              <textarea
                value={article.description}
                onChange={(e) => setArticle({ ...article, description: e.target.value })}
                placeholder="Краткое описание статьи"
                rows={4}
              />
            </label>
            <label className={styles.field}>
              <span>Время чтения (мин)</span>
              <input
                type="number"
                value={article.readingMinutes}
                onChange={(e) => setArticle({ ...article, readingMinutes: parseInt(e.target.value) || 1 })}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>SEO</h2>
            <label className={styles.field}>
              <span>Meta Title</span>
              <input
                type="text"
                value={article.metaTitle}
                onChange={(e) => setArticle({ ...article, metaTitle: e.target.value })}
                placeholder="Заголовок для поисковиков"
              />
            </label>
            <label className={styles.field}>
              <span>Meta Description</span>
              <textarea
                value={article.metaDescription}
                onChange={(e) => setArticle({ ...article, metaDescription: e.target.value })}
                placeholder="Описание для поисковиков"
                rows={4}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>Карточка статьи</h2>
            <label className={styles.field}>
              <span>Заголовок карточки</span>
              <input
                type="text"
                value={article.cardTitle}
                onChange={(e) => setArticle({ ...article, cardTitle: e.target.value })}
                placeholder="Заголовок для карточки в блоке Что почитать дальше"
              />
            </label>
            <label className={styles.field}>
              <span>Описание карточки</span>
              <textarea
                value={article.cardDescription}
                onChange={(e) => setArticle({ ...article, cardDescription: e.target.value })}
                placeholder="Описание карточки"
                rows={4}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>Секции контента</h2>
            {article.sections.map((section, i) => (
              <div key={i} className={styles.sectionCard}>
                <div className={styles.sectionCardHeader}>
                  <span className={styles.sectionType}>{section.type}</span>
                  <div className={styles.sectionActions}>
                    <button className={styles.moveButton} disabled={i === 0} onClick={() => moveSection(i, -1)}>↑</button>
                    <button className={styles.moveButton} disabled={i === article.sections.length - 1} onClick={() => moveSection(i, 1)}>↓</button>
                    <button className={styles.removeButton} onClick={() => removeSection(i)}>Удалить</button>
                  </div>
                </div>
                {renderSectionEditor(section, i, updateSection)}
              </div>
            ))}
            <div className={styles.addSectionRow}>
              <button className={styles.addButton} onClick={() => addSection('text')}>+ Текст</button>
              <button className={styles.addButton} onClick={() => addSection('image')}>+ Картинка</button>
              <button className={styles.addButton} onClick={() => addSection('image-pair')}>+ Пара картинок</button>
            </div>
          </div>

        </div>

        <div className={styles.actions}>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <a
            href={`/${locale}/knowledge-base/${slug}`}
            className={styles.previewLink}
            target="_blank"
          >
            Посмотреть на сайте →
          </a>
        </div>
      </div>
    </div>
  );
}

function renderSectionEditor(
  section: ArticleSection,
  index: number,
  update: (i: number, s: ArticleSection) => void,
) {
  const level: HeadingLevel = section.titleLevel === 'h1' ? 'h1' : 'h3';

  const titleFields = (
    <>
      <label className={styles.field}>
        <span>Уровень заголовка</span>
        <select
          value={level}
          onChange={(e) => update(index, { ...section, titleLevel: e.target.value as HeadingLevel })}
        >
          <option value="h3">H3 — подзаголовок</option>
          <option value="h1">H1 — главный заголовок</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Заголовок секции</span>
        <input
          type="text"
          value={section.title || ''}
          onChange={(e) => update(index, { ...section, title: e.target.value })}
        />
      </label>
    </>
  );

  switch (section.type) {
    case 'text':
      return (
        <>
          {titleFields}
          <div className={styles.field}>
            <span>Текст</span>
            <KbRichTextEditor
              value={section.body || ''}
              onChange={(v) => update(index, { ...section, body: v })}
              placeholder="Текст секции"
            />
          </div>
        </>
      );

    case 'image':
      return (
        <>
          {titleFields}
          <ImageUploadField
            label="Картинка"
            value={section.src}
            onChange={(url) => update(index, { ...section, src: url })}
          />
          <label className={styles.field}>
            <span>Alt текст</span>
            <input
              type="text"
              value={section.alt || ''}
              onChange={(e) => update(index, { ...section, alt: e.target.value })}
            />
          </label>
        </>
      );

    case 'image-pair':
      return (
        <>
          {titleFields}
          <ImageUploadField
            label="Картинка 1"
            value={section.src1}
            onChange={(url) => update(index, { ...section, src1: url })}
          />
          <ImageUploadField
            label="Картинка 2"
            value={section.src2}
            onChange={(url) => update(index, { ...section, src2: url })}
          />
        </>
      );

    default:
      return null;
  }
}
