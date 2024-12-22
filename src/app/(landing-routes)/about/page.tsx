import KeyFeaturesCarousel from "@/components/key-features-carousel";
import SearchPublication from "@/components/searchPublications";
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/static";
import { CloudDownload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className=" w-full flex flex-col items-center">
      <section className="relative h-[calc(100dvh-80px)] w-full flex justify-center items-center flex-col p-2 lg:p-8">
        <video
          src="/AboutUs.mov"
          loop
          autoPlay
          muted
          className="object-cover absolute inset-0 w-full h-full left-0 top-0"
        ></video>
        <div
          className="absolute inset-0 w-full h-full left-0 top-0"
          style={{
            background:
              "linear-gradient(90.98deg, rgba(0, 0, 0, 0.4) 32.12%, rgba(1, 88, 28, 0.4) 35.12%)",
            backgroundBlendMode: "darken",
          }}
        ></div>
        <div className="max-w-5xl space-y-10 flex flex-col items-center z-10">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white text-center">
            Developed in <span className="text-primary">Africa</span> by{" "}
            <span className="text-primary">Africans</span> for{" "}
            <span className="text-primary">Africa</span>.
          </h1>
        </div>
      </section>
      <section className="flex flex-col sm:gap-24 gap-20 my-24 md:px-8 px-4 lg:max-w-5xl w-full">
        <div className="flex flex-col-reverse gap-y-10 bg-[#F5FDF9] md:flex-row justify-evenly text-center md:text-start md:gap-x-10 lg:p-8 p-5 rounded-lg">
          <div className="md:w-1/2 w-full">
            <Image
              src="/image-4.jpg"
              alt=""
              width={639}
              height={525}
              priority
              className="rounded-lg object-cover md:h-full h-[350px] w-full"
            />
          </div>
          <div className="md:w-1/2 w-full flex flex-col justify-center gap-6">
            <h2 className="text-3xl lg:text-5xl font-semibold text-[#5A3A31] text-center">
              About us
            </h2>
            <p className="font-medium text-muted-foreground md:text-lg text-center">
              The Psychiatric Genomics Africa Portal (PsychGenAfrica) is a
              pioneering initiative from the PGC Africa working group, designed
              to serve as a centralised platform for psychiatric genomics
              research focused on the African population. By establishing a
              unified metadata repository, PsychGenAfrica enables researchers,
              healthcare professionals, and the public to access vital
              information and explore groundbreaking research in
              neuropsychiatric disorders across Africa.
            </p>
          </div>
        </div>
        <div className="flex border-[1px] border-gray-100 shadow-sm bg-[#FCF7F7] lg:p-8 p-5 rounded-lg flex-col-reverse md:flex-row justify-evenly text-center md:text-start gap-x-10">
          <div className="md:w-1/2 w-full flex flex-col justify-center gap-6 text-center">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Mission Statement
            </h2>
            <p className="font-medium text-muted-foreground md:text-lg ">
              {APP_NAME} aims to democratise access to psychiatric genomics data
              by providing free, open, and curated metadata from studies
              involving African participants or research conducted within the
              continent. The platform seeks to facilitate realtime analysis,
              promote collaborative research, and highlight significant trends
              and findings in the field of psychiatric genomics in Africa.
            </p>
          </div>
          <div className="md:w-1/2 w-full my-auto lg:ms-auto">
            <Image
              src="/mission.svg"
              alt=""
              width={100}
              height={100}
              className="w-full lg:h-full h-[350px] rounded-lg object-cover object-center"
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-x-10 items-center">
          <Image
            src="/Specific-Objectives.jpg"
            alt=""
            width={4500}
            height={3375}
            className="md:w-1/2 w-full md:h-full h-[350px] rounded-lg  object-cover object-center"
          />
          <div className="md:w-1/2 w-full space-y-6">
            <h1 className="text-3xl pt-6 lg:text-5xl font-semibold">
              Specific Objectives
            </h1>
            <ul className="space-y-3 md:text-lg text-base font-medium list-disc ml-5">
              <li>
                Provide open and equitable access to African psychiatric
                genomics metadata
              </li>
              <li>
                Offer an intuitive platform for real-time research analysis and
                data visualization
              </li>
              <li>
                Support researchers in sharing and disseminating new findings
              </li>
              <li>
                Centralise events, publications, and news in the African
                psychiatric genomics field
              </li>
            </ul>
          </div>
        </div>
        <div className="lg:border-[1px] border-gray-300 shadow-sm rounded-lg gap-y-10 lg:p-8 p-5 flex items-center md:flex-row flex-col gap-x-10">
          <div className="flex flex-col space-y-8 items-center md:w-1/2 w-full">
            <h1 className="text-3xl text-center lg:text-5xl font-semibold">
              Vision Statement
            </h1>
            <Image
              src="/Vision.jpg"
              alt=""
              width={5120}
              height={2880}
              className="w-full lg:w-[30vw] rounded-lg object-cover object-center"
            ></Image>
          </div>
          <div className="text-base my-auto items-center text-muted-foreground md:w-1/2 w-full">
            <p className="font-bold">
              Through {APP_NAME}, we envision a future where African psychiatric
              genomics research is fully integrated into the global research
              landscape, fostering collaboration and enhancing the quality and
              impact of studies on neuropsychiatric disorders. The portal aims
              to bridge gaps in data access and support equitable advancements
              in psychiatric research across the continent.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-evenly gap-y-10 overflow-hidden">
          <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
            Key Features
          </h2>
          <KeyFeaturesCarousel />
        </div>
        <div className="bg-[#FCF7F7] my-14 md:px-24 px-10 py-10 rounded-xl">
          <div className="w-full text-center space-y-8">
            <h2 className="text-2xl font-semibold">
              Technology and Development
            </h2>
            <div className="flex min-[400px]:flex-row flex-col items-center justify-center gap-5">
              <Image
                src={"/icons/chart-js.svg"}
                alt=""
                width={70}
                height={70}
              />
              <Image src={"/icons/d3-js.svg"} alt="" width={60} height={60} />
              <Image src={"/icons/next-js.svg"} alt="" width={60} height={60} />
              <Image
                src={"/icons/postgres.svg"}
                alt=""
                width={50}
                height={50}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
