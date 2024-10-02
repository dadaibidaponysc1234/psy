import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import MobileNav from "./MobileNav";
import Image from "next/image";


const NavBar = () => {
  return (
    <nav className="sticky top-0 z-40 flex items-center mx-auto w-full px-2.5 md:px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className=" flex justify-center items-center h-14">

        <Link href="/" className="flex items-center space-x-2 ">
          {/* <div className="text-primary text-lg font-bold ">
            Psychgen_Portal
          </div> */}
          <Image
              src="/logo.png"
              alt=""
              width={100}
              height={100}
              className="w-16 h-16 rounded-lg  object-cover object-center "
            />
        </Link>

        <div className="hidden lg:flex items-center gap-6 pl-6">
          <Link
            href="/Search"
            className="transition-colors hover:text-primary font-medium"
          >
            Search
          </Link>

          <Link
            href="/Analysis"
            className="transition-colors hover:text-primary font-medium"
          >
            Analysis
          </Link>
          <Link
            href="/About"
            className="transition-colors hover:text-primary font-medium"
          >
            About
          </Link>
        </div>
      </div>

      <div className="hidden ml-auto lg:flex items-center justify-between space-x-2 ">
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
      </div>

      {/* mobile nav */}
      <div className="lg:hidden ml-auto">
        <MobileNav />
      </div>
    </nav>
  );
};

export default NavBar;