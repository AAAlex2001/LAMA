import { FC } from "react";
import { StatusText } from "./StatusText";
import { UnbanActions } from "./UnbanActions";
import { BotCommandActions } from "./BotCommandActions";
import { ReplyActions } from "./ReplyActions";
import { JoinRequestActions } from "./JoinRequestActions";
import { ChannelBanActions } from "./ChannelBanActions";
import { MemberJoinedActions } from "./MemberJoinedActions";
import { DeleteIgnoreActions } from "./DeleteIgnoreActions";
import { SystemNotificationActions } from "./SystemNotificationActions";
import { SystemAutoreplyActions } from "./SystemAutoreplyActions";
import { BotErrorActions } from "./BotErrorActions";
import type { ActionGroupProps } from "./types";

export const ActionGroup: FC<ActionGroupProps> = (props) => {
  const { item, blockStatus } = props;
  const status = blockStatus?.status;
  const isUnbanned = status === 'unbanned' || item.payload?.is_unbanned === true;
  const isBanned = !isUnbanned && (item.status === 'banned' || status === 'banned' || status === 'blocked');

  if (isUnbanned) {
    return <StatusText>Разблокирован</StatusText>;
  }

  if (isBanned && item.event_type !== 'channel_ban') {
    return <UnbanActions {...props} />;
  }

  if (item.status === 'ignored' || status === 'ignored') {
    return <StatusText variant="ignored">Проигнорировано</StatusText>;
  }

  switch (item.event_type) {
    case 'bot_command':
      return <BotCommandActions {...props} />;
    case 'bot_message':
    case 'channel_comment':
    case 'system_trigger':
      return <ReplyActions {...props} />;
    case 'channel_join_request':
    case 'channel_link_join':
      return <JoinRequestActions {...props} />;
    case 'channel_ban':
      return <ChannelBanActions {...props} />;
    case 'system_update':
      return null;
    case 'system_notification':
      return <SystemNotificationActions {...props} />;
    case 'system_autoreply':
      return <SystemAutoreplyActions {...props} />;
    case 'channel_member_joined':
      return <MemberJoinedActions {...props} />;
    case 'channel_member_left':
    case 'channel_title_changed':
    case 'channel_photo_changed':
    case 'channel_pinned_message':
      return <DeleteIgnoreActions {...props} />;
    case 'bot_error':
      return <BotErrorActions {...props} />;
    default:
      return null;
  }
};
