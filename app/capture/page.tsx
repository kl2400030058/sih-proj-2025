"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Send, MessageSquare } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { PhotoCapture } from "@/components/photo-capture"
import { LocationCapture } from "@/components/location-capture"
import { db, type CollectionEvent } from "@/lib/db"
import { authManager } from "@/lib/auth"
import { smsManager } from "@/lib/sms"
import { generateEventId, formatTimestamp } from "@/lib/utils"
import { ayurvedicSpecies } from "@/lib/species"
import type { PhotoData, LocationData } from "@/lib/camera"

export default function CapturePage() {
  const router = useRouter()
  const [species, setSpecies] = useState("")
  const [moisturePct, setMoisturePct] = useState("")
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handlePhotoCapture = (photo: PhotoData) => {
    setPhotos((prev) => [...prev, photo])
  }

  const handlePhotoRemove = (photoToRemove: PhotoData) => {
    setPhotos((prev) => prev.filter((photo) => photo !== photoToRemove))
  }

  const handleLocationCapture = (locationData: LocationData) => {
    setLocation(locationData)
  }

  const validateForm = (): string | null => {
    if (!species) return "Please select a species"
    if (!moisturePct || isNaN(Number(moisturePct))) return "Please enter a valid moisture percentage"
    if (!location) return "Location is required"
    return null
  }

  const createCollectionEvent = (): CollectionEvent => {
    const farmerId = authManager.getFarmerId()!
    const now = new Date()

    return {
      eventId: generateEventId(),
      farmerId,
      species,
      location: {
        lat: location!.lat,
        lon: location!.lon,
        accuracy: location!.accuracy,
      },
      timestamp: formatTimestamp(now),
      quality: {
        moisturePct: Number(moisturePct),
        notes: notes.trim(),
      },
      photos: photos.map((photo) => ({
        blobUrl: photo.blobUrl,
        hash: photo.hash,
      })),
      status: "pending",
      onChainTx: null,
      lastError: null,
      createdAt: formatTimestamp(now),
      updatedAt: formatTimestamp(now),
    }
  }

  const handleSaveOffline = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const event = createCollectionEvent()
      await db.collectionEvents.add(event)

      // Clear form
      setSpecies("")
      setMoisturePct("")
      setNotes("")
      setPhotos([])
      setLocation(null)

      router.push("/dashboard")
    } catch (error) {
      setError("Failed to save collection event")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncNow = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const event = createCollectionEvent()
      event.status = "uploading"
      await db.collectionEvents.add(event)

      // In a real app, this would trigger immediate sync
      // For now, we'll just mark it as pending sync
      setTimeout(async () => {
        await db.collectionEvents.update(event.id!, { status: "synced" })
      }, 2000)

      router.push("/dashboard")
    } catch (error) {
      setError("Failed to sync collection event")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendSMS = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const event = createCollectionEvent()
      await db.collectionEvents.add(event)

      // Get SMS gateway from settings
      const settings = await db.settings.toArray()
      const gatewayNumber = settings[0]?.smsGateway || "+1234567890"

      await smsManager.sendViaSMS(event, gatewayNumber)
    } catch (error) {
      setError("Failed to send SMS")
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Capture Collection</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New Herb Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="species">Species *</Label>
                <Select value={species} onValueChange={setSpecies}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select herb species" />
                  </SelectTrigger>
                  <SelectContent>
                    {ayurvedicSpecies.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moisture">Moisture Percentage *</Label>
                <Input
                  id="moisture"
                  type="number"
                  placeholder="Enter moisture %"
                  value={moisturePct}
                  onChange={(e) => setMoisturePct(e.target.value)}
                  className="h-12"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <LocationCapture onLocationCapture={handleLocationCapture} location={location} autoCapture={true} />

              <PhotoCapture
                onPhotoCapture={handlePhotoCapture}
                onPhotoRemove={handlePhotoRemove}
                photos={photos}
                maxPhotos={3}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3">
                <Button onClick={handleSaveOffline} disabled={isLoading} className="h-12 text-lg" variant="default">
                  <Save className="h-5 w-5 mr-2" />
                  Save Offline
                </Button>

                <Button onClick={handleSyncNow} disabled={isLoading} className="h-12 text-lg" variant="secondary">
                  <Send className="h-5 w-5 mr-2" />
                  Sync Now
                </Button>

                <Button
                  onClick={handleSendSMS}
                  disabled={isLoading}
                  className="h-12 text-lg bg-transparent"
                  variant="outline"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Send via SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
