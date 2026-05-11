import { useState, useEffect, useRef } from "react";
import { SourceFilterOption } from "../components/SourceComponent";
import { useAppSelector } from "../../../store";
import {
  selectTypeAutoReplies,
  selectTypeTriggers,
  selectTypeCommands,
  selectBotIds,
} from "../../../store/selectors";
import { useBotsQuery } from "@/store/bots";

const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (item: string) => {
  setter((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });
};

interface UseTypeFilterProps {
  botNames: string[];
}

export const useTypeFilter = ({ botNames }: UseTypeFilterProps) => {
  const reduxTypeAutoReplies = useAppSelector(selectTypeAutoReplies);
  const reduxTypeTriggers = useAppSelector(selectTypeTriggers);
  const reduxTypeCommands = useAppSelector(selectTypeCommands);
  const reduxBotIds = useAppSelector(selectBotIds);
  const botsQuery = useBotsQuery();
  const bots = botsQuery.data?.items ?? [];

  const [typeDefault, setTypeDefault] = useState(true);
  const [typeAutoReply, setTypeAutoReply] = useState(false);
  const [typeTrigger, setTypeTrigger] = useState(false);
  const [typeCommand, setTypeCommand] = useState(false);
  const [selectedTypeBots, setSelectedTypeBots] = useState<Set<string>>(new Set());
  const [typeSharedSearch, setTypeSharedSearch] = useState("");

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;

    const hasReduxState =
      reduxTypeAutoReplies !== null ||
      reduxTypeTriggers !== null ||
      reduxTypeCommands !== null;
    if (!hasReduxState) return;

    const needsBots = reduxBotIds !== null && reduxBotIds.length > 0;
    if (needsBots && bots.length === 0) return;

    hasSyncedRef.current = true;

    if (reduxTypeAutoReplies) setTypeAutoReply(true);
    if (reduxTypeTriggers) setTypeTrigger(true);
    if (reduxTypeCommands) setTypeCommand(true);

    if (reduxBotIds && reduxBotIds.length > 0) {
      const botMap = new Map(
        bots.map((b) => [b.id, b.title || b.username])
      );
      const names = new Set(
        reduxBotIds
          .map((id) => botMap.get(id))
          .filter(Boolean) as string[]
      );
      setSelectedTypeBots(names);
    }

    setTypeDefault(false);
  }, [reduxTypeAutoReplies, reduxTypeTriggers, reduxTypeCommands, reduxBotIds, bots]);

  const handleTypeAutoReplyChange = (checked: boolean) => {
    setTypeAutoReply(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeTrigger && !typeCommand) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const handleTypeTriggerChange = (checked: boolean) => {
    setTypeTrigger(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeAutoReply && !typeCommand) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const handleTypeCommandChange = (checked: boolean) => {
    setTypeCommand(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeAutoReply && !typeTrigger) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const filteredTypeBots = !typeSharedSearch
    ? botNames
    : botNames.filter(b => b.toLowerCase().includes(typeSharedSearch.toLowerCase()));

  const typeFilterOptions: SourceFilterOption[] = [
    {
      key: "autoreply",
      label: "Автоответы",
      checked: typeAutoReply,
      onChange: handleTypeAutoReplyChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
    {
      key: "trigger",
      label: "Триггер",
      checked: typeTrigger,
      onChange: handleTypeTriggerChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
    {
      key: "command",
      label: "Команды",
      checked: typeCommand,
      onChange: handleTypeCommandChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
  ];

  const reset = () => {
    setTypeDefault(true);
    setTypeAutoReply(false);
    setTypeTrigger(false);
    setTypeCommand(false);
    setSelectedTypeBots(new Set());
    setTypeSharedSearch("");
    hasSyncedRef.current = false;
  };

  return {
    typeDefault,
    setTypeDefault,
    typeFilterOptions,
    typeAutoReply,
    typeTrigger,
    typeCommand,
    selectedTypeBots,
    typeSharedSearch,
    reset,
  };
};
