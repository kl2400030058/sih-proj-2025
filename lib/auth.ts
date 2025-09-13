export interface AuthState {
  isAuthenticated: boolean
  farmerId: string | null
  token: string | null
}

export class AuthManager {
  private static instance: AuthManager
  private authState: AuthState = {
    isAuthenticated: false,
    farmerId: null,
    token: null,
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  constructor() {
    this.loadAuthState()
  }

  private loadAuthState(): void {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("traceya_auth")
      if (stored) {
        try {
          this.authState = JSON.parse(stored)
        } catch (error) {
          console.error("Failed to parse stored auth state:", error)
          this.clearAuth()
        }
      }
    }
  }

  private saveAuthState(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("traceya_auth", JSON.stringify(this.authState))
    }
  }

  async login(farmerId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    // Mock OTP validation - in production this would call a real API
    if (otp === "123456" || otp === farmerId.slice(-6)) {
      const token = `token_${farmerId}_${Date.now()}`

      this.authState = {
        isAuthenticated: true,
        farmerId,
        token,
      }

      this.saveAuthState()

      // Update settings with farmerId
      const { db } = await import("./db")
      const settings = await db.settings.toArray()
      if (settings.length > 0) {
        await db.settings.update(settings[0].id!, { farmerId })
      }

      return { success: true }
    }

    return { success: false, error: "Invalid OTP. Use 123456 or last 6 digits of Farmer ID." }
  }

  logout(): void {
    this.authState = {
      isAuthenticated: false,
      farmerId: null,
      token: null,
    }
    this.saveAuthState()
  }

  getAuthState(): AuthState {
    return { ...this.authState }
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.farmerId
  }

  getFarmerId(): string | null {
    return this.authState.farmerId
  }

  getToken(): string | null {
    return this.authState.token
  }

  clearAuth(): void {
    this.logout()
    if (typeof window !== "undefined") {
      localStorage.removeItem("traceya_auth")
    }
  }
}

export const authManager = AuthManager.getInstance()
