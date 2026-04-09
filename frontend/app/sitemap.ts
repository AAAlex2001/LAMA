import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TemplatesIndex = {
  count: number;
  templates: Array<{ id: number; slug?: string | null }>;
};

type ArticlesIndex = {
  count: number;
  articles: Array<{ slug: string }>;
};

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function getSiteBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').replace(/\/+$/, '');
  if (env && /^https?:\/\//i.test(env)) return env;
  return 'https://lamaplanner.com';
}

function getApiBaseUrl(siteBaseUrl: string): string {
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(envBase)) return envBase;
  const basePath = envBase.startsWith('/') ? envBase : `/${envBase}`;
  return `${siteBaseUrl}${basePath}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const apiBaseUrl = getApiBaseUrl(baseUrl);
  const locales = ['ru', 'sr', 'en'] as const;

  const now = new Date();

  const templatesFallback: TemplatesIndex = { count: 0, templates: [] };
  const articlesFallback: ArticlesIndex = { count: 0, articles: [] };

  const [templateIndexes, articleIndexes] = await Promise.all([
    Promise.all(
      locales.map((locale) => fetchJson<TemplatesIndex>(`${apiBaseUrl}/templates?locale=${locale}`, templatesFallback))
    ),
    Promise.all(
      locales.map((locale) => fetchJson<ArticlesIndex>(`${apiBaseUrl}/kb/articles?locale=${locale}`, articlesFallback))
    ),
  ]);

  const templatesByLocale: Record<(typeof locales)[number], Array<{ id: number; slug: string }>> = {
    ru: (templateIndexes[0]?.templates || [])
      .map((t) => ({ id: Number(t.id), slug: String(t.slug || '') }))
      .filter((t) => Number.isFinite(t.id) && t.id >= 1 && t.slug),
    sr: (templateIndexes[1]?.templates || [])
      .map((t) => ({ id: Number(t.id), slug: String(t.slug || '') }))
      .filter((t) => Number.isFinite(t.id) && t.id >= 1 && t.slug),
    en: (templateIndexes[2]?.templates || [])
      .map((t) => ({ id: Number(t.id), slug: String(t.slug || '') }))
      .filter((t) => Number.isFinite(t.id) && t.id >= 1 && t.slug),
  };

  const articlesByLocale: Record<(typeof locales)[number], string[]> = {
    ru: (articleIndexes[0]?.articles || []).map((a) => a.slug).filter(Boolean),
    sr: (articleIndexes[1]?.articles || []).map((a) => a.slug).filter(Boolean),
    en: (articleIndexes[2]?.articles || []).map((a) => a.slug).filter(Boolean),
  };

  const routes: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    routes.push({
      url: `${baseUrl}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: locale === 'ru' ? 1 : 0.8,
      alternates: {
        languages: {
          ru: `${baseUrl}/ru`,
          sr: `${baseUrl}/sr`,
          en: `${baseUrl}/en`,
        },
      },
    });

    const localeTemplates = templatesByLocale[locale];
    for (const t of localeTemplates) {
      const languages: Record<string, string> = {};
      for (const altLocale of locales) {
        const alt = templatesByLocale[altLocale].find((x) => x.id === t.id);
        if (alt) {
          languages[altLocale] = `${baseUrl}/${altLocale}/template/${alt.slug}`;
        }
      }

      routes.push({
        url: `${baseUrl}/${locale}/template/${t.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: Object.keys(languages).length ? { languages } : undefined,
      });
    }

    for (const slug of articlesByLocale[locale]) {
      const languages: Record<string, string> = {};
      for (const altLocale of locales) {
        if (articlesByLocale[altLocale].includes(slug)) {
          languages[altLocale] = `${baseUrl}/${altLocale}/knowledge-base/${slug}`;
        }
      }

      routes.push({
        url: `${baseUrl}/${locale}/knowledge-base/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: Object.keys(languages).length ? { languages } : undefined,
      });
    }
  }

  return routes;
}
