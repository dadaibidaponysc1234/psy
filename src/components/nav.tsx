"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import MobileNav from "./MobileNav";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { navItems } from "@/static";

const NavBar = () => {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 flex mx-auto max-w-[1440px] items-center w-full justify-between h-14 py-1 p-2.5 md:p-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        <Link href="/" className="flex items-center space-x-2 ">
          {/* <div className="text-primary text-lg font-bold ">
            Psychgen_Portal
          </div> */}
          <Image
            src="/logo.svg"
            alt=""
            width={100}
            height={100}
            className="w-16 h-16 rounded-lg object-cover object-center"
          />
        </Link>

        <div className="hidden lg:flex items-center gap-6 pl-6">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              className={`transition-colors hover:text-primary font-medium ${
                item.path === pathname ? "text-primary" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="lg:hidden">
        <MobileNav />
      </div>

      {/* <div className="hidden ml-auto lg:flex items-center justify-between space-x-2 ">
        <div className="flex items-center space-x-4">
          <Link
            href="/SignUp"
            className="transition-colors hover:text-primary font-medium"
          >
            Sign up
          </Link>

          <Link
            href='Login'
            className="font-medium"
          >
            <div
              className={cn(
                buttonVariants({
                  variant: "ghost",
                }),
                "transition-colors hover:text-primary"
              )}
            >
              Login
            </div>
          </Link>
        </div>
      </div> */}
    </nav>
  );
};

export default NavBar;
