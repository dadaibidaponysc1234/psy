"use client"
import Footer from "@/components/footer"
import NavBar from "@/components/nav"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

const LandingLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  return (
    <>
      <NavBar />
      <div
        className={`flex ${pathname === "/OpoloAI" ? "h-screen overflow-hidden" : "min-h-dvh"} flex-grow flex-col`}
      >
        {children}
      </div>
      {pathname !== "/OpoloAI" && <Footer />}
    </>
  )
}

export default LandingLayout
