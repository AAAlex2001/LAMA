import Header from "../../../landing/header/header";
import Hero from "../../../landing/hero/hero";
import Footer from "../../../landing/footer/footer";
import FAQ from "../../../landing/faq/faq";
import FAQDecoration from "../../../landing/faq-decoration/faq-decoration";
import LandingScrollBehavior from "../../../landing/LandingScrollBehavior";
import TemplateBlocks from "@/components/template-block/template-blocks";
import TemplateCardsBlock from "@/components/template-card/template-cards-block";
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from "next";
import { getApiBaseUrl, fetchJson, fetchJsonOptional } from './_lib/api';
import { buildSubscribeBlocks } from './_lib/subscribe-blocks';
import type {
  HeroContent,
  TemplatePageContent,
  FooterContent,
  HeaderContent,
  ToolsContent,
  TemplateItem,
} from './_lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string; templateId: string }>;
};

const TEMPLATE_CONTENT_FALLBACK: TemplatePageContent = {
  headline: '',
  lead: '',
  body: '',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, templateId } = await params;
  const raw = String(templateId || '').trim();

  if (!raw) {
    return {
      title: 'Template Not Found',
      description: 'The requested template could not be found.',
    };
  }

  try {
    const apiBaseUrl = await getApiBaseUrl();
    const templateContent = await fetchJson<TemplatePageContent>(
      `${apiBaseUrl}/templates/slug/${encodeURIComponent(raw)}/content?locale=${locale}`,
      TEMPLATE_CONTENT_FALLBACK,
    );

    const title = templateContent?.headline || 'LAMAplanner Template';
    const description =
      templateContent?.lead ||
      templateContent?.body?.substring(0, 160) ||
      'Template for Telegram posting automation';
    const imageUrl = templateContent?.images?.[0]?.url || '';

    return {
      title: `${title} | LAMAplanner`,
      description,
      alternates: {
        canonical: `https://lamaplanner.com/${locale}/template/${raw}`,
      },
      openGraph: {
        title: `${title} | LAMAplanner`,
        description,
        url: `https://lamaplanner.com/${locale}/template/${raw}`,
        siteName: 'LAMAplanner',
        locale,
        type: 'article',
        ...(imageUrl && {
          images: [{ url: imageUrl, alt: title }],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | LAMAplanner`,
        description,
        ...(imageUrl && { images: [imageUrl] }),
      },
    };
  } catch {
    return {
      title: 'LAMAplanner Template',
      description: 'Template for Telegram posting automation',
    };
  }
}

export default async function TemplatePage({ params }: Props) {
  const { locale, templateId } = await params;
  const raw = String(templateId || '').trim();
  if (!raw) notFound();

  const apiBaseUrl = await getApiBaseUrl();

  const heroFallback: HeroContent = {
    headline: '', paragraph: '', paragraphSecondary: '', buttonText: '', images: [],
  };
  const footerFallback: FooterContent = {
    brandName: '', copyright: '', telegramLink: '', instagramLink: '', columns: [],
  };

  const [hero, footer, header, tools] = await Promise.all([
    fetchJson<HeroContent>(`${apiBaseUrl}/hero?locale=${locale}`, heroFallback),
    fetchJson<FooterContent>(`${apiBaseUrl}/footer?locale=${locale}`, footerFallback),
    fetchJsonOptional<HeaderContent>(`${apiBaseUrl}/header?locale=${locale}`),
    fetchJsonOptional<ToolsContent>(`${apiBaseUrl}/tools?locale=${locale}`),
  ]);

  const isNumeric = /^\d+$/.test(raw);
  if (isNumeric) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) notFound();

    const templatesIndex = await fetchJson<{ templates: TemplateItem[] }>(
      `${apiBaseUrl}/templates?locale=${locale}`,
      { templates: [] },
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
    { ...TEMPLATE_CONTENT_FALLBACK, ctaText: '', ctaUrl: '', images: [] },
  );

  const templateImages = Array.isArray(templateContent?.images) ? templateContent.images : [];

  const heroForTemplate: HeroContent = {
    headline: templateContent?.headline || hero?.headline || '',
    paragraph: templateContent?.lead || hero?.paragraph || '',
    paragraphSecondary: (hero as { paragraphSecondary?: string })?.paragraphSecondary || '',
    buttonText: (templateContent?.ctaText || hero?.buttonText || '') as string,
    buttonUrl: templateContent?.ctaUrl || hero?.buttonUrl,
    images: templateImages,
  };

  const faqContent = templateContent.faq ?? null;
  const hasFaq = Boolean(
    faqContent &&
      (String(faqContent.headline || '').trim() ||
        (Array.isArray(faqContent.faqItems) && faqContent.faqItems.length > 0)),
  );

  const subscribe = buildSubscribeBlocks(templateContent);

  return (
    <main className="landing-page">
      <LandingScrollBehavior />
      <Header locale={locale} content={header || undefined} toolsItems={tools?.items} />
      <Hero locale={locale} content={heroForTemplate} hideImagesOnMobile={true} variant="template" />

      {templateContent.blocks && templateContent.blocks.length > 0 && (
        <TemplateBlocks
          blocks={templateContent.blocks}
          insertions={subscribe.insertions}
        />
      )}

      {hasFaq && faqContent && (
        <FAQ locale={locale} content={faqContent} whiteBackground={true} />
      )}

      {subscribe.afterFaq.length > 0 && subscribe.afterFaq}

      {templateContent.cardsBlock &&
       Array.isArray(templateContent.cardsBlock.cards) &&
       templateContent.cardsBlock.cards.length > 0 && (
        <TemplateCardsBlock
          headline={templateContent.cardsBlock.headline}
          cards={templateContent.cardsBlock.cards}
        />
      )}

      {subscribe.afterCards.length > 0 && subscribe.afterCards}

      {hasFaq && faqContent && <FAQDecoration />}

      <Footer locale={locale} content={footer} />
    </main>
  );
}
