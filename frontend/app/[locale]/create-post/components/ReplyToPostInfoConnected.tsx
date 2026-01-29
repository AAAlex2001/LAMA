import { useAppDispatch, useAppSelector } from '../store';
import * as replyToPostSlice from '../store/slices/replyToPost';
import ReplyToPostInfo from '@/components/reply-to-post-info/reply-to-post-info';

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function ReplyToPostInfoConnected() {
  const dispatch = useAppDispatch();
  const selectedPost = useAppSelector(state => state.replyToPost.selectedPost);

  if (!selectedPost) return null;

  const handleRemove = () => {
    dispatch(replyToPostSlice.setSelectedPost(null));
    dispatch(replyToPostSlice.setSelectedPostId(null));
  };

  const rawTitle = selectedPost.text || selectedPost.text_content || 'Без названия';
  const postTitle = stripHtmlTags(rawTitle);
  const publishedAt = selectedPost.published_at || selectedPost.created_at;

  return (
    <ReplyToPostInfo
      postTitle={postTitle}
      publishedAt={publishedAt}
      onRemove={handleRemove}
    />
  );
}
