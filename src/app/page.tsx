import SearchPublication from "@/components/searchPublications";
import { Button, buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className=" w-full flex flex-col items-center p-2 lg:p-8">
      {/* <NavBar/>
      <LandingPage/> */}
      <div className="max-w-3xl text-center space-y-20 lg:space-y-32 mt-8">
        <h1 className="text-5xl lg:text-6xl font-bold ">
          Explore African Genomics – Your Gateway to Psychiatric Research
        </h1>
        {/* <Button  className="text-2xl p-7">Browse for free</Button> */}
        <Link className={buttonVariants(
          {size:'lg', className:""}
        )} href="/About">Browse for free</Link>
      </div>
      <section className="max-w-5xl flex flex-col  gap-24 mt-48 ">
        <div className="flex flex-col  lg:flex-row justify-evenly text-center lg:text-start  gap-x-10">
          <div className="mx-auto">
            <Image
              src="/dna.svg"
              alt=""
              width={100}
              height={100}
              className="w-[80vw] lg:w-[30vw] rounded-lg  object-cover object-center "
            />
          </div>
          <div className="lg:w-[35vw] flex flex-col justify-center gap-6">
            <h2
              className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31]"
            >
              Curated for all Researchers and Enthusiasts
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl ">
              Explore a vast collection of African psychiatric genomics
              metadata, freely available for your research needs.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse lg:flex-row  justify-evenly text-center lg:text-start gap-x-10">
          <div className=" lg:w-[35vw] flex flex-col justify-center gap-6">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Discover Groundbreaking Research
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl ">
              Uncover a comprehensive overview of existing studies in African
              psychiatric genomics, organized for your convenience.
            </p>
            <SearchPublication />
            <Link className={buttonVariants(
          {size:'lg', className:""}
        )} href="/Search">Use Advanced search</Link>
          </div>
          <div className="mx-auto">
            <Image
              src="/genOne.svg"
              alt=""
              width={100}
              height={100}
              className="w-[80vw] lg:w-[30vw] rounded-lg object-cover object-center "
            />
          </div>
        </div>
        <div className="flex flex-col  lg:flex-row justify-evenly text-center lg:text-start  gap-x-10">
          <div className="mx-auto">
            <Image
              src="/dna.svg"
              alt=""
              width={100}
              height={100}
              className="w-[80vw] lg:w-[30vw] rounded-lg  object-cover object-center "
            />
          </div>
          <div className="lg:w-[35vw] flex flex-col justify-center gap-6 ">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Visualize and Analyze Instantly
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl ">
              Uncover a comprehensive overview of existing studies in African
              psychiatric genomics, organized for your convenience.
            </p>
            <Link className={buttonVariants(
          {size:'lg', className:""}
        )} href="/Analysis">Learn more</Link>
          </div>
        </div>
      </section>
      <div className="max-w-4xl text-center my-32 space-y-10 ">
        <h2 className="text-2xl lg:text-6xl font-semibold">
          Share Your Innovations
        </h2>
        <p className="font-medium max-w-2xl md:text-xl ">
          Contribute to the community by submitting your latest studies and
          sharing your discoveries with peers.
        </p>
        <Button className="w-fit px-16 py-7 text-lg">Submit a paper</Button>
      </div>
    </main>
  );
}
