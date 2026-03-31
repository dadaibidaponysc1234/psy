"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, LogIn, UserPlus, LogOut } from "lucide-react"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import { toast } from "react-hot-toast"

export const AuthControls: React.FC = () => {
  const { isAuthenticated, user, logout } = useBenchmarkAuthStore()

  const handleLogout = () => {
    logout()
    toast.success("Signed out")
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {user?.name || user?.email || "Account"}
        </span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1 h-4 w-4" />
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href="/benchmarking/sign-in" className="flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          <span>Sign in</span>
        </Link>
      </Button>
      <Button asChild>
        <Link href="/benchmarking/sign-up" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Sign up</span>
        </Link>
      </Button>
    </div>
  )
}
