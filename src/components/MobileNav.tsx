"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { navItems } from "@/static";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MobileNav = () => {
  const [isOpen, setIsopen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={isOpen} onOpenChange={(open) => setIsopen(open)}>
      <SheetTrigger className="group -m-2 flex items-center p-2 ">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16m-7 6h7"
          />
        </svg>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-3/6 pr-0 sm:max-w-sm overflow-y-auto">
        <div className="flex flex-col justify-center items-center gap-6 pt-10">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              onClick={() => setIsopen(false)}
              className={`transition-colors hover:text-primary font-medium ${
                item.path === pathname ? "text-primary" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* <Link
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
                </Link> */}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
