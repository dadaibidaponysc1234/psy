import SearchPublication from "@/components/searchPublications";
import { Button, buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className=" w-full flex flex-col items-center">
      {/* <NavBar/>
      <LandingPage/> */}

      <section className="relative h-[calc(100dvh-80px)] w-full flex justify-center items-center mb-12 flex-col p-2 lg:p-8">
        <video
          src="/AboutUs.mov"
          loop
          autoPlay
          muted
          className="object-cover absolute inset-0 w-full h-full left-0 top-0"
        ></video>
        {/* <Image
          src={"/image-1.jpg"}
          alt="image"
          width={1440}
          height={1099}
          unoptimized={false}
          priority
          className=""
        /> */}
        <div
          className="absolute inset-0 w-full h-full left-0 top-0"
          style={{
            background:
              "linear-gradient(90.98deg, rgba(0, 0, 0, 0.4) 32.12%, rgba(1, 88, 28, 0.4) 35.12%)",
            backgroundBlendMode: "darken",
          }}
        ></div>
        <div className="max-w-5xl space-y-10 flex flex-col items-center z-10">
          <h1 className="text-5xl lg:text-6xl font-bold text-white text-center">
            Developed in <span className="text-primary">Africa</span> by{" "}
            <span className="text-primary">Africans</span> for{" "}
            <span className="text-primary">Africa</span>.
          </h1>
        </div>
      </section>
      <section className="max-w-5xl flex flex-col gap-24 px-2 lg:p-8">
        <div className="flex flex-col-reverse gap-y-10 bg-[#F5FDF9] lg:flex-row justify-evenly text-center lg:text-start lg:gap-x-10">
          <div className="lg:w-1/2 w-full">
            <Image
              src="/image-4.jpg"
              alt=""
              width={639}
              height={525}
              priority
              className="rounded-lg object-cover lg:h-full h-[350px] w-full"
            />
          </div>
          <div className="lg:w-1/2 w-full p-3 flex flex-col justify-center gap-6">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31] text-center">
              About us
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl text-center">
              The Psychiatric Genomics Africa Portal (Psych Gen Africa) is a
              pioneering initiative from the PGC Africa working group, designed
              to serve as a centralised platform for psychiatric genomics
              research focused on the African population. By establishing a
              unified metadata repository, Psych Gen Africa enables researchers,
              healthcare professionals, and the public to access vital
              information and explore groundbreaking research in
              neuropsychiatric disorders across Africa.
            </p>
          </div>
        </div>
        <div className="flex border-[1px] border-gray-300 shadow-sm bg-[#FCF7F7] p-5 rounded-lg flex-col-reverse lg:flex-row  justify-evenly text-center lg:text-start gap-x-10">
          <div className=" lg:w-[35vw] flex flex-col justify-center gap-6 text-center">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Our Mission
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl ">
              Psych Gen Africa aims to democratise access to psychiatric
              genomics data by providing free, open, and curated metadata from
              studies involving African participants or research conducted
              within the continent. The platform seeks to facilitate realtime
              analysis, promote collaborative research, and highlight
              significant trends and findings in the field of psychiatric
              genomics in Africa.
            </p>
          </div>
          <div className=" my-auto lg:ms-auto">
            <Image
              src="/mission.svg"
              alt=""
              width={100}
              height={100}
              className="w-full lg:h-full h-[350px] rounded-lg object-cover object-center"
            />
          </div>
        </div>
        <div className=" lg:border-[1px] border-gray-300 shadow-sm rounded-lg grid gap-y-10 lg:grid-cols-2 p-3">
          <div className="flex flex-col space-y-5">
            <h1 className="text-3xl text-center pt-6 lg:text-5xl font-semibold">
              Our vision
            </h1>
            <Image
              src="/oneAbout.svg"
              alt=""
              width={100}
              height={100}
              className="w-[80vw] lg:w-[30vw] rounded-lg object-cover object-center"
            ></Image>
          </div>
          <div className="text-base my-auto items-center text-muted-foreground">
            <p className="font-bold">
              Through Psych Gen Africa, we envision a future where African
              psychiatric genomics research is fully integrated into the global
              research landscape, fostering collaboration and enhancing the
              quality and impact of studies on neuropsychiatric disorders. The
              portal aims to bridge gaps in data access and support equitable
              advancements in psychiatric research across the continent.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-evenly   gap-y-10">
          <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid lg:grid-cols-3 p-5 border-gray-300 shadow-sm border-2 rounded-md">
              <Image
                src="/layers.svg"
                alt=""
                width={50}
                height={50}
                className="rounded-lg object-cover object-center my-auto mx-auto"
              />
              <div className="col-span-2">
                {" "}
                <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
                  Unified Metadata Repository
                </h4>
                <p className="font-medium text-muted-foreground md:text-xl">
                  A comprehensive collection of curated psychiatric genomics
                  metadata, detailing study origin, genomic categories, and
                  psychiatric disorders studied.
                </p>
              </div>
            </div>
            {/* <div className="grid lg:grid-cols-3 p-5 border-gray-300 shadow-sm border-2 rounded-md">
              <Image
                src="/carbon_text-link-analysis.svg"
                alt=""
                width={50}
                height={50}
                className="rounded-lg  object-cover
                object-center my-auto mx-auto"
              />
              <div className="col-span-2">
                <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
                  Exploratory Data Analytics
                </h4>
                <p className="font-medium text-muted-foreground md:text-xl">
                  A comprehensive collection of curated psychiatric genomics
                  metadata, detailing study origin, genomic categories, and
                  psychiatric disorders studied.
                </p>
              </div>
            </div> */}
            <div className="grid lg:grid-cols-3 p-5 border-gray-300 shadow-sm border-2 rounded-md  ">
              <Image
                src="/Group.svg"
                alt=""
                width={50}
                height={50}
                className="
               rounded-lg  object-cover
                object-center my-auto mx-auto"
              />
              <div className="col-span-2">
                <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
                  Study Submission Platform
                </h4>
                <p className="font-medium text-muted-foreground md:text-xl">
                  A seamless interface for researchers to submit newly published
                  studies, with an integrated review system to ensure the
                  quality of shared data disorders studied.
                </p>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 p-5 border-gray-300 shadow-sm border-2 rounded-md  ">
              <Image
                src="/mdi_magnify.svg"
                alt=""
                width={50}
                height={50}
                className="
               rounded-lg  object-cover
                object-center my-auto mx-auto"
              />
              <div className="col-span-2">
                <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
                  Advanced Search and Filter
                </h4>
                <p className="font-medium text-muted-foreground md:text-xl">
                  A Powerful search and filter functionality based on region,
                  disorder, and genomic category to provide users with relevant
                  and detailed study information.
                </p>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 p-5 border-gray-300 shadow-sm border-2 rounded-md  ">
              <Image
                src="/Vector.svg"
                alt=""
                width={50}
                height={50}
                className="
               rounded-lg  object-cover
                object-center my-auto mx-auto"
              />
              <div className="col-span-2">
                <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
                  Events and News Hub
                </h4>
                <p className="font-medium text-muted-foreground md:text-xl">
                  A platform for the latest news, events, preprints, and
                  publications related to psychiatric genomics research in
                  Africa.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-x-20">
          <Image
            src="/genOne.svg"
            alt=""
            width={100}
            height={100}
            className="w-[80vw] lg:w-[30vw] lg:h-full h-[350px] rounded-lg  object-cover object-center"
          />
          <div className="space-y-4">
            <h1 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Our objectives
            </h1>
            <h5>Our objectives are to:</h5>
            <ul className="space-y-3 text-xl font-bold list-disc">
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
      </section>
      <section className="lg:px-10 px-2">
        <div className="bg-[#FCF7F7] my-32 px-24 py-10 rounded-xl">
          <div className="max-w-4xl text-center space-y-8">
            <h2 className="text-2xl font-semibold">
              Technology and Development
            </h2>
            <div className="flex items-center justify-center gap-5">
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
