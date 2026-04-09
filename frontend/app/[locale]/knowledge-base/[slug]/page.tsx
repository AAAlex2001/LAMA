import Header from '../../../landing/header/header';
import Footer from '../../../landing/footer/footer';
import LandingScrollBehavior from '../../../landing/LandingScrollBehavior';
import KnowledgeArticleView from './KnowledgeArticleView';
import { buildArticleMetadata, fetchPageData } from './api';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  return buildArticleMetadata(slug, locale);
}

export default async function KnowledgeBaseArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!slug) notFound();

  const { article, navigation, footer } = await fetchPageData(slug, locale);
  if (!article.slug) notFound();

  return (
    <main className="landing-page">
      <LandingScrollBehavior />
      <Header locale={locale} />
      <KnowledgeArticleView article={article} isLoggedIn={false} locale={locale} navigation={navigation} />
      <Footer locale={locale} content={footer} />
    </main>
  );
}
