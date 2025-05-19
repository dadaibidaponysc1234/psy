"use client"
import Footer from "@/components/footer"
import NavBar from "@/components/nav"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { Toaster } from "react-hot-toast"

const LandingLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  return (
    <div className="flex h-screen flex-col">
      <NavBar />
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
