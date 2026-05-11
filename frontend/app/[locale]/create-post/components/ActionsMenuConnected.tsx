'use client';

import { Button } from '@/components/new-button';
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
        <Button
          variant="soft"
          intent="neutral"
          size="lg"
          style={{ width: '100%' }}
          className={actionButtonClassName}
          onClick={() => dispatch(uiSlice.setShowDraftsModal(true))}
        >
          <DraftsIcon width={24} height={24} />
          Черновики
        </Button>
        <Button
          variant="soft"
          intent={inlineButtonsOpen ? 'gradient' : 'neutral'}
          size="lg"
          style={{ width: '100%' }}
          className={actionButtonClassName}
          disabled={!canShowInlineButtons}
          onClick={() => dispatch(inlineButtonsSlice.toggle())}
        >
          <InlineButtonIcon width={24} height={24} />
          Кнопки
        </Button>
      </div>
      <div className={actionsRowClassName}>
        <Button
          variant="soft"
          intent="neutral"
          size="lg"
          style={{ width: '100%' }}
          className={actionButtonClassName}
          onClick={() => dispatch(uiSlice.setShowTemplatesModal(true))}
        >
          <TemplatesIcon width={24} height={24} />
          Шаблоны
        </Button>
        <Button
          variant="soft"
          intent={quizOpen ? 'gradient' : 'neutral'}
          size="lg"
          style={{ width: '100%' }}
          className={actionButtonClassName}
          onClick={() => dispatch(quizSlice.setOpen(!quizOpen))}
        >
          <QuizIcon width={24} height={24} />
          Опрос
        </Button>
      </div>
      <div className={actionsRowCenterClassName}>
        <Button
          variant="soft"
          intent="neutral"
          size="lg"
          style={{ width: '100%' }}
          className={actionButtonCenterClassName}
          disabled={!canReplyToPost}
          onClick={() => {
            if (primaryChannel) dispatch(uiSlice.setShowReplyModal(true));
          }}
        >
          <ReplyIcon width={24} height={24} />
          Ответ на свой пост
        </Button>
      </div>
    </div>
  );
}
