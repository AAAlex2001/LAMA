'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './article-editor.module.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type ArticleSection =
  | { type: 'text'; title?: string; body?: string; items?: string[] }
  | { type: 'image'; title?: string; src: string; alt?: string }
  | { type: 'image-pair'; title?: string; src1: string; src2: string }
  | { type: 'errors'; title: string; items: string[] };

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  sections: ArticleSection[];
  relatedArticles: { slug: string; description: string }[];
  metaTitle: string;
  metaDescription: string;
  categorySlug: string;
}

function emptyArticle(): ArticleData {
  return {
    slug: '',
    title: '',
    description: '',
    readingMinutes: 5,
    sections: [],
    relatedArticles: [],
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

function parseRelated(data: Record<string, unknown>): { slug: string; description: string }[] {
  if (Array.isArray(data.related) && data.related.length > 0) {
    return data.related.map((r: { slug?: string; description?: string }) => ({
      slug: r.slug || '',
      description: r.description || '',
    }));
  }
  if (Array.isArray(data.relatedSlugs)) {
    return data.relatedSlugs.map((s: string | { slug?: string; description?: string }) => {
      if (typeof s === 'string') return { slug: s, description: '' };
      return { slug: s.slug || '', description: s.description || '' };
    });
  }
  return [];
}

function GradientTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrapGradient = () => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    onChange(before + '==' + selected + '==' + after);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start;
      ta.selectionEnd = end + 4;
    }, 0);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button
          type="button"
          onClick={wrapGradient}
          style={{
            padding: '2px 10px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid #3B82F6',
            background: 'linear-gradient(90deg, #3B82F6, #295AAA)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Градиент
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
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
          readingMinutes: data.readingMinutes || 5,
          sections: data.sections || [],
          relatedArticles: parseRelated(data),
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
        sections: article.sections,
        relatedSlugs: article.relatedArticles
          .map((relatedArticle) => relatedArticle.slug.trim())
          .filter(Boolean),
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
      case 'errors':
        section = { type: 'errors', title: '', items: [''] };
        break;
      default:
        section = { type: 'text', title: '', body: '', items: [] };
    }
    setArticle({ ...article, sections: [...article.sections, section] });
  };

  const addRelatedArticle = () => {
    setArticle({ ...article, relatedArticles: [...article.relatedArticles, { slug: '', description: '' }] });
  };

  const updateRelatedArticle = (index: number, field: 'slug' | 'description', value: string) => {
    const next = [...article.relatedArticles];
    next[index] = { ...next[index], [field]: value };
    setArticle({ ...article, relatedArticles: next });
  };

  const removeRelatedArticle = (index: number) => {
    setArticle({ ...article, relatedArticles: article.relatedArticles.filter((_, i) => i !== index) });
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
                rows={3}
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
                rows={2}
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
              <button className={styles.addButton} onClick={() => addSection('errors')}>+ Ошибки</button>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Связанные статьи</h2>
            {article.relatedArticles.map((ra, i) => (
              <div key={i} className={styles.relatedRow}>
                <input
                  type="text"
                  value={ra.slug}
                  onChange={(e) => updateRelatedArticle(i, 'slug', e.target.value)}
                  placeholder="slug статьи"
                />
                <textarea
                  value={ra.description}
                  onChange={(e) => updateRelatedArticle(i, 'description', e.target.value)}
                  placeholder="Описание для карточки"
                  rows={2}
                  style={{ width: '100%' }}
                />
                <button className={styles.smallRemoveButton} onClick={() => removeRelatedArticle(i)}>×</button>
              </div>
            ))}
            <button className={styles.smallAddButton} onClick={addRelatedArticle}>+ Добавить</button>
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
  switch (section.type) {
    case 'text':
      return (
        <>
          <label className={styles.field}>
            <span>Заголовок секции</span>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => update(index, { ...section, title: e.target.value })}
            />
          </label>
          <div className={styles.field}>
            <span>Текст</span>
            <GradientTextarea
              value={section.body || ''}
              onChange={(v) => update(index, { ...section, body: v })}
            />
          </div>
          <div>
            <span style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Пункты списка</span>
            {(section.items || []).map((item, j) => (
              <div key={j} className={styles.itemRow}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const items = [...(section.items || [])];
                    items[j] = e.target.value;
                    update(index, { ...section, items });
                  }}
                />
                <button
                  className={styles.smallRemoveButton}
                  onClick={() => {
                    const items = (section.items || []).filter((_, k) => k !== j);
                    update(index, { ...section, items });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className={styles.smallAddButton}
              onClick={() => update(index, { ...section, items: [...(section.items || []), ''] })}
            >
              + Пункт
            </button>
          </div>
        </>
      );

    case 'image':
      return (
        <>
          <label className={styles.field}>
            <span>Заголовок (H3)</span>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => update(index, { ...section, title: e.target.value })}
            />
          </label>
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
          <label className={styles.field}>
            <span>Заголовок (H3)</span>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => update(index, { ...section, title: e.target.value })}
            />
          </label>
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

    case 'errors':
      return (
        <>
          <label className={styles.field}>
            <span>Заголовок</span>
            <input
              type="text"
              value={section.title}
              onChange={(e) => update(index, { ...section, title: e.target.value })}
            />
          </label>
          <div>
            <span style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Пункты ошибок</span>
            {section.items.map((item, j) => (
              <div key={j} className={styles.itemRow}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const items = [...section.items];
                    items[j] = e.target.value;
                    update(index, { ...section, items });
                  }}
                />
                <button
                  className={styles.smallRemoveButton}
                  onClick={() => update(index, { ...section, items: section.items.filter((_, k) => k !== j) })}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className={styles.smallAddButton}
              onClick={() => update(index, { ...section, items: [...section.items, ''] })}
            >
              + Пункт
            </button>
          </div>
        </>
      );
  }
}
