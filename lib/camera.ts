export interface PhotoData {
  blobUrl: string
  hash: string
  file: File
  timestamp: string
}

export class CameraManager {
  private static instance: CameraManager

  static getInstance(): CameraManager {
    if (!CameraManager.instance) {
      CameraManager.instance = new CameraManager()
    }
    return CameraManager.instance
  }

  async capturePhoto(): Promise<PhotoData> {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        reject(new Error("Camera not supported"))
        return
      }

      // Create file input for camera capture
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*"
      input.capture = "environment" // Use rear camera on mobile

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error("No file selected"))
          return
        }

        try {
          const blobUrl = URL.createObjectURL(file)
          const hash = await this.generateFileHash(file)

          resolve({
            blobUrl,
            hash,
            file,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          reject(error)
        }
      }

      input.click()
    })
  }

  async captureFromCamera(): Promise<PhotoData> {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })

        // Create video element to show camera feed
        const video = document.createElement("video")
        video.srcObject = stream
        video.autoplay = true
        video.playsInline = true

        // Create canvas for capture
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Show camera interface (this would be a modal in real implementation)
          const captureButton = document.createElement("button")
          captureButton.textContent = "Capture"
          captureButton.onclick = async () => {
            if (!ctx) return

            ctx.drawImage(video, 0, 0)

            canvas.toBlob(
              async (blob) => {
                if (!blob) {
                  reject(new Error("Failed to capture image"))
                  return
                }

                // Stop camera
                stream.getTracks().forEach((track) => track.stop())

                const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })
                const blobUrl = URL.createObjectURL(blob)
                const hash = await this.generateFileHash(file)

                resolve({
                  blobUrl,
                  hash,
                  file,
                  timestamp: new Date().toISOString(),
                })
              },
              "image/jpeg",
              0.8,
            )
          }

          // This is a simplified implementation
          // In a real app, you'd show a proper camera interface
          document.body.appendChild(video)
          document.body.appendChild(captureButton)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  revokePhotoUrl(blobUrl: string): void {
    URL.revokeObjectURL(blobUrl)
  }
}

export const cameraManager = CameraManager.getInstance()
