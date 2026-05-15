
export type FAQItem = {
  question: string;
  answer: string;
};

export type FAQContent = {
  headline: string;
  faqItems: FAQItem[];
  primaryButtonText?: string | null;
  primaryButtonLink?: string | null;
  secondaryButtonText?: string | null;
  secondaryButtonLink?: string | null;
  helpText?: string | null;
  botLink?: string | null;
};

export type TemplateCardItem = {
  title: string;
  text: string;
  buttonText: string;
  buttonLink?: string | null;
};

export type CardsBlock = {
  headline: string;
  cards: TemplateCardItem[];
};

export type TemplateSubscribeBlock = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string | null;
  placement?: {
    position: 'after_block' | 'after_faq' | 'after_cards';
    afterBlockNumber?: number | null;
  };
};

export type TemplateBlockItem = {
  title: string;
  subtitle: string;
  description: string;
  advantages?: Array<{ text: string }>;
  image?: { url: string; alt: string };
  imagePosition?: 'left' | 'right';
};

export type TemplatePageContent = {
  headline: string;
  lead: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  images?: Array<{ url: string; alt: string }>;
  blocks?: TemplateBlockItem[];
  faq?: FAQContent | null;
  cardsBlock?: CardsBlock | null;
  subscribeBlocks?: TemplateSubscribeBlock[];
};
