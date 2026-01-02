import Header from "../../../landing/header/header";
import Hero from "../../../landing/hero/hero";
import Footer from "../../../landing/footer/footer";
import FAQ from "../../../landing/faq/faq";
import FAQDecoration from "../../../landing/faq-decoration/faq-decoration";
import TemplateBlocks from "@/components/template-block/template-blocks";
import TemplateCardsBlock from "@/components/template-card/template-cards-block";
import TemplateSubscribe from "@/components/template-subscribe/template-subscribe";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string; templateId: string }>;
};

type HeroContent = {
  headline: string;
  paragraph: string;
  paragraphSecondary: string;
  buttonText: string;
  images: Array<{ url: string; alt: string }>;
  templateImages?: Array<{ url: string; alt: string }>;
};

type TemplateBlockAdvantage = {
  text: string;
};

type TemplateBlockContent = {
  title: string;
  subtitle: string;
  description: string;
  advantages?: TemplateBlockAdvantage[];
  image?: { url: string; alt: string };
  imagePosition?: 'left' | 'right';
};

type FAQItem = {
  question: string;
  answer: string;
};

type FAQContent = {
  headline: string;
  faqItems: FAQItem[];
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  helpText?: string;
  botLink?: string;
};

type TemplatePageContent = {
  headline: string;
  lead: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  images?: Array<{ url: string; alt: string }>;
  blocks?: TemplateBlockContent[];
  faq?: FAQContent | null;
  cardsBlock?: {
    headline: string;
    cards: Array<{ title: string; text: string; buttonText: string; buttonLink?: string | null }>;
  } | null;
  subscribeBlock?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink?: string | null;
  } | null;
  subscribePlacement?: {
    position: 'after_block' | 'after_faq' | 'after_cards';
    afterBlockNumber?: number | null;
  } | null;
};

type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

type TemplateItem = {
  id: number;
  slug: string;
};

async function getApiBaseUrl(): Promise<string> {
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(envBase)) return envBase;

  const h = await headers();
  const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  const basePath = envBase.startsWith('/') ? envBase : `/${envBase}`;

  if (!host) return envBase;
  return `${proto}://${host}${basePath}`;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function TemplatePage({ params }: Props) {
  const { locale, templateId } = await params;

  const raw = String(templateId || '').trim();
  if (!raw) notFound();

  const apiBaseUrl = await getApiBaseUrl();

  const heroFallback: HeroContent = {
    headline: '',
    paragraph: '',
    paragraphSecondary: '',
    buttonText: '',
    images: [],
  };

  const templateContentFallback: TemplatePageContent = {
    headline: '',
    lead: '',
    body: '',
    ctaText: '',
    ctaUrl: '',
    images: [],
  };

  const footerFallback: FooterContent = {
    brandName: '',
    copyright: '',
    telegramLink: '',
    instagramLink: '',
    columns: [],
  };

  const [hero, footer] = await Promise.all([
    fetchJson<HeroContent>(`${apiBaseUrl}/hero?locale=${locale}`, heroFallback),
    fetchJson<FooterContent>(`${apiBaseUrl}/footer?locale=${locale}`, footerFallback),
  ]);

  const baseHeroForTemplate: HeroContent = {
    headline: hero?.headline || '',
    paragraph: hero?.paragraph || '',
    paragraphSecondary: (hero as any)?.paragraphSecondary || '',
    buttonText: hero?.buttonText || '',
    images: [],
  };

  const isNumeric = /^\d+$/.test(raw);
  if (isNumeric) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) notFound();

    const templatesIndex = await fetchJson<{ templates: TemplateItem[] }>(
      `${apiBaseUrl}/templates?locale=${locale}`,
      { templates: [] }
    );

    const match = (templatesIndex.templates || []).find((t) => Number(t.id) === id && t.slug);
    if (!match) notFound();
    permanentRedirect(`/${locale}/template/${match.slug}`);
  } else {
    const res = await fetch(`${apiBaseUrl}/templates/slug/${encodeURIComponent(raw)}?locale=${locale}`, {
      cache: 'no-store',
    });
    if (!res.ok) notFound();
  }

  const templateContent = await fetchJson<TemplatePageContent>(
    `${apiBaseUrl}/templates/slug/${encodeURIComponent(raw)}/content?locale=${locale}`,
    templateContentFallback
  );

  const templateImages = Array.isArray(templateContent?.images) ? templateContent.images : [];

  const heroForTemplate: HeroContent = {
    ...baseHeroForTemplate,
    headline: templateContent?.headline || baseHeroForTemplate.headline,
    paragraph: templateContent?.lead || baseHeroForTemplate.paragraph,
    buttonText: (templateContent?.ctaText || baseHeroForTemplate.buttonText) as string,
    images: templateImages,
  };

  const faqContent = templateContent.faq ?? null;
  const hasFaq = Boolean(
    faqContent &&
      (String(faqContent.headline || '').trim() ||
        (Array.isArray(faqContent.faqItems) && faqContent.faqItems.length > 0))
  );

  const subscribe = templateContent.subscribeBlock;
  const subscribePlacement = templateContent.subscribePlacement;
  const hasSubscribe = Boolean(
    subscribe &&
      (String(subscribe.title || '').trim() ||
        String(subscribe.subtitle || '').trim() ||
        String(subscribe.buttonText || '').trim() ||
        String(subscribe.buttonLink || '').trim())
  );

  const subscribeNode = hasSubscribe && subscribe ? (
    <TemplateSubscribe
      title={subscribe.title}
      subtitle={subscribe.subtitle}
      buttonText={subscribe.buttonText}
      buttonLink={subscribe.buttonLink}
    />
  ) : null;

  const blocksCount = Array.isArray(templateContent.blocks) ? templateContent.blocks.length : 0;
  const requestedAfterBlock =
    subscribePlacement?.position === 'after_block'
      ? Number(subscribePlacement.afterBlockNumber || 0)
      : 0;
  const canRenderInBlocks = Boolean(subscribeNode && requestedAfterBlock >= 1 && blocksCount >= requestedAfterBlock);
  const renderAfterFaq = Boolean(subscribeNode && subscribePlacement?.position === 'after_faq');
  const renderAfterCards = Boolean(
    subscribeNode &&
      (!subscribePlacement || subscribePlacement.position === 'after_cards' || (subscribePlacement.position === 'after_block' && !canRenderInBlocks))
  );

  return (
    <main>
      <Header locale={locale} />
      <Hero locale={locale} content={heroForTemplate} hideImagesOnMobile={true} variant="template" />
      
      {templateContent.blocks && templateContent.blocks.length > 0 && (
        <TemplateBlocks
          blocks={templateContent.blocks}
          insertAfterBlockNumber={canRenderInBlocks ? requestedAfterBlock : undefined}
          insertNode={canRenderInBlocks ? subscribeNode : undefined}
        />
      )}

      {hasFaq && faqContent ? (
          <>
            <FAQ locale={locale} content={faqContent} />
          </>
        ) : null}

      {renderAfterFaq ? subscribeNode : null}

      {templateContent.cardsBlock &&
      Array.isArray(templateContent.cardsBlock.cards) &&
      templateContent.cardsBlock.cards.length > 0 ? (
        <TemplateCardsBlock headline={templateContent.cardsBlock.headline} cards={templateContent.cardsBlock.cards} />
      ) : null}

      {renderAfterCards ? subscribeNode : null}

      {hasFaq && faqContent ? (
          <FAQDecoration />
        ) : null}

      <Footer locale={locale} content={footer} />
    </main>
  );
}
