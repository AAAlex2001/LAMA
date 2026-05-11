export type CallbackActionOption = 'send_dm' | 'reply_in_chat' | 'track_click';

export interface CallbackActionContentProps {
  callbackActionValue: CallbackActionOption;
  onCallbackActionChange?: (value: CallbackActionOption) => void;
}
