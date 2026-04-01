import { useAppDispatch } from "../../../store";
import { setBotIds, setChannelIds, setSystem, setTypeAutoReplies, setTypeTriggers, setTypeCommands, setSearch } from "../../../store";
import type { ChannelBasic } from "@/types";
import type { Bot } from '@/store/bots';

interface UseFilterApplicationProps {
  channels: ChannelBasic[];
  bots: Bot[];
}

export const useFilterApplication = ({ channels, bots }: UseFilterApplicationProps) => {
  const dispatch = useAppDispatch();

  const applySourceFilters = (
    sourceDefault: boolean,
    systemChecked: boolean | null,
    selectedChannels: Set<string>,
    selectedBots: Set<string>,
    sourceSharedSearch: string
  ) => {
    if (!sourceDefault) {
      dispatch(setSystem(systemChecked ? true : null));

      if (selectedChannels.size > 0) {
        const filteredChannelIds = channels
          .filter(c => selectedChannels.has(c.title))
          .map(c => c.id);
        dispatch(setChannelIds(filteredChannelIds.length > 0 ? filteredChannelIds : null));
      } else {
        dispatch(setChannelIds(null));
      }

      if (selectedBots.size > 0) {
        const filteredBotIds = bots
          .filter(b => selectedBots.has(b.title || b.username))
          .map(b => b.id);
        dispatch(setBotIds(filteredBotIds.length > 0 ? filteredBotIds : null));
      } else {
        dispatch(setBotIds(null));
      }
    } else {
      dispatch(setBotIds(null));
      dispatch(setChannelIds(null));
      dispatch(setSystem(null));
    }

    const searchValue: string | null = sourceSharedSearch.trim() || null;
    dispatch(setSearch(searchValue));
  };

  const applyTypeFilters = (
    typeDefault: boolean,
    typeAutoReply: boolean,
    typeTrigger: boolean,
    typeCommand: boolean,
    selectedTypeBots: Set<string>,
    typeSharedSearch: string
  ) => {
    if (!typeDefault) {
      dispatch(setTypeAutoReplies(typeAutoReply ? true : null));
      dispatch(setTypeTriggers(typeTrigger ? true : null));
      dispatch(setTypeCommands(typeCommand ? true : null));

      if (selectedTypeBots.size > 0) {
        const filteredBotIds = bots
          .filter(b => selectedTypeBots.has(b.title || b.username))
          .map(b => b.id);
        dispatch(setBotIds(filteredBotIds.length > 0 ? filteredBotIds : null));
      } else {
        dispatch(setBotIds(null));
      }
    } else {
      dispatch(setTypeAutoReplies(null));
      dispatch(setTypeTriggers(null));
      dispatch(setTypeCommands(null));
      dispatch(setBotIds(null));
    }

    dispatch(setSearch(typeSharedSearch.trim() || null));
  };

  const clearSourceFilters = () => {
    dispatch(setBotIds(null));
    dispatch(setChannelIds(null));
    dispatch(setSystem(null));
    dispatch(setSearch(null));
  };

  const clearTypeFilters = () => {
    dispatch(setBotIds(null));
    dispatch(setTypeAutoReplies(null));
    dispatch(setTypeTriggers(null));
    dispatch(setTypeCommands(null));
  };

  const clearAllFilters = () => {
    dispatch(setBotIds(null));
    dispatch(setChannelIds(null));
    dispatch(setSystem(null));
    dispatch(setTypeAutoReplies(null));
    dispatch(setTypeTriggers(null));
    dispatch(setTypeCommands(null));
    dispatch(setSearch(null));
  };

  return {
    applySourceFilters,
    applyTypeFilters,
    clearSourceFilters,
    clearTypeFilters,
    clearAllFilters,
  };
};
