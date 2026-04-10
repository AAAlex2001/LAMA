export type Variant = 'dropdown' | 'sidebar';

export type LeafItem = {
  id: string;
  title: string;
  href?: string;
};

export type NestedDropdownConfig = {
  id: string;
  title: string;
  isActive?: boolean;
  isOpenByDefault?: boolean;
  items: LeafItem[];
};

export type SectionEntry = {
  id: string;
  title: string;
  isActive?: boolean;
  href?: string;
  nested?: NestedDropdownConfig;
};

export type SectionConfig = {
  id: string;
  title: string;
  isOpenByDefault?: boolean;
  entries?: SectionEntry[];
};
