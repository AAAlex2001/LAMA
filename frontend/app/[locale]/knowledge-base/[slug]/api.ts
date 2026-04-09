import type { Metadata } from 'next';
import type { KnowledgeArticle, NavigationCategory } from './types';

type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

type KBPageData = {
  article: KnowledgeArticle;
  navigation: NavigationCategory[];
  footer: FooterContent;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  return (await res.json()) as T;
}

export async function fetchArticle(slug: string, locale: string): Promise<KnowledgeArticle> {
  return fetchJson<KnowledgeArticle>(
    `${API_BASE}/kb/articles/slug/${encodeURIComponent(slug)}?locale=${locale}`,
  );
}

export async function fetchPageData(slug: string, locale: string): Promise<KBPageData> {
  const encoded = encodeURIComponent(slug);

  const [article, navigation, footer] = await Promise.all([
    fetchJson<KnowledgeArticle>(`${API_BASE}/kb/articles/slug/${encoded}?locale=${locale}`),
    fetchJson<NavigationCategory[]>(`${API_BASE}/kb/navigation?locale=${locale}`),
    fetchJson<FooterContent>(`${API_BASE}/footer?locale=${locale}`),
  ]);

  return { article, navigation, footer };
}

export async function buildArticleMetadata(slug: string, locale: string): Promise<Metadata> {
  const article = await fetchArticle(slug, locale);
  const title = article.metaTitle || article.title || 'LAMAplanner';
  const description = article.metaDescription || article.description || '';
  const canonical = `https://lamaplanner.com/${locale}/knowledge-base/${slug}`;

  return {
    title: `${title} | LAMAplanner`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | LAMAplanner`,
      description,
      url: canonical,
      siteName: 'LAMAplanner',
      locale,
      type: 'article',
    },
    twitter: { card: 'summary', title: `${title} | LAMAplanner`, description },
  };
}
