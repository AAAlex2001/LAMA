import { useReducer } from "react";

export type CheckedItemsAction =
  | { type: "toggle"; id: string }
  | { type: "selectAll"; allIds: string[] }
  | { type: "holdSelect"; id: string }
  | { type: "setMode"; checking: boolean }
  | { type: "clear" };

interface CheckedItemsState {
  checkedItems: Set<string>;
  isChecking: boolean;
}

const initialState: CheckedItemsState = {
  checkedItems: new Set(),
  isChecking: false,
};

function reducer(state: CheckedItemsState, action: CheckedItemsAction): CheckedItemsState {
  switch (action.type) {
    case "toggle": {
      const next = new Set(state.checkedItems);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, checkedItems: next };
    }
    case "selectAll": {
      const allIds = action.allIds;
      if (state.checkedItems.size === allIds.length && allIds.length > 0) {
        return { ...state, checkedItems: new Set() };
      }
      return { isChecking: true, checkedItems: new Set(allIds) };
    }
    case "holdSelect":
      return { isChecking: true, checkedItems: new Set([action.id]) };
    case "setMode":
      return action.checking
        ? { ...state, isChecking: true }
        : { isChecking: false, checkedItems: new Set() };
    case "clear":
      return { isChecking: false, checkedItems: new Set() };
    default:
      return state;
  }
}

export function useCheckedItems() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { ...state, dispatch };
}
