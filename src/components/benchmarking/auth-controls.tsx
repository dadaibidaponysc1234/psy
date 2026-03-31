"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, UserPlus, LogOut, ChevronDown } from "lucide-react"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import { useBenchmarkingStore } from "@/stores/benchmarking-store"
import { toast } from "react-hot-toast"

export const AuthControls: React.FC = () => {
  const { isAuthenticated, user, logout } = useBenchmarkAuthStore()

  const handleLogout = () => {
    logout()
    useBenchmarkingStore.getState().resetWorkflow()
    toast.success("Signed out")
  }

  if (isAuthenticated) {
    const displayName = user?.name || user?.email || "Account"
    const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initial}
            </div>
            <span className="text-sm">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{displayName}</p>
            {user?.email && user?.name && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
