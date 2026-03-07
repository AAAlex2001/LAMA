import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import inboxReducer from './slices/inbox';
import createInviteLinkModalReducer from './slices/createInviteLinkModal';
import autoRepliesReducer from './slices/autoReplies';
import commandsReducer from './slices/commands';
import triggersReducer from './slices/triggers';
import createTriggerModalReducer from './slices/createTriggerModal';
import createAutoReplyModalReducer from './slices/createAutoReplyModal';
import createCommandModalReducer from './slices/createCommandModal';
import createGlobalMessageModalReducer from './slices/createGlobalMessageModal';
import botsReducer from './slices/bots';
import directChatReducer from './slices/directChat';
import channelsReducer from '@/app/[locale]/create-post/store/slices/channels';

export const inboxStore = configureStore({
  reducer: { 
    inbox: inboxReducer,
    channels: channelsReducer,
    createInviteLinkModal: createInviteLinkModalReducer,
    autoReplies: autoRepliesReducer,
    commands: commandsReducer,
    triggers: triggersReducer,
    createTriggerModal: createTriggerModalReducer,
    createAutoReplyModal: createAutoReplyModalReducer,
    createCommandModal: createCommandModalReducer,
    createGlobalMessageModal: createGlobalMessageModalReducer,
    bots: botsReducer,
    directChat: directChatReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof inboxStore.getState>;
export type AppDispatch = typeof inboxStore.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export type { InboxView, SortInput, InboxState, ListFilterType } from './slices/inbox';
export {
  setSelectedFilter,
  setCurrentView,
  setSort,
  setSortDir,
  setStatusFilter,
  removeItem,
  updateItem,
  addInviteLink,
  setInviteLinksLoading,
  setInviteLinks,
  updateInviteLink,
  removeInviteLink,
} from './slices/inbox';
export {
  fetchInboxEventsThunk,
  bulkInboxActionThunk,
  specificInboxActionThunk,
} from './thunks/inboxEvents';
export type {
  InboxCategory,
  EntityType as InboxEntityType,
  EventType as InboxEventType,
  EventStatus as InboxEventStatus,
  SortDir as InboxSortDir,
  BulkActionType,
  InboxEventResponse,
  InboxListResponse,
  FetchInboxEventsParams,
  BulkActionParams,
  SpecificActionParams,
} from './thunks/inboxEvents';
export {
  selectFilteredItems,
  selectSortedItems,
  selectInboxItems,
  selectInboxItemsLoading,
  selectInboxItemsError,
  selectInboxItemsTotal,
  selectInboxItemsHasMore,
  selectInboxItemsOffset,
  selectBulkActionLoading,
  selectSpecificActionLoading,
  selectSelectedFilter,
  selectSortDir,
  selectStatusFilter,
  selectChannels,
  selectChannelsLoading,
  selectChannelsPagination,
  selectInviteLinks,
  selectInviteLinksTotal,
  selectInviteLinksLoading,
} from './selectors';
export type { InviteLink, InviteLinksResponse } from '@/types';
export { useCreateInviteLink } from './hooks/useCreateInviteLink';
export {
  setChannels,
  addChannel,
  updateChannel,
  removeChannel,
  toggleChannelSelected,
  selectAllChannels,
  deselectAllChannels,
  setLoading,
  setSyncing,
  setError,
  setTotal,
  clearError,
  resetChannels,
} from '@/app/[locale]/create-post/store/slices/channels';
export { 
  fetchChannelsThunk, 
  addChannelThunk, 
  deleteChannelThunk 
} from '@/app/[locale]/create-post/store/thunks/channels';

export {
  createInviteLinkThunk,
  fetchInviteLinksThunk,
  fetchAllInviteLinksThunk,
  patchInviteLinkThunk,
  fetchInviteLinkByIdThunk,
  deleteInviteLinkThunk,
} from './thunks/inviteLinks';
export type { PatchInviteLinkRequest } from './thunks/inviteLinks';
export {
  setModalOpen,
  setStep,
  setChannelSearch,
  setSelectedChannelId,
  setLinkName,
  setHasLimit,
  setLimitCount,
  setLinkType,
  setValidityPeriod,
  setExpirationDate,
  setExpirationHours,
  setExpirationMinutes,
  setConnectionMethod,
  setLoginMethod,
  setJoiningText,
  setApplicationMethod,
  setHasCaptcha,
  setPreviewData,
  setEditingLinkIds,
  populateFormFromInviteLink,
  resetForm,
  buildPreviewData,
} from './slices/createInviteLinkModal';
export type { CreateInviteLinkModalState, ModalStep } from './slices/createInviteLinkModal';
export {
  setAutoReplies,
  addAutoReply,
  updateAutoReply,
  removeAutoReply,
  resetAutoReplies,
} from './slices/autoReplies';
export type { AutoReply, AutoReplyCreate } from './slices/autoReplies';
export {
  setCommands,
  addCommand,
  updateCommand,
  removeCommand,
  resetCommands,
} from './slices/commands';
export type { BotCommand, BotCommandCreate } from './slices/commands';
export {
  setTriggers,
  addTrigger,
  updateTrigger,
  removeTrigger,
  resetTriggers,
} from './slices/triggers';
export type { Trigger, TriggerCreate, TriggerType, ActionType, ChatType } from './slices/triggers';
export {
  fetchAutoRepliesThunk,
  createAutoReplyThunk,
} from './thunks/autoReplies';
export type { FetchAutoRepliesParams } from './thunks/autoReplies';
export {
  fetchCommandsThunk,
  createCommandThunk,
} from './thunks/commands';
export type { FetchCommandsParams } from './thunks/commands';
export {
  fetchTriggersThunk,
  createTriggerThunk,
} from './thunks/triggers';
export type { FetchTriggersParams } from './thunks/triggers';
export {
  setModalOpen as setCreateTriggerModalOpen,
  setName as setTriggerName,
  setTriggerType,
  setActionType,
  setActionText,
  setActionMediaUrl,
  setActionMediaType,
  setActionButtons,
  setActionDurationMinutes,
  setDelayMinutes,
  setChatType,
  setIsActive as setTriggerIsActive,
  setBotSearch as setTriggerBotSearch,
  toggleSelectedBotId as toggleTriggerSelectedBotId,
  setSelectedBotIds as setTriggerSelectedBotIds,
  resetForm as resetTriggerForm,
} from './slices/createTriggerModal';
export type { CreateTriggerModalState, TriggerTypeEnum, ActionTypeEnum } from './slices/createTriggerModal';
export {
  setModalOpen as setCreateAutoReplyModalOpen,
  setKeywords,
  setKeyword,
  addKeyword,
  removeKeyword,
  setResponseText,
  setResponseMediaUrl,
  setResponseMediaType,
  setScope as setAutoReplyScope,
  setIsActive as setAutoReplyIsActive,
  setBotSearch,
  toggleSelectedBotId,
  setSelectedBotIds,
  resetForm as resetAutoReplyForm,
} from './slices/createAutoReplyModal';
export type { CreateAutoReplyModalState } from './slices/createAutoReplyModal';
export {
  setModalOpen as setCreateCommandModalOpen,
  setCommand,
  setDescription,
  setResponseText as setCommandResponseText,
  setResponseMediaUrl as setCommandResponseMediaUrl,
  setResponseMediaType as setCommandResponseMediaType,
  setScope as setCommandScope,
  setIsActive as setCommandIsActive,
  setBotSearch as setCommandBotSearch,
  toggleSelectedBotId as toggleCommandSelectedBotId,
  setSelectedBotIds as setCommandSelectedBotIds,
  resetForm as resetCommandForm,
} from './slices/createCommandModal';
export type { CreateCommandModalState } from './slices/createCommandModal';
export {
  setBots,
  addBot,
  updateBot,
  removeBot,
  setLoading as setBotsLoading,
  setError as setBotsError,
  clearError as clearBotsError,
  setPagination as setBotsPagination,
  resetBots,
} from './slices/bots';
export type { Bot, BotCreate, BotStatus } from './slices/bots';
export {
  fetchBotsThunk,
  createBotThunk,
} from './thunks/bots';
export type { FetchBotsParams, BotListResponse } from './thunks/bots';
export {
  setModalOpen as setCreateGlobalMessageModalOpen,
  setTextContent,
  setMediaUrl,
  setMediaType,
  setBotSearch as setGlobalMessageBotSearch,
  toggleSelectedBotId as toggleGlobalMessageSelectedBotId,
  setSelectedBotIds as setGlobalMessageSelectedBotIds,
  setChatId,
  resetForm as resetGlobalMessageForm,
} from './slices/createGlobalMessageModal';
export type { CreateGlobalMessageModalState } from './slices/createGlobalMessageModal';
export {
  fetchMessagesThunk,
  sendMessageThunk,
} from './thunks/globalMessages';
export type { FetchMessagesParams, SendMessageParams, SendMessageRequest, BotMessageResponse, BotMessageListResponse } from './thunks/globalMessages';
export {
  setActiveChatId,
  clearMessages,
  wsMessageReceived,
  setWsConnected,
  setSendingMessage,
  resetDirectChat,
} from './slices/directChat';
export type { DirectChatState } from './slices/directChat';
export {
  fetchDirectChatsThunk,
  fetchDirectMessagesThunk,
  sendDirectMessageThunk,
  updateDirectChatThunk,
  editDirectMessageThunk,
  deleteDirectMessageThunk,
} from './thunks/directChat';
export type {
  DirectChatResponse,
  BotMessageResponse as DirectBotMessageResponse,
  DirectChatListResponse,
  ChatHistoryResponse,
  MessageType as DirectMessageType,
  FetchDirectChatsParams,
  FetchDirectMessagesParams,
  SendDirectMessageParams,
  EditDirectMessageParams,
  DeleteDirectMessageParams,
  UpdateDirectChatParams,
} from './thunks/directChat';
export {
  selectDirectChats,
  selectDirectChatsLoading,
  selectDirectChatsError,
  selectActiveChatId,
  selectActiveChat,
  selectPinnedChats,
  selectUnpinnedChats,
  selectDirectMessages,
  selectDirectMessagesLoading,
  selectDirectMessagesHasMore,
  selectSendingMessage,
  selectWsConnected,
} from './selectors';
export { useDirectChat, useDirectMessages } from './hooks/useDirectChat';