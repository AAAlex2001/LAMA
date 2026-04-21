import type { MutableRefObject } from 'react';

let mediaFileStoreRef: MutableRefObject<Map<string, File>> | null = null;

export function setMediaFileStoreRef(ref: MutableRefObject<Map<string, File>>): void {
  mediaFileStoreRef = ref;
}

export function clearMediaFileStoreRef(): void {
  mediaFileStoreRef?.current.clear();
  mediaFileStoreRef = null;
}

export function getMediaFileStore(): Map<string, File> | null {
  return mediaFileStoreRef?.current ?? null;
}

export function setMediaFile(id: string, file: File): void {
  mediaFileStoreRef?.current.set(id, file);
}

export function getMediaFile(id: string): File | undefined {
  return mediaFileStoreRef?.current.get(id);
}

export function removeMediaFile(id: string): void {
  mediaFileStoreRef?.current.delete(id);
}

export function clearMediaFiles(): void {
  mediaFileStoreRef?.current.clear();
}
