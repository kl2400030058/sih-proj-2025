"use client"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { syncManager, type SyncResult } from "@/lib/sync"
import { db } from "@/lib/db"
import { i18n } from "@/lib/i18n"

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)
    loadSyncStatus()

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "BACKGROUND_SYNC") {
        console.log("[SyncStatus] Background sync triggered")
        handleManualSync()
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage)

    // Periodic status updates
    const interval = setInterval(loadSyncStatus, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
      clearInterval(interval)
    }
  }, [])

  const loadSyncStatus = async () => {
    try {
      // Get settings for last sync time
      const settings = await db.settings.toArray()
      if (settings.length > 0) {
        setLastSync(settings[0].lastSync)
      }

      // Count pending events
      const pending = await db.collectionEvents.where("status").anyOf(["pending", "failed"]).count()

      setPendingCount(pending)

      // Update sync in progress status
      setIsSyncing(syncManager.isSyncInProgress())
    } catch (error) {
      console.error("[SyncStatus] Failed to load sync status:", error)
    }
  }

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      const result = await syncManager.syncPendingEvents()
      setLastSyncResult(result)
      await loadSyncStatus()

      // Clear result after 5 seconds
      setTimeout(() => setLastSyncResult(null), 5000)
    } catch (error) {
      console.error("[SyncStatus] Manual sync failed:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never"

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getSyncStatusColor = () => {
    if (!isOnline) return "bg-gray-500"
    if (isSyncing) return "bg-blue-500"
    if (pendingCount > 0) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getSyncStatusText = () => {
    if (!isOnline) return i18n.t("common.offline")
    if (isSyncing) return "Syncing..."
    if (pendingCount > 0) return `${pendingCount} ${i18n.t("status.pending").toLowerCase()}`
    return "Up to date"
  }

  const getSyncIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />
    if (isSyncing) return <RefreshCw className="h-3 w-3 animate-spin" />
    if (pendingCount > 0) return <AlertCircle className="h-3 w-3" />
    return <CheckCircle className="h-3 w-3" />
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${getSyncStatusColor()} text-white flex items-center gap-1`}>
        {getSyncIcon()}
        {getSyncStatusText()}
      </Badge>

      {isOnline && !isSyncing && pendingCount > 0 && (
        <Button onClick={handleManualSync} variant="ghost" size="sm" className="h-6 px-2 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          Sync
        </Button>
      )}

      {lastSync && <span className="text-xs text-muted-foreground">Last: {formatLastSync(lastSync)}</span>}

      {lastSyncResult && (
        <Badge variant={lastSyncResult.success ? "default" : "destructive"} className="text-xs">
          {lastSyncResult.success ? `✓ ${lastSyncResult.synced} synced` : `✗ ${lastSyncResult.failed} failed`}
        </Badge>
      )}
    </div>
  )
}
