import Dexie, { type Table } from 'dexie';

export interface MediaItem {
  id?: number;
  name: string;
  type: 'url' | 'local';
  url: string; // For 'url', it's the external URL. For 'local', it's a data URL or blob URL.
  blob?: Blob; // Stored for local files
  width?: number;
  height?: number;
  createdAt: number;
}

export class MediaDatabase extends Dexie {
  media!: Table<MediaItem>;

  constructor() {
    super('MediaDatabase');
    this.version(1).stores({
      media: '++id, name, type'
    });
  }
}

export const db = new MediaDatabase();
