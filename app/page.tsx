"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authManager } from "@/lib/auth"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = () => {
      // Check if onboarding is completed
      const onboardingCompleted = localStorage.getItem("traceya_onboarding_completed")

      if (!onboardingCompleted) {
        router.push("/onboarding")
        return
      }

      // Check authentication
      if (authManager.isAuthenticated()) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading traceya...</p>
      </div>
    </div>
  )
}
