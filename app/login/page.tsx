"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Leaf, Smartphone, HelpCircle } from "lucide-react"
import { authManager } from "@/lib/auth"
import { AuthGuard } from "@/components/auth-guard"

export default function LoginPage() {
  const [farmerId, setFarmerId] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!farmerId.trim()) {
      setError("Please enter your Farmer ID")
      setIsLoading(false)
      return
    }

    if (!otp.trim()) {
      setError("Please enter the OTP")
      setIsLoading(false)
      return
    }

    try {
      const result = await authManager.login(farmerId.trim(), otp.trim())

      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error || "Login failed")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const sendOTP = () => {
    if (!farmerId.trim()) {
      setError("Please enter your Farmer ID first")
      return
    }

    // Mock OTP sending - in production this would call an API
    setError("")
    alert(`OTP sent to registered mobile number. For demo, use: 123456 or ${farmerId.slice(-6)}`)
  }

  const showOnboarding = () => {
    // Clear onboarding completion flag to show tutorial again
    localStorage.removeItem("traceya_onboarding_completed")
    router.push("/onboarding")
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-full">
                <Leaf className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-balance">Welcome to traceya</CardTitle>
            <CardDescription className="text-balance">Secure login for herb collection tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farmerId">Farmer ID</Label>
                <Input
                  id="farmerId"
                  type="text"
                  placeholder="Enter your Farmer ID"
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  className="text-lg h-12"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp">OTP</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sendOTP}
                    className="text-primary hover:text-primary/80"
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    Send OTP
                  </Button>
                </div>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-lg h-12 text-center tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isLoading || !farmerId.trim() || !otp.trim()}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                <p className="text-balance">
                  For demo purposes, use OTP: <strong>123456</strong>
                  <br />
                  or the last 6 digits of your Farmer ID
                </p>
              </div>

              <Button onClick={showOnboarding} variant="ghost" className="w-full">
                <HelpCircle className="h-4 w-4 mr-2" />
                Show Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
