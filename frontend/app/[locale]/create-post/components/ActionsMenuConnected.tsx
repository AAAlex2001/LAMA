'use client';

import Button from '@/components/button/button';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
} from '@/components/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { selectSelectedChannels } from '../store/selectors';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as uiSlice from '../store/slices/ui';
import * as draftsSlice from '../store/slices/drafts';
import * as templatesSlice from '../store/slices/templates';
import * as replyToPostSlice from '../store/slices/replyToPost';

interface ActionsMenuConnectedProps {
  className?: string;
  actionsRowClassName?: string;
  actionsRowCenterClassName?: string;
  actionButtonClassName?: string;
  actionButtonCenterClassName?: string;
}

export default function ActionsMenuConnected({
  className,
  actionsRowClassName,
  actionsRowCenterClassName,
  actionButtonClassName,
  actionButtonCenterClassName,
}: ActionsMenuConnectedProps) {
  const dispatch = useAppDispatch();

  const inlineButtonsOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const quizOpen = useAppSelector(state => state.quiz.isOpen);
  const mediaFiles = useAppSelector(state => state.media.files);

  const canShowInlineButtons = mediaFiles.length <= 1;

  const selectedChannels = useAppSelector(selectSelectedChannels);
  const selectedCount = selectedChannels.length;
  const canReplyToPost = selectedCount === 1;
  const primaryChannel = selectedChannels.length > 0 ? selectedChannels[0] : undefined;

  return (
    <div className={className}>
      <div className={actionsRowClassName}>
        <Button
          text="Черновики"
          variant="templateCardInternal"
          showArrow={false}
          icon={<DraftsIcon width={24} height={24} />}
          className={actionButtonClassName}
          onClick={() => {
            dispatch(draftsSlice.setSearchQuery(''));
            dispatch(uiSlice.setShowDraftsModal(true));
          }}
        />
        <Button
          text="Кнопки"
          variant="templateCardInternal"
          showArrow={false}
          icon={<InlineButtonIcon width={24} height={24} />}
          className={actionButtonClassName}
          active={inlineButtonsOpen}
          disabled={!canShowInlineButtons}
          onClick={() => dispatch(inlineButtonsSlice.toggle())}
        />
      </div>
      <div className={actionsRowClassName}>
        <Button
          text="Шаблоны"
          variant="templateCardInternal"
          showArrow={false}
          icon={<TemplatesIcon width={24} height={24} />}
          className={actionButtonClassName}
          onClick={() => {
            dispatch(templatesSlice.setSearchQuery(''));
            dispatch(uiSlice.setShowTemplatesModal(true));
          }}
        />
        <Button
          text="Опрос"
          variant="templateCardInternal"
          showArrow={false}
          icon={<QuizIcon width={24} height={24} />}
          className={actionButtonClassName}
          active={quizOpen}
          onClick={() => dispatch(quizSlice.setOpen(!quizOpen))}
        />
      </div>
      <div className={actionsRowCenterClassName}>
        <Button
          text="Ответ на свой пост"
          variant="templateCardInternal"
          showArrow={false}
          icon={<ReplyIcon width={24} height={24} />}
          className={actionButtonCenterClassName}
          disabled={!canReplyToPost}
          onClick={() => {
            if (primaryChannel) {
              dispatch(replyToPostSlice.setSearchQuery(''));
              dispatch(uiSlice.setShowReplyModal(true));
            }
          }}
        />
      </div>
    </div>
  );
}
