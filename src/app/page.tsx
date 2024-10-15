import LandingCarousel from "@/components/landing-carousel";
import SearchPublication from "@/components/searchPublications";
import { Button, buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className=" w-full flex flex-col items-center">
      {/* <NavBar/>
      <LandingPage/> */}
      <section className="relative h-[calc(100dvh-80px)] w-full flex justify-center items-center flex-col p-2 lg:p-8">
        <video
          src="/video-1.mp4"
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
            Explore <span className="text-primary">African</span> Psychiatric
            Genomics - Your gateway to African Psychiatric Genomics Research
          </h1>
          {/* <Button  className="text-2xl p-7">Browse for free</Button> */}
          <Link
            className={buttonVariants({
              size: "lg",
              className: "mx-auto font-bold h-14 rounded-[10px] !text-base",
            })}
            href="/Search"
          >
            Explore now
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] overflow-hidden w-full flex flex-col gap-24 mt-48 p-8">
        <LandingCarousel />
        {/* <div className="mx-auto max-w-[1440px]">
          <video
            src="/video-1.mp4"
            loop
            autoPlay
            muted
            className="rounded-3xl"
          ></video>
        </div> */}
        <div className="mx-auto max-w-[1440px] flex flex-col lg:flex-row justify-evenly text-center lg:text-start gap-x-10">
          <div className="mx-auto">
            {/* TODO: Replace this with new image of woman - name should be homepage_analyze */}
            <Image
              src="/image-3.jpg"
              alt=""
              width={632}
              height={768}
              className="w-[80vw] lg:w-[30vw] min-h-[450px] rounded-lg object-cover object-center"
            />
          </div>
          <div className="lg:w-[35vw] flex flex-col items-center lg:items-start justify-center gap-6 ">
            <h2 className="text-3xl pt-6 lg:text-5xl font-semibold ">
              Visualise and Analyse Instantly
            </h2>
            <p className="font-medium text-muted-foreground md:text-xl ">
              Uncover a comprehensive overview of existing studies in African
              psychiatric genomics, organised for your convenience.
            </p>
            <Link
              className={buttonVariants({
                size: "lg",
                className: "font-bold h-14 w-fit rounded-[10px] !text-base",
              })}
              href="/Analysis"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
      <section className="max-w-[1440px] text-center my-32 space-y-10 p-2 lg:p-8">
        <h2 className="text-2xl lg:text-6xl font-semibold">
          Share Your Innovations
        </h2>
        <p className="font-medium max-w-2xl md:text-xl ">
          Contribute to the community by submitting your latest studies and
          sharing your discoveries with peers.
        </p>
        <Button className="w-fit px-16 py-7 font-bold h-14 rounded-[10px] !text-base">
          Submit a paper
        </Button>
      </section>
    </main>
  );
}
