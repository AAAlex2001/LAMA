import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type NavigationCategory = {
  slug: string;
  title: string;
  entries: Array<{ slug: string; title: string }>;
};

async function fetchNavigation(locale: string): Promise<NavigationCategory[]> {
  const response = await fetch(`${API_BASE}/kb/navigation?locale=${locale}`, { cache: 'no-store' });
  return response.json();
}

type Props = { params: Promise<{ locale: string }> };

export default async function KnowledgeBaseIndexPage({ params }: Props) {
  const { locale } = await params;
  const navigation = await fetchNavigation(locale);
  const firstArticleSlug = navigation.flatMap((category) => category.entries)[0]?.slug;

  if (!firstArticleSlug) {
    redirect(`/${locale}/create-post`);
  }

  redirect(`/${locale}/knowledge-base/${firstArticleSlug}`);
}