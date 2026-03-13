import { useAppDispatch, useAppSelector } from '../index';
import { fetchCommandsThunk, createCommandThunk } from '../thunks/commands';
import type { BotCommandCreate } from '../slices/commands';
import type { FetchCommandsParams } from '../thunks/commands';
import type { RootState } from '../index';

export function useCommands() {
  const dispatch = useAppDispatch();
  const commands = useAppSelector((state: RootState) => state.commands.commands);
  const loading = useAppSelector((state: RootState) => state.commands.loading);
  const error = useAppSelector((state: RootState) => state.commands.error);

  const fetchCommands = (params: FetchCommandsParams) => dispatch(fetchCommandsThunk(params));

  return { commands, loading, error, fetchCommands };
}

export function useCreateCommand() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state: RootState) => state.commands.loading);

  const createCommand = (params: { botId: number; data: BotCommandCreate }) => dispatch(createCommandThunk(params));
  
  return { createCommand, loading };
}
