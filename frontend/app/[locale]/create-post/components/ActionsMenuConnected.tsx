'use client';

import OldButton from '@/components/button/button';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
} from '@/components/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { useSelectedChannels } from '../hooks/useSelectedChannels';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as uiSlice from '../store/slices/ui';

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

  const selectedChannels = useSelectedChannels();
  const selectedCount = selectedChannels.length;
  const canReplyToPost = selectedCount === 1;
  const primaryChannel = selectedChannels.length > 0 ? selectedChannels[0] : undefined;

  return (
    <div className={className}>
      <div className={actionsRowClassName}>
        <OldButton
          text="Черновики"
          variant="templateCardInternal"
          showArrow={false}
          icon={<DraftsIcon width={24} height={24} />}
          className={actionButtonClassName}
          onClick={() => dispatch(uiSlice.setShowDraftsModal(true))}
        />
        <OldButton
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
        <OldButton
          text="Шаблоны"
          variant="templateCardInternal"
          showArrow={false}
          icon={<TemplatesIcon width={24} height={24} />}
          className={actionButtonClassName}
          onClick={() => dispatch(uiSlice.setShowTemplatesModal(true))}
        />
        <OldButton
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
        <OldButton
          text="Ответ на свой пост"
          variant="templateCardInternal"
          showArrow={false}
          icon={<ReplyIcon width={24} height={24} />}
          className={actionButtonCenterClassName}
          disabled={!canReplyToPost}
          onClick={() => {
            if (primaryChannel) dispatch(uiSlice.setShowReplyModal(true));
          }}
        />
      </div>
    </div>
  );
}
