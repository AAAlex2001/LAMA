import type { BotsState, Bot } from './slice';

type StateWithBots = { bots: BotsState };

export const selectBots = (s: StateWithBots): Bot[] => s.bots.bots;
export const selectBotsLoading = (s: StateWithBots): boolean => s.bots.loading;
export const selectBotsToggling = (s: StateWithBots): boolean => s.bots.toggling;
export const selectCurrentBot = (s: StateWithBots): Bot | null => s.bots.currentBot;
export const selectBotsError = (s: StateWithBots): string | null => s.bots.error;
export const selectBotsTotal = (s: StateWithBots): number => s.bots.total;
