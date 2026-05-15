import type { MediaFile } from '@/components/media-preview';

export interface QuizPreviewData {
  mode: 'quiz' | 'poll';
  question: string;
  options: string[];
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  correctAnswerIndex?: number;
}

export interface ChannelPreviewData {
  title: string;
  subtitle?: string;
  photoUrl?: string;
  membersCount?: number;
}

export interface DocumentPreviewItem {
  id: string;
  name: string;
  size?: string;
  url?: string;
}

export interface MediaPreviewItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  blur?: boolean;
}

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelPreviewData;
  html: string;
  mediaFiles: MediaFile[];
  quizData?: QuizPreviewData;
}
