import { useState } from "react";
import type { InboxEventResponse } from "../../../store";

export function useCheckedItems(data: InboxEventResponse[]) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);

  const toggle = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (checkedItems.size === data.length && data.length > 0) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(data.map(item => item.id.toString())));
      setIsChecking(true);
    }
  };

  const holdSelect = (id: string) => {
    setIsChecking(true);
    setCheckedItems(new Set([id]));
  };

  const setMode = (checking: boolean) => {
    if (!checking) setCheckedItems(new Set());
    setIsChecking(checking);
  };

  const clear = () => {
    setCheckedItems(new Set());
    setIsChecking(false);
  };

  return { checkedItems, isChecking, toggle, selectAll, holdSelect, setMode, clear };
}
