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
  subscribeBlocks?: Array<{
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink?: string | null;
    placement?: {
      position: 'after_block' | 'after_faq' | 'after_cards';
      afterBlockNumber?: number | null;
    } | null;
  }>;
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

  const blocksCount = Array.isArray(templateContent.blocks) ? templateContent.blocks.length : 0;

  const subscribeItemsRaw = Array.isArray(templateContent.subscribeBlocks) ? templateContent.subscribeBlocks : [];
  const subscribeLegacy = templateContent.subscribeBlock;
  const subscribeLegacyPlacement = templateContent.subscribePlacement;

  const subscribeItems = subscribeItemsRaw.length
    ? subscribeItemsRaw
    : subscribeLegacy
      ? [
          {
            ...subscribeLegacy,
            placement: subscribeLegacyPlacement ?? undefined,
          },
        ]
      : [];

  const subscribeAfterFaqNodes: React.ReactNode[] = [];
  const subscribeAfterCardsNodes: React.ReactNode[] = [];
  const subscribeInsertions: Array<{ afterBlockNumber: number; node: React.ReactNode; key?: string }> = [];

  subscribeItems.forEach((item, idx) => {
    const title = String(item?.title || '').trim();
    const subtitle = String(item?.subtitle || '').trim();
    const buttonText = String(item?.buttonText || '').trim();
    const buttonLink = String(item?.buttonLink || '').trim();
    const hasAny = Boolean(title || subtitle || buttonText || buttonLink);
    if (!hasAny) return;

    const node = (
      <TemplateSubscribe
        title={item.title}
        subtitle={item.subtitle}
        buttonText={item.buttonText}
        buttonLink={item.buttonLink}
      />
    );

    const placement = item?.placement ?? null;
    const position = placement?.position || 'after_cards';
    const requestedAfterBlock = position === 'after_block' ? Number(placement?.afterBlockNumber || 0) : 0;
    const canRenderInBlocks = requestedAfterBlock >= 1 && blocksCount >= requestedAfterBlock;

    if (position === 'after_faq') {
      subscribeAfterFaqNodes.push(<div key={`sub_after_faq_${idx}`}>{node}</div>);
      return;
    }

    if (position === 'after_block' && canRenderInBlocks) {
      subscribeInsertions.push({
        afterBlockNumber: requestedAfterBlock,
        node,
        key: `sub_after_block_${idx}`,
      });
      return;
    }

    // default / fallback
    subscribeAfterCardsNodes.push(<div key={`sub_after_cards_${idx}`}>{node}</div>);
  });

  return (
    <main>
      <Header locale={locale} />
      <Hero locale={locale} content={heroForTemplate} hideImagesOnMobile={true} variant="template" />
      
      {templateContent.blocks && templateContent.blocks.length > 0 && (
        <TemplateBlocks
          blocks={templateContent.blocks}
          insertions={subscribeInsertions}
        />
      )}

      {hasFaq && faqContent ? (
          <>
            <FAQ locale={locale} content={faqContent} />
          </>
        ) : null}

      {subscribeAfterFaqNodes.length ? subscribeAfterFaqNodes : null}

      {templateContent.cardsBlock &&
      Array.isArray(templateContent.cardsBlock.cards) &&
      templateContent.cardsBlock.cards.length > 0 ? (
        <TemplateCardsBlock headline={templateContent.cardsBlock.headline} cards={templateContent.cardsBlock.cards} />
      ) : null}

      {subscribeAfterCardsNodes.length ? subscribeAfterCardsNodes : null}

      {hasFaq && faqContent ? (
          <FAQDecoration />
        ) : null}

      <Footer locale={locale} content={footer} />
    </main>
  );
}
