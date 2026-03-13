import { useAppDispatch, useAppSelector } from '../index';
import { fetchTriggersThunk, createTriggerThunk } from '../thunks/triggers';
import type { TriggerCreate } from '../slices/triggers';
import type { FetchTriggersParams } from '../thunks/triggers';
import type { RootState } from '../index';

export function useTriggers() {
  const dispatch = useAppDispatch();
  const triggers = useAppSelector((state: RootState) => state.triggers.triggers);
  const loading = useAppSelector((state: RootState) => state.triggers.loading);
  const error = useAppSelector((state: RootState) => state.triggers.error);

  const fetchTriggers = (params: FetchTriggersParams) => dispatch(fetchTriggersThunk(params));

  return { triggers, loading, error, fetchTriggers };
}

export function useCreateTrigger() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state: RootState) => state.triggers.loading);

  const createTrigger = (params: { botId: number; data: TriggerCreate }) =>
    dispatch(createTriggerThunk(params)).unwrap();

  return { createTrigger, loading };
}
