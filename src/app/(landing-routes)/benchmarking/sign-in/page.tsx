"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogIn } from "lucide-react"

const SignInPage = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <h2 className="text-2xl font-semibold">Sign in to Benchmarking</h2>
        <Button asChild variant="ghost">
          <Link href="/benchmarking">Back to Benchmarking</Link>
        </Button>
      </div>

      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full">
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </span>
              </Button>
            </form>

            <div className="my-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="h-px w-10 bg-border" />
              <span>or</span>
              <span className="h-px w-10 bg-border" />
            </div>

            <Button variant="outline" className="w-full">
              <span className="flex items-center justify-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/google.svg" alt="Google" className="h-4 w-4" />
                <span>Continue with Google</span>
              </span>
            </Button>

            <div className="mt-4 text-center text-sm">
              Don’t have an account?{" "}
              <Link href="/benchmarking/sign-up" className="underline">Sign up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignInPage