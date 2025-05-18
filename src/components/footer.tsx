import { APP_NAME, navItems } from "@/static"
import Image from "next/image"
import Link from "next/link"
// import Search from "@/app/Search/Page";

const Footer = () => {
  return (
    <section className="bg-white text-black shadow-[0_-4px_6px_-4px_rgba(0,_0,_0,_0.1),_0_-2px_4px_-4px_rgba(0,_0,_0,_0.06)]">
      <div className="mx-auto max-w-[1440px] space-y-10 px-10 pt-10 lg:px-24">
        <div className="flex flex-col items-center gap-x-8 space-y-16 lg:flex-row lg:justify-between lg:space-y-0">
          <Image
            src="/logo-1.png"
            alt=""
            width={300}
            height={200}
            priority
            className="w-80 shrink-0 object-cover object-center"
          />
          <div className="text-center leading-loose">
            <p>
              The Psychiatric Genomics Africa Portal ({APP_NAME}) is an
              initiative of the PGC Africa working group.
            </p>
            <p className="mt-4">
              Contact Us:{" "}
              <a
                href="mailto:helpdesk@psychgenafrica.org"
                className="w-fit cursor-pointer text-primary hover:underline"
              >
                helpdesk@psychgenafrica.org
              </a>
            </p>
          </div>
          {/* <ul className="space-y-3 lg:space-y-5 text-nowrap text-center">
            <li>Terms of use</li>
            <li>Privacy Policy</li>
            <li>Accessibility</li>
            <li>Contact & Support</li>
          </ul> */}
          <Image
            src="/logo-1.svg"
            alt=""
            width={100}
            height={100}
            priority
            className="h-32 w-80 shrink-0 bg-white object-cover object-center"
          />
        </div>
        <p className="pb-5 text-center text-lg">
          © 2024 {APP_NAME}. All rights reserved.
        </p>
      </div>
    </section>
  )
}

export default Footer
