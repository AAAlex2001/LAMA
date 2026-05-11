import { usePublicationByIdQuery } from '@/store/publications/queries';
import { useAppDispatch, useAppSelector } from '../store';
import * as settingsSlice from '../store/slices/settings';
import ReplyToPostInfo from '@/components/reply-to-post-info/reply-to-post-info';

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function ReplyToPostInfoConnected() {
  const dispatch = useAppDispatch();
  const replyToPostId = useAppSelector((s) => s.settings.replyToPostId);
  const { data: post } = usePublicationByIdQuery(replyToPostId);

  if (!post) return null;

  const rawTitle = post.text_content || 'Без названия';
  const postTitle = stripHtmlTags(rawTitle);
  const publishedAt = post.published_at || post.created_at;

  return (
    <ReplyToPostInfo
      postTitle={postTitle}
      publishedAt={publishedAt}
      onRemove={() => dispatch(settingsSlice.setReplyToPostId(null))}
    />
  );
}
