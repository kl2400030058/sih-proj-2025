export interface LocationData {
  lat: number
  lon: number
  accuracy: number
  timestamp: string
}

export class GeolocationManager {
  private static instance: GeolocationManager

  static getInstance(): GeolocationManager {
    if (!GeolocationManager.instance) {
      GeolocationManager.instance = new GeolocationManager()
    }
    return GeolocationManager.instance
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"))
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          })
        },
        (error) => {
          let errorMessage = "Failed to get location"
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user"
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable"
              break
            case error.TIMEOUT:
              errorMessage = "Location request timed out"
              break
          }
          reject(new Error(errorMessage))
        },
        options,
      )
    })
  }

  async watchLocation(callback: (location: LocationData) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"))
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000,
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          })
        },
        (error) => {
          console.error("Location watch error:", error)
        },
        options,
      )

      resolve(watchId)
    })
  }

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId)
  }
}

export const geolocationManager = GeolocationManager.getInstance()
