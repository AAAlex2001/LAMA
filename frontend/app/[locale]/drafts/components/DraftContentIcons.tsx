'use client';

import {
  PhotoIcon,
  VideoIcon,
  AudioIcon,
  DocIcon,
  GifIcon,
  QuizIcon,
  InlineButtonIcon,
} from '@/components/icons';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import styles from './draft-card.module.scss';

interface DraftContentIconsProps {
  draft: Draft;
}

function getMediaTypes(urls: string[]): Set<string> {
  const types = new Set<string>();
  for (const url of urls) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
      types.add('photo');
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      types.add('video');
    } else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) {
      types.add('audio');
    } else if (['gif'].includes(ext)) {
      types.add('gif');
    } else {
      types.add('doc');
    }
  }
  return types;
}

export default function DraftContentIcons({ draft }: DraftContentIconsProps) {
  const mediaTypes = draft.media_urls?.length ? getMediaTypes(draft.media_urls) : new Set<string>();
  const hasQuiz = !!draft.poll_data?.question;
  const hasInlineButtons = !!draft.inline_keyboard?.buttons?.length;

  const icons: { key: string; node: React.ReactNode }[] = [];

  if (mediaTypes.has('photo')) icons.push({ key: 'photo', node: <PhotoIcon width={18} height={18} color="#B0B4B8" /> });
  if (mediaTypes.has('video')) icons.push({ key: 'video', node: <VideoIcon width={18} height={18} color="#B0B4B8" /> });
  if (mediaTypes.has('audio')) icons.push({ key: 'audio', node: <AudioIcon width={18} height={18} color="#B0B4B8" /> });
  if (mediaTypes.has('doc')) icons.push({ key: 'doc', node: <DocIcon width={18} height={18} color="#B0B4B8" /> });
  if (mediaTypes.has('gif')) icons.push({ key: 'gif', node: <GifIcon width={18} height={18} color="#B0B4B8" /> });
  if (hasQuiz) icons.push({ key: 'quiz', node: <QuizIcon width={16} height={16} color="#B0B4B8" /> });
  if (hasInlineButtons) icons.push({ key: 'inline', node: <InlineButtonIcon width={18} height={18} color="#B0B4B8" /> });

  return (
    <div className={styles.contentIcons}>
      {icons.map(({ key, node }) => (
        <span key={key} className={styles.contentIcon}>{node}</span>
      ))}
    </div>
  );
}
