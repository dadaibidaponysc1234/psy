"use client"

import Link from "next/link"
import MobileNav from "./MobileNav"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { navItems } from "@/static"
import React from "react"

interface FirstModalProps {
  mode: string
  setMode: (mode: string) => void
}
const NavBar: React.FC<FirstModalProps> = ({ mode }) => {
  const pathname = usePathname()

  return (
    <nav
      className="sticky top-0 z-40 flex h-20 w-full justify-between border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={
        pathname === "/OpoloAI"
          ? {
              backgroundColor: mode === "dark" ? "#212020 " : "",
              color: mode === "dark" ? "white" : "black",
              border: mode === "dark" ? "none" : "",
            }
          : {}
      }
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between p-2.5 py-3 font-semibold md:p-6">
        <Link href="/" className="flex items-center space-x-2">
          {/* <div className="text-primary text-lg font-bold ">
            Psychgen_Portal
          </div> */}
          <Image
            src={`${pathname === "/OpoloAI" ? (mode === "light" ? "/logo-1.svg" : "/logowhite.png") : "/logo-1.svg"}`}
            alt=""
            width={100}
            height={100}
            className="h-24 w-32 rounded-lg object-cover object-center"
          />
        </Link>

        <div className="hidden items-center gap-6 pl-6 lg:flex">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              className={`transition-colors hover:text-primary ${
                item.path === pathname ? "text-primary" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="lg:hidden">
          <MobileNav />
        </div>
      </div>
    </nav>
  )
}

export default NavBar
