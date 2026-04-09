export type ArticleSection =
  | { type: 'text'; title?: string; body?: string; items?: string[] }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'image-pair'; src1: string; src2: string }
  | { type: 'errors'; title: string; items: string[] };

export type KnowledgeArticle = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  sections: ArticleSection[];
  related: Array<{ title: string; description?: string; slug: string; readingMinutes?: number }>;
  likesCount: number;
  dislikesCount: number;
  metaTitle?: string;
  metaDescription?: string;
  categorySlug?: string;
};

export type NavigationCategory = {
  slug: string;
  title: string;
  entries: Array<{ slug: string; title: string }>;
};
