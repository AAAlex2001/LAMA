import Header from '../../../landing/header/header';
import LandingScrollBehavior from '../../../landing/LandingScrollBehavior';
import KnowledgeArticleView from './KnowledgeArticleView';
import { getMockArticle } from './mock';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function KnowledgeBaseArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = getMockArticle(slug);
  const isLoggedIn = false;

  return (
    <main className="landing-page">
      <LandingScrollBehavior />
      <Header locale={locale} />
      <KnowledgeArticleView article={article} isLoggedIn={isLoggedIn} locale={locale} />
    </main>
  );
}
