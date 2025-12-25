import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://lamaplanner.com';
  const locales = ['ru', 'sr', 'en'];
  
  const routes = locales.map(locale => ({
    url: `${baseUrl}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: locale === 'ru' ? 1 : 0.8,
    alternates: {
      languages: {
        ru: `${baseUrl}/ru`,
        sr: `${baseUrl}/sr`,
        en: `${baseUrl}/en`,
      },
    },
  }));

  return routes;
}
