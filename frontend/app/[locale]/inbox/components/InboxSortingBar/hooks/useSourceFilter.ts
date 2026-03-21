import { useState, useEffect, useRef } from "react";
import { SourceFilterOption } from "../components/SourceComponent";
import { useAppSelector } from "../../../store";
import {
  selectBotIds,
  selectChannelIds,
  selectSystem,
  selectChannels,
  selectBots,
} from "../../../store/selectors";

const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (item: string) => {
  setter((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });
};

interface UseSourceFilterProps {
  channelNames: string[];
  botNames: string[];
}

export const useSourceFilter = ({ channelNames, botNames }: UseSourceFilterProps) => {
  const reduxChannelIds = useAppSelector(selectChannelIds);
  const reduxBotIds = useAppSelector(selectBotIds);
  const reduxSystem = useAppSelector(selectSystem);
  const channels = useAppSelector(selectChannels);
  const bots = useAppSelector(selectBots);

  const [sourceDefault, setSourceDefault] = useState(true);
  const [sourceChannels, setSourceChannels] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [sourceBots, setSourceBots] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());
  const [sourceSharedSearch, setSourceSharedSearch] = useState("");
  const [systemChecked, setSystemChecked] = useState<boolean | null>(null);

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;

    const hasReduxState =
      reduxChannelIds !== null || reduxBotIds !== null || reduxSystem !== null;
    if (!hasReduxState) return;

    const needsChannels = reduxChannelIds !== null && reduxChannelIds.length > 0;
    const needsBots = reduxBotIds !== null && reduxBotIds.length > 0;
    if (needsChannels && channels.length === 0) return;
    if (needsBots && bots.length === 0) return;

    hasSyncedRef.current = true;

    if (reduxChannelIds && reduxChannelIds.length > 0) {
      const channelMap = new Map(channels.map((c) => [c.id, c.title]));
      const names = new Set(
        reduxChannelIds
          .map((id) => channelMap.get(id))
          .filter(Boolean) as string[]
      );
      setSelectedChannels(names);
      setSourceChannels(true);
    }

    if (reduxBotIds && reduxBotIds.length > 0) {
      const botMap = new Map(
        bots.map((b) => [b.id, b.title || b.username])
      );
      const names = new Set(
        reduxBotIds
          .map((id) => botMap.get(id))
          .filter(Boolean) as string[]
      );
      setSelectedBots(names);
      setSourceBots(true);
    }

    if (reduxSystem !== null) {
      setSystemChecked(reduxSystem);
    }

    setSourceDefault(false);
  }, [reduxChannelIds, reduxBotIds, reduxSystem, channels, bots]);

  const handleSourceChannelsChange = (checked: boolean) => {
    setSourceChannels(checked);
    if (checked) {
      setSourceDefault(false);
    } else {
      setSelectedChannels(new Set());
      if (!sourceBots) {
        setSourceDefault(true);
      }
    }
  };

  const handleSourceBotsChange = (checked: boolean) => {
    setSourceBots(checked);
    if (checked) {
      setSourceDefault(false);
    } else {
      setSelectedBots(new Set());
      if (!sourceChannels) {
        setSourceDefault(true);
      }
    }
  };

  const filteredSourceChannels = !sourceSharedSearch
    ? channelNames
    : channelNames.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));

  const filteredSourceBots = !sourceSharedSearch
    ? botNames
    : botNames.filter(b => b.toLowerCase().includes(sourceSharedSearch.toLowerCase()));

  const sourceFilterOptions: SourceFilterOption[] = [
    {
      key: "channels",
      label: "Каналы",
      checked: sourceChannels,
      onChange: handleSourceChannelsChange,
      list: {
        searchPlaceholder: "Введите название канала",
        searchValue: sourceSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSharedSearch,
        items: filteredSourceChannels,
        selectedItems: selectedChannels,
        onItemToggle: toggleSetItem(setSelectedChannels),
      },
    },
    {
      key: "bots",
      label: "Боты",
      checked: sourceBots,
      onChange: handleSourceBotsChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: sourceSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSharedSearch,
        items: filteredSourceBots,
        selectedItems: selectedBots,
        onItemToggle: toggleSetItem(setSelectedBots),
      },
    },
    {
      key: "systems",
      label: "Системные",
      checked: !!systemChecked,
      onChange: setSystemChecked,
    }
  ];

  const reset = () => {
    setSourceDefault(true);
    setSourceChannels(false);
    setSourceBots(false);
    setSelectedChannels(new Set());
    setSelectedBots(new Set());
    setSourceSharedSearch("");
    setSystemChecked(null);
    hasSyncedRef.current = false;
  };

  return {
    sourceDefault,
    setSourceDefault,
    sourceFilterOptions,
    selectedChannels,
    selectedBots,
    systemChecked,
    sourceSharedSearch,
    reset,
  };
};
