import { navItems } from "@/static";
import Image from "next/image";
import Link from "next/link";
// import Search from "@/app/Search/Page";

const Footer = () => {
  return (
    <section className="bg-[#041B15] text-white">
      <div className="lg:px-24 px-10 pt-10 space-y-10 mx-auto max-w-[1440px]">
        <div className="flex flex-col lg:flex-row space-y-16 lg:space-y-0 lg:justify-between">
          <div className="flex flex-col space-y-3 lg:space-y-5 justify-center">
            <Image
              src="/logo-1.svg"
              alt=""
              width={100}
              height={100}
              className="w-40 h-16 object-cover object-center bg-white"
            />
            <Image
              src="/logo-1.png"
              alt=""
              width={180}
              height={73}
              className="w-40 h-16 object-cover object-center"
            />
          </div>
          <div className="lg:w-[12vw] leading-loose">
            The Psychiatric Genomics Africa Portal (PsychGen-Africa) is an
            initiative of the PGC-Africa working group.
          </div>
          <ul className="space-y-3 lg:space-y-5">
            <li>Terms of use</li>
            <li>Privacy Policy</li>
            <li>Accessibility</li>
            <li>Contact & Support</li>
          </ul>
        </div>
        <p className="lg:text-center text-lg pb-5">
          © 2024 PsychGen-Africa. All rights reserved.
        </p>
      </div>
    </section>
  );
};

export default Footer;
