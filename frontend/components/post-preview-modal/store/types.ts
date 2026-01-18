import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';

// Quiz/Poll preview data
export interface QuizPreviewData {
  mode: 'quiz' | 'poll';
  question: string;
  options: string[];
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  correctAnswerIndex?: number;
}

// Channel info for preview header
export interface ChannelPreviewData {
  title: string;
  subtitle?: string;
  photoUrl?: string;
  membersCount?: number;
}

// Document item for documents preview
export interface DocumentPreviewItem {
  id: string;
  name: string;
  size?: string;
  url?: string;
}

// Media item with resolved URL
export interface MediaPreviewItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  blur?: boolean;
}

// Main modal props
export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelPreviewData;
  html: string;
  mediaFiles: MediaFile[];
  quizData?: QuizPreviewData;
}
