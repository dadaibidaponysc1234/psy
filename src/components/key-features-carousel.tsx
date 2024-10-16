"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/swiper-bundle.css";
import { buttonVariants } from "./ui/button";
import Link from "next/link";
import Image from "next/image";
import { CloudDownload } from "lucide-react";

const KeyFeaturesCarousel = () => {
  return (
    <Swiper
      loop
      slidesPerView={"auto"}
      speed={1000}
      spaceBetween={30}
      //   centeredSlides
      autoplay={{
        delay: 1000,
        disableOnInteraction: true,
      }}
      modules={[Autoplay, Pagination, Navigation]}
      className="!overflow-hidden"
    >
      <SwiperSlide className="max-w-[500px]">
        <div className="flex items-center justify-center gap-10 p-5 border-gray-300 shadow-sm border-2 rounded-md h-[300px]">
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
      </SwiperSlide>

      <SwiperSlide className="max-w-[500px]">
        <div className="flex items-center justify-center gap-10 p-5 border-gray-300 shadow-sm border-2 rounded-md h-[300px]">
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
              studies, with an integrated review system to ensure the quality of
              shared data disorders studied.
            </p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide className="max-w-[500px]">
        <div className="flex items-center justify-center gap-10 p-5 border-gray-300 shadow-sm border-2 rounded-md h-[300px]">
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
              disorder, and genomic category to provide users with relevant and
              detailed study information.
            </p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide className="max-w-[500px]">
        <div className="flex items-center justify-center gap-10 p-5 border-gray-300 shadow-sm border-2 rounded-md h-[300px]">
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
              publications related to psychiatric genomics research in Africa.
            </p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide className="max-w-[500px]">
        <div className="flex items-center justify-center gap-10 p-5 border-gray-300 shadow-sm border-2 rounded-md h-[300px]">
          <CloudDownload
            strokeWidth={2}
            className="m-auto text-[#2a8851] size-12 flex-shrink-0"
          />
          <div className="col-span-2">
            <h4 className=" pt-6 lg:text-2xl font-semibold text-[#5A3A31] ">
              Free Downloads
            </h4>
            <p className="font-medium text-muted-foreground md:text-xl">
              Download search results and analytics plots for future reference
              freely.
            </p>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  );
};

export default KeyFeaturesCarousel;
