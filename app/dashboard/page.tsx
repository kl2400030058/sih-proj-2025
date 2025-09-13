"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Settings, WifiOff, Wifi, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { CollectionCard } from "@/components/collection-card"
import { StatsCard } from "@/components/stats-card"
import { SyncStatus } from "@/components/sync-status"
import { db, type CollectionEvent, initializeSettings } from "@/lib/db"
import { authManager } from "@/lib/auth"
import { smsManager } from "@/lib/sms"
import { syncManager } from "@/lib/sync"

export default function DashboardPage() {
  const router = useRouter()
  const [events, setEvents] = useState<CollectionEvent[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    synced: 0,
    pending: 0,
    uploading: 0,
    failed: 0,
  })

  useEffect(() => {
    initializeSettings()
    loadEvents()

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOnline(navigator.onLine)

    const startAutoSync = async () => {
      const settings = await db.settings.toArray()
      const syncInterval = settings[0]?.syncInterval || 15
      syncManager.startAutoSync(syncInterval)
    }

    startAutoSync()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      syncManager.stopAutoSync()
    }
  }, [])

  const loadEvents = async () => {
    setIsLoading(true)
    try {
      const farmerId = authManager.getFarmerId()
      if (!farmerId) return

      const allEvents = await db.collectionEvents.where("farmerId").equals(farmerId).reverse().sortBy("createdAt")

      setEvents(allEvents)

      // Calculate stats
      const newStats = {
        synced: allEvents.filter((e) => e.status === "synced").length,
        pending: allEvents.filter((e) => e.status === "pending").length,
        uploading: allEvents.filter((e) => e.status === "uploading").length,
        failed: allEvents.filter((e) => e.status === "failed").length,
      }
      setStats(newStats)
    } catch (error) {
      console.error("Failed to load events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewEvent = (event: CollectionEvent) => {
    router.push(`/event/${event.eventId}`)
  }

  const handleRetryEvent = async (event: CollectionEvent) => {
    try {
      await db.collectionEvents.update(event.id!, {
        status: "uploading",
        lastError: null,
        updatedAt: new Date().toISOString(),
      })

      // Simulate sync attempt
      setTimeout(async () => {
        const success = Math.random() > 0.3 // 70% success rate
        await db.collectionEvents.update(event.id!, {
          status: success ? "synced" : "failed",
          lastError: success ? null : "Network timeout",
          updatedAt: new Date().toISOString(),
        })
        loadEvents()
      }, 2000)

      loadEvents()
    } catch (error) {
      console.error("Failed to retry event:", error)
    }
  }

  const handleDeleteEvent = async (event: CollectionEvent) => {
    if (confirm("Are you sure you want to delete this collection event?")) {
      try {
        await db.collectionEvents.delete(event.id!)
        loadEvents()
      } catch (error) {
        console.error("Failed to delete event:", error)
      }
    }
  }

  const handleSendSMS = async (event: CollectionEvent) => {
    try {
      const settings = await db.settings.toArray()
      const gatewayNumber = settings[0]?.smsGateway || "+1234567890"
      await smsManager.sendViaSMS(event, gatewayNumber)
    } catch (error) {
      console.error("Failed to send SMS:", error)
    }
  }

  const handleLogout = () => {
    authManager.logout()
    router.push("/login")
  }

  const farmerId = authManager.getFarmerId()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {farmerId}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <SyncStatus />
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <Alert className="mb-6">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You're offline. Collections will be saved locally and synced when connection is restored.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Synced"
              value={stats.synced}
              icon={<Wifi className="h-4 w-4 text-white" />}
              color="bg-chart-1"
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              icon={<RefreshCw className="h-4 w-4 text-gray-900" />}
              color="bg-chart-2"
            />
            <StatsCard
              title="Uploading"
              value={stats.uploading}
              icon={<RefreshCw className="h-4 w-4 text-white animate-spin" />}
              color="bg-chart-3"
            />
            <StatsCard
              title="Failed"
              value={stats.failed}
              icon={<WifiOff className="h-4 w-4 text-white" />}
              color="bg-chart-4"
            />
          </div>

          {/* Capture Button */}
          <Button onClick={() => router.push("/capture")} className="w-full h-16 text-lg mb-6" size="lg">
            <Plus className="h-6 w-6 mr-2" />
            Capture New Collection
          </Button>

          {/* Recent Collections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Collections</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadEvents} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading collections...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No collections yet</p>
                  <Button onClick={() => router.push("/capture")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Collection
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.slice(0, 10).map((event) => (
                    <CollectionCard
                      key={event.eventId}
                      event={event}
                      onView={handleViewEvent}
                      onRetry={handleRetryEvent}
                      onDelete={handleDeleteEvent}
                      onSendSMS={handleSendSMS}
                    />
                  ))}
                  {events.length > 10 && (
                    <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/queue")}>
                      View All Collections ({events.length})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
