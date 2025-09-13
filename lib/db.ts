import Dexie, { type Table } from "dexie"

export interface CollectionEvent {
  id?: number
  eventId: string
  farmerId: string
  species: string
  location: {
    lat: number
    lon: number
    accuracy: number
  }
  timestamp: string
  quality: {
    moisturePct: number
    notes: string
  }
  photos: Array<{
    blobUrl: string
    hash: string
  }>
  status: "pending" | "uploading" | "synced" | "failed"
  onChainTx: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncQueue {
  id?: number
  eventId: string
  action: "create" | "update" | "delete"
  data: CollectionEvent
  retryCount: number
  lastAttempt: string | null
  createdAt: string
}

export interface AppSettings {
  id?: number
  syncInterval: number // minutes
  smsGateway: string
  language: "en" | "hi"
  farmerId: string
  lastSync: string | null
}

export class TraceyaDB extends Dexie {
  collectionEvents!: Table<CollectionEvent>
  syncQueue!: Table<SyncQueue>
  settings!: Table<AppSettings>

  constructor() {
    super("TraceyaDB")

    this.version(1).stores({
      collectionEvents: "++id, eventId, farmerId, species, status, timestamp",
      syncQueue: "++id, eventId, action, createdAt",
      settings: "++id",
    })
  }
}

export const db = new TraceyaDB()

// Initialize default settings
export const initializeSettings = async () => {
  const existingSettings = await db.settings.toArray()
  if (existingSettings.length === 0) {
    await db.settings.add({
      syncInterval: 15,
      smsGateway: "+1234567890",
      language: "en",
      farmerId: "",
      lastSync: null,
    })
  }
}
