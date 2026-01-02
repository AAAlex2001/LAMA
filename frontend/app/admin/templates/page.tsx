'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import Button from '@/components/button/button';
import styles from './templates-admin.module.scss';

import { TemplateProvider } from './store/template-context';
import type { TemplatePageContent, FAQItem, TemplateCardItem } from './types';

import HeroSection from './hero';
import BlocksSection from './template-blocks';
import FAQSection from './faq';
import CardsSection from './cards';
import SubscribeSection from './subscribe';

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

  const faqIn = (safe as any).faq;
  const faqItemsIn = Array.isArray(faqIn?.faqItems) ? faqIn.faqItems : [];
  const faqItems = faqItemsIn
    .filter((it: any) => it && typeof it === 'object')
    .map((it: any) => ({ question: String(it.question ?? ''), answer: String(it.answer ?? '') }))
    .filter((it: FAQItem) => Boolean(it.question.trim() || it.answer.trim()));

  const faq: FAQContent = {
    headline: String(faqIn?.headline ?? ''),
    faqItems,
    primaryButtonText: faqIn?.primaryButtonText ?? '',
    primaryButtonLink: faqIn?.primaryButtonLink ?? '',
    secondaryButtonText: faqIn?.secondaryButtonText ?? '',
    secondaryButtonLink: faqIn?.secondaryButtonLink ?? '',
    helpText: faqIn?.helpText ?? '',
    botLink: faqIn?.botLink ?? '',
  };

  const hasFaq = Boolean(
    faq.headline.trim() ||
      faq.faqItems.length > 0 ||
      String(faq.primaryButtonText ?? '').trim() ||
      String(faq.primaryButtonLink ?? '').trim() ||
      String(faq.secondaryButtonText ?? '').trim() ||
      String(faq.secondaryButtonLink ?? '').trim() ||
      String(faq.helpText ?? '').trim() ||
      String(faq.botLink ?? '').trim()
  );

  const cardsBlockIn = (safe as any).cardsBlock;
  const cardsIn = Array.isArray(cardsBlockIn?.cards) ? cardsBlockIn.cards : [];
  const cards = cardsIn
    .filter((c: any) => c && typeof c === 'object')
    .map((c: any) => ({
      title: String(c.title ?? ''),
      text: String(c.text ?? ''),
      buttonText: String(c.buttonText ?? ''),
      buttonLink: (c.buttonLink ?? '') as any,
    }))
    .filter((c: TemplateCardItem) => Boolean(c.title.trim() || c.text.trim() || c.buttonText.trim() || String(c.buttonLink ?? '').trim()));

  const cardsBlock: CardsBlock = {
    headline: String(cardsBlockIn?.headline ?? ''),
    cards,
  };
  const hasCardsBlock = Boolean(cardsBlock.headline.trim() || cardsBlock.cards.length > 0);

  const subscribeBlocksIn = Array.isArray((safe as any).subscribeBlocks) ? (safe as any).subscribeBlocks : [];
  const subscribeBlocks = subscribeBlocksIn
    .filter((b: any) => b && typeof b === 'object')
    .map((b: any) => {
      const title = String(b.title ?? '').trim();
      const subtitle = String(b.subtitle ?? '').trim();
      const buttonText = String(b.buttonText ?? '').trim();
      const buttonLink = String(b.buttonLink ?? '').trim() || null;

      const placementPos = String(b.placement?.position ?? '').trim();
      const position = (placementPos === 'after_block' || placementPos === 'after_faq' ? placementPos : 'after_cards') as
        | 'after_block'
        | 'after_faq'
        | 'after_cards';
      const afterBlockNum = Number(b.placement?.afterBlockNumber ?? 0);
      const placement = {
        position,
        afterBlockNumber: position === 'after_block' && Number.isFinite(afterBlockNum) && afterBlockNum >= 1 ? afterBlockNum : null,
      };

      return title || subtitle || buttonText || buttonLink ? { title, subtitle, buttonText, buttonLink, placement } : null;
    })
    .filter(Boolean);

  return {
    headline: safe.headline ?? '',
    lead: safe.lead ?? '',
    body: safe.body ?? '',
    ctaText: safe.ctaText ?? '',
    ctaUrl: safe.ctaUrl ?? '',
    images: normalizedImages,
    blocks: normalizedBlocks,
    faq: hasFaq ? faq : null,
    cardsBlock: hasCardsBlock ? cardsBlock : null,
    subscribeBlocks,
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
    faq: {
      headline: '',
      faqItems: [],
      primaryButtonText: '',
      primaryButtonLink: '',
      secondaryButtonText: '',
      secondaryButtonLink: '',
      helpText: '',
      botLink: '',
    },
    cardsBlock: {
      headline: '',
      cards: [],
    },
    subscribeBlocks: [],
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

      const faqItems = (Array.isArray(content.faq?.faqItems) ? content.faq?.faqItems : [])
        .map((it) => ({
          question: String(it?.question ?? '').trim(),
          answer: String(it?.answer ?? '').trim(),
        }))
        .filter((it) => Boolean(it.question || it.answer));

      const faq = {
        headline: String(content.faq?.headline ?? '').trim(),
        faqItems,
        primaryButtonText: String(content.faq?.primaryButtonText ?? '').trim() || null,
        primaryButtonLink: String(content.faq?.primaryButtonLink ?? '').trim() || null,
        secondaryButtonText: String(content.faq?.secondaryButtonText ?? '').trim() || null,
        secondaryButtonLink: String(content.faq?.secondaryButtonLink ?? '').trim() || null,
        helpText: String(content.faq?.helpText ?? '').trim() || null,
        botLink: String(content.faq?.botLink ?? '').trim() || null,
      };

      const hasFaq = Boolean(
        faq.headline ||
          faqItems.length > 0 ||
          faq.primaryButtonText ||
          faq.primaryButtonLink ||
          faq.secondaryButtonText ||
          faq.secondaryButtonLink ||
          faq.helpText ||
          faq.botLink
      );

      const cards = (Array.isArray(content.cardsBlock?.cards) ? content.cardsBlock?.cards : [])
        .map((c) => ({
          title: String(c?.title ?? '').trim(),
          text: String(c?.text ?? '').trim(),
          buttonText: String(c?.buttonText ?? '').trim(),
          buttonLink: String(c?.buttonLink ?? '').trim() || null,
        }))
        .filter((c) => Boolean(c.title || c.text || c.buttonText || c.buttonLink));

      const cardsBlock = {
        headline: String(content.cardsBlock?.headline ?? '').trim(),
        cards,
      };
      const hasCardsBlock = Boolean(cardsBlock.headline || cards.length > 0);

      const subscribeBlocks = (Array.isArray(content.subscribeBlocks) ? content.subscribeBlocks : [])
        .map((b) => {
          const title = String(b?.title ?? '').trim();
          const subtitle = String(b?.subtitle ?? '').trim();
          const buttonText = String(b?.buttonText ?? '').trim();
          const buttonLink = String(b?.buttonLink ?? '').trim() || null;

          const placementPos = b?.placement?.position ?? 'after_cards';
          const afterBlockNum = Number(b?.placement?.afterBlockNumber ?? 0);
          const placement = {
            position: placementPos,
            afterBlockNumber: placementPos === 'after_block' && Number.isFinite(afterBlockNum) && afterBlockNum >= 1 ? afterBlockNum : null,
          };

          const hasAny = Boolean(title || subtitle || buttonText || buttonLink);
          return hasAny ? { title, subtitle, buttonText, buttonLink, placement } : null;
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
            faq: hasFaq ? faq : null,
            cardsBlock: hasCardsBlock ? cardsBlock : null,
            subscribeBlocks,
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
      const d = await res.json();
      return d?.url || null;
    } catch {
      setMessage('❌ Ошибка загрузки');
      return null;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  const contextValue = { content, setContent, setMessage, uploadImage };

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
              <TemplateProvider value={contextValue}>
                <div className={styles.form}>
                  <HeroSection />
                  <BlocksSection />
                  <CardsSection />
                  <FAQSection />
                  <SubscribeSection />
                </div>
              </TemplateProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
