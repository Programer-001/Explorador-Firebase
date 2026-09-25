// src/storage/storageTypes.ts

export type StorageItemType = "folder" | "file";

export interface StorageItem {
  name: string;

  fullPath: string;

  type: StorageItemType;

  url?: string;

  contentType?: string;

  size?: number;

  timeCreated?: string;

  updated?: string;
}

export type StorageViewMode = "list" | "grid";

export interface StorageDriveProps {
  initialPath?: string;

  selectorMode?: boolean;

  onlyImages?: boolean;

  onSelectFile?: (item: StorageItem) => void;
}
