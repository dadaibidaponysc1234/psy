"use client"
import Footer from "@/components/footer"
import NavBar from "@/components/nav"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"

const LandingLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const [mode, setMode] = useState<string>("light")

  useEffect(() => {
    const stored = localStorage.getItem("mode") || "light"
    setMode(stored)
  }, [])

  return (
    <div
      className={`flex ${pathname === "/OpoloAI" ? "h-screen" : ""} flex-col`}
    >
      <NavBar mode={mode} />
      <div
        className={`flex ${pathname === "/OpoloAI" ? "h-full overflow-hidden" : "min-h-dvh"} flex-grow flex-col`}
      >
        <Toaster />
        {children}
      </div>
      {pathname !== "/OpoloAI" && <Footer />}
    </div>
  )
}

export default LandingLayout
