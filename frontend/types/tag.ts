export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';

export const TAG_COLORS: TagColor[] = ['#FAC7C7', '#FDE57E', '#B8F1D2', '#B8DBF1', '#B8B9F1'];

export interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
}

export interface ApiTag {
  id: number;
  name: string;
  color?: TagColor;
  created_at?: string;
}

export interface TagsResponse {
  items?: Tag[];
  total?: number;
}
