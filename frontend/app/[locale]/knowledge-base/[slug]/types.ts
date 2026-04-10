export type ArticleSection =
  | { type: 'text'; title?: string; body?: string }
  | { type: 'image'; title?: string; src: string; alt?: string }
  | { type: 'image-pair'; title?: string; src1: string; src2: string };

export type KnowledgeArticle = {
  slug: string;
  title: string;
  description: string;
  cardTitle?: string;
  cardDescription?: string;
  readingMinutes: number;
  sections: ArticleSection[];
  likesCount: number;
  dislikesCount: number;
  metaTitle?: string;
  metaDescription?: string;
  categorySlug?: string;
};

export type KnowledgeArticleListItem = {
  slug: string;
  title: string;
  description?: string;
  cardTitle?: string;
  cardDescription?: string;
  readingMinutes: number;
  categorySlug?: string;
};

export type NavigationCategory = {
  slug: string;
  title: string;
  entries: Array<{ slug: string; title: string }>;
};
