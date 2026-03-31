"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import axios from "axios"
import { getBenchmarkSignupUrl } from "@/lib/config"
import { useBenchmarkAuthStore } from "@/stores/benchmark-auth-store"
import type { TokenResponse } from "@/types/benchmarking"

const SignUpPage = () => {
  const router = useRouter()
  const { setTokens, setUser } = useBenchmarkAuthStore()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    try {
      const res = await axios.post<TokenResponse>(getBenchmarkSignupUrl(), {
        email,
        password,
        name: name || undefined,
      })

      setTokens(res.data.access_token, res.data.refresh_token)
      setUser(res.data.user)
      toast.success("Account created successfully")
      router.push("/benchmarking")
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg =
        typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail[0]?.msg || "Validation failed"
        : err?.message || "Sign up failed"
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <h2 className="text-2xl font-semibold">Create your account</h2>
        <Button asChild variant="ghost">
          <Link href="/benchmarking">Back to Benchmarking</Link>
        </Button>
      </div>

      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span>
                    {isLoading ? "Creating account..." : "Create account"}
                  </span>
                </span>
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/benchmarking/sign-in" className="underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignUpPage
