"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Loader2, RefreshCw } from "lucide-react"
import { geolocationManager, type LocationData } from "@/lib/geolocation"
import { formatLocation } from "@/lib/utils"

interface LocationCaptureProps {
  onLocationCapture: (location: LocationData) => void
  location: LocationData | null
  autoCapture?: boolean
}

export function LocationCapture({ onLocationCapture, location, autoCapture = true }: LocationCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoCapture && !location) {
      captureLocation()
    }
  }, [autoCapture, location])

  const captureLocation = async () => {
    setIsCapturing(true)
    setError(null)

    try {
      const locationData = await geolocationManager.getCurrentLocation()
      onLocationCapture(locationData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get location"
      setError(errorMessage)
    } finally {
      setIsCapturing(false)
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return "text-green-600"
    if (accuracy <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getAccuracyText = (accuracy: number) => {
    if (accuracy <= 10) return "Excellent"
    if (accuracy <= 50) return "Good"
    return "Poor"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Location</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={captureLocation}
          disabled={isCapturing}
          className="flex items-center gap-2 bg-transparent"
        >
          {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isCapturing ? "Getting Location..." : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {location ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">Location Captured</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Coordinates: </span>
                  <span className="font-mono">{formatLocation(location.lat, location.lon)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Accuracy: </span>
                  <span className={`font-medium ${getAccuracyColor(location.accuracy)}`}>
                    ±{Math.round(location.accuracy)}m ({getAccuracyText(location.accuracy)})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Captured: </span>
                  <span>{new Date(location.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <MapPin className="h-12 w-12 mx-auto text-red-500 mb-2" />
              <p className="text-red-600 font-medium">Location Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureLocation}
                className="mt-3 bg-transparent"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-2" />
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
