import type { Metadata } from 'next';
import type { KnowledgeArticle, KnowledgeArticleListItem, NavigationCategory } from './types';

type FooterContent = {
  brandName: string;
  copyright: string;
  telegramLink: string;
  instagramLink: string;
  columns: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
};

type HeaderContent = {
  brandPrefix: string;
  brandSuffix: string;
  toolsLabel: string;
  toolsOrder?: number;
  loginText: string;
  loginHref: string;
  registerText: string;
  registerHref: string;
  telegramText: string;
  telegramHref: string;
  navLinks: Array<{ text: string; href: string; order?: number }>;
};

type ToolsContent = {
  items: Array<{ title: string; description?: string | null; href: string; order?: number }>;
};

type KBPageData = {
  article: KnowledgeArticle;
  articles: KnowledgeArticleListItem[];
  navigation: NavigationCategory[];
  footer: FooterContent;
  header: HeaderContent | null;
  tools: ToolsContent | null;
};

type ArticleListResponse = {
  count: number;
  articles: KnowledgeArticleListItem[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  return (await res.json()) as T;
}

async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchArticle(slug: string, locale: string): Promise<KnowledgeArticle> {
  return fetchJson<KnowledgeArticle>(
    `${API_BASE}/kb/articles/slug/${encodeURIComponent(slug)}?locale=${locale}`,
  );
}

export async function fetchPageData(slug: string, locale: string): Promise<KBPageData> {
  const encoded = encodeURIComponent(slug);

  const [article, articleList, navigation, footer, header, tools] = await Promise.all([
    fetchJson<KnowledgeArticle>(`${API_BASE}/kb/articles/slug/${encoded}?locale=${locale}`),
    fetchJson<ArticleListResponse>(`${API_BASE}/kb/articles?locale=${locale}`),
    fetchJson<NavigationCategory[]>(`${API_BASE}/kb/navigation?locale=${locale}`),
    fetchJson<FooterContent>(`${API_BASE}/footer?locale=${locale}`),
    fetchJsonOptional<HeaderContent>(`${API_BASE}/header?locale=${locale}`),
  ]);

  return { article, articles: articleList.articles || [], navigation, footer, header, tools };
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
