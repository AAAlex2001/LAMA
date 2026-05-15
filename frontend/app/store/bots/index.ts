export type { Bot, BotCreate, BotStatus, ApprovalMode, ApprovalDestination, BotsState } from './slice';

export {
  useBotsQuery,
  useBotQuery,
  useBotStatsQuery,
  useCreateBotMutation,
  useDeleteBotMutation,
  useActivateBotMutation,
  useDeactivateBotMutation,
  useUpdateBotMutation,
  useUploadBotPhotoMutation,
  useDeleteBotPhotoMutation,
  useToggleBotOnChannelMutation,
  useRemoveBotFromChannelMutation,
  useBindBotToChannelMutation,
  useUnbindBotFromChannelMutation,
  invalidateBots,
  botsKeys,
} from './queries';
export type { FetchBotsParams, BotListResponse, BotStatsPayload } from './queries';
