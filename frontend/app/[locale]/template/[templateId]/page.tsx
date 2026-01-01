import Header from "../../../landing/header/header";
import Hero from "../../../landing/hero/hero";
import Footer from "../../../landing/footer/footer";
import TemplateBlocks from "@/components/template-blocks/template-blocks";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from 'next/navigation';
import styles from './template-content.module.scss';

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

type TemplatePageContent = {
  headline: string;
  lead: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  images?: Array<{ url: string; alt: string }>;
  blocks?: TemplateBlockContent[];
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

  return (
    <main>
      <Header locale={locale} />
      <Hero locale={locale} content={heroForTemplate} hideImagesOnMobile={true} variant="template" />
      
      {templateContent.blocks && templateContent.blocks.length > 0 && (
        <section className={styles.blocksContainer}>
          <TemplateBlocks blocks={templateContent.blocks} />
        </section>
      )}

      <Footer locale={locale} content={footer} />
    </main>
  );
}
