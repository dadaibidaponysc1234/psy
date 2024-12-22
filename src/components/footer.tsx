import { APP_NAME, navItems } from "@/static";
import Image from "next/image";
import Link from "next/link";
// import Search from "@/app/Search/Page";

const Footer = () => {
  return (
    <section className="bg-white text-black shadow-[0_-4px_6px_-4px_rgba(0,_0,_0,_0.1),_0_-2px_4px_-4px_rgba(0,_0,_0,_0.06)]">
      <div className="lg:px-24 px-10 pt-10 space-y-10 mx-auto max-w-[1440px]">
        <div className="flex flex-col lg:flex-row space-y-16 lg:space-y-0 lg:justify-between items-center gap-x-8">
          <Image
            src="/logo-1.png"
            alt=""
            width={300}
            height={200}
            priority
            className="w-80 object-cover shrink-0 object-center"
          />
          <div className="leading-loose text-center">
            The Psychiatric Genomics Africa Portal ({APP_NAME}) is an initiative
            of the PGC Africa working group.
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
            className="w-80 h-32 object-cover object-center bg-white shrink-0"
          />
        </div>
        <p className="text-center text-lg pb-5">
          © 2024 {APP_NAME}. All rights reserved.
        </p>
      </div>
    </section>
  );
};

export default Footer;
