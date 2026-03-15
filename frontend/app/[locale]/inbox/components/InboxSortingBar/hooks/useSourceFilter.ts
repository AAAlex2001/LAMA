import { useState } from "react";
import { SourceFilterOption } from "../components/SourceComponent";

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
  const [sourceDefault, setSourceDefault] = useState(true);
  const [sourceChannels, setSourceChannels] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [sourceBots, setSourceBots] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());
  const [sourceSharedSearch, setSourceSharedSearch] = useState("");
  const [systemChecked, setSystemChecked] = useState<boolean | null>(null);

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
