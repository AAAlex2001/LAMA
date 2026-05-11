import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import inboxReducer from './slices/inbox';
import createInviteLinkModalReducer from './slices/createInviteLinkModal';
import createTriggerModalReducer from './slices/createTriggerModal';
import createCommandModalReducer from './slices/createCommandModal';
import createGlobalMessageModalReducer from './slices/createGlobalMessageModal';
import directChatReducer from './slices/directChat';

export const inboxStore = configureStore({
  reducer: {
    inbox: inboxReducer,
    createInviteLinkModal: createInviteLinkModalReducer,
    createTriggerModal: createTriggerModalReducer,
    createCommandModal: createCommandModalReducer,
    createGlobalMessageModal: createGlobalMessageModalReducer,
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
  setBotIds,
  setChannelIds,
  setSystem,
  setTypeAutoReplies,
  setTypeTriggers,
  setTypeCommands,
  setSearch,
} from './slices/inbox';
export {
  selectInbox,
  selectSelectedFilter,
  selectSortDir,
  selectStatusFilter,
  selectBotIds,
  selectChannelIds,
  selectSystem,
  selectTypeAutoReplies,
  selectTypeTriggers,
  selectTypeCommands,
  selectSearch,
} from './selectors';
export type { InviteLink, InviteLinksResponse } from '@/types';
export { useCreateInviteLink } from './hooks/useCreateInviteLink';
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
  setIsSubmitting as setTriggerIsSubmitting,
  setBotSearch as setTriggerBotSearch,
  toggleSelectedBotId as toggleTriggerSelectedBotId,
  setSelectedBotIds as setTriggerSelectedBotIds,
  resetForm as resetTriggerForm,
} from './slices/createTriggerModal';
export type { CreateTriggerModalState, TriggerTypeEnum, ActionTypeEnum } from './slices/createTriggerModal';
export {
  setModalOpen as setCreateCommandModalOpen,
  setCommand,
  setDescription,
  setResponseText as setCommandResponseText,
  setResponseMediaUrl as setCommandResponseMediaUrl,
  setResponseMediaType as setCommandResponseMediaType,
  setScope as setCommandScope,
  setIsActive as setCommandIsActive,
  setIsSubmitting as setCommandIsSubmitting,
  setBotSearch as setCommandBotSearch,
  toggleSelectedBotId as toggleCommandSelectedBotId,
  setSelectedBotIds as setCommandSelectedBotIds,
  resetForm as resetCommandForm,
} from './slices/createCommandModal';
export type { CreateCommandModalState } from './slices/createCommandModal';
export type { Bot, BotCreate, BotStatus } from '@/store/bots';
export type { FetchBotsParams, BotListResponse } from '@/store/bots';
export {
  setModalOpen as setCreateGlobalMessageModalOpen,
  setTextContent,
  setMediaUrl,
  setMediaUrls,
  setMediaType,
  setBotSearch as setGlobalMessageBotSearch,
  toggleSelectedBotId as toggleGlobalMessageSelectedBotId,
  setSelectedBotIds as setGlobalMessageSelectedBotIds,
  resetForm as resetGlobalMessageForm,
  setIsLoading as setGlobalMessageIsLoading,
} from './slices/createGlobalMessageModal';
export type { CreateGlobalMessageModalState } from './slices/createGlobalMessageModal';
export {
  setActiveChatId,
  setChatSort,
  setChatUnreadFilter,
  clearMessages,
  wsMessageReceived,
  setWsConnected,
  setSendingMessage,
  resetDirectChat,
} from './slices/directChat';
export type { DirectChatState } from './slices/directChat';
export {
  fetchDirectChatsThunk,
  fetchMoreDirectChatsThunk,
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
  selectChatsById,
  selectChatOrder,
  selectDirectChats,
  selectDirectChatsLoading,
  selectDirectChatsError,
  selectDirectChatsHasMore,
  selectDirectChatsTotal,
  selectChatSort,
  selectChatUnreadFilter,
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