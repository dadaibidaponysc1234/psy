"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, LogIn, UserPlus } from "lucide-react"

type AuthControlsProps = {
  isAuthenticated?: boolean
}

export const AuthControls: React.FC<AuthControlsProps> = ({
  isAuthenticated = false,
}) => {
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Account</span>
          </Link>
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