"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/swiper-bundle.css";
import SearchPublication from "./searchPublications";
import { buttonVariants } from "./ui/button";
import Link from "next/link";
import Image from "next/image";

const LandingCarousel = () => {
  return (
    <div className="w-full max-w-[1440px] mx-auto overflow-hidden">
      <Swiper
        loop
        slidesPerView={1}
        speed={1000}
        spaceBetween={30}
        centeredSlides={false}
        autoplay={{
          delay: 1000,
          disableOnInteraction: true,
        }}
        modules={[Autoplay, Pagination, Navigation]}
      >
        <SwiperSlide>
          <div className="flex flex-col lg:flex-row justify-center text-center lg:text-start gap-x-12">
            <Image
              src="/image-5.jpg"
              alt="Research Image"
              width={996}
              height={558}
              priority
              className="w-full lg:w-[30vw] sm:min-h-[450px] max-h-[400px] rounded-lg object-cover object-center"
            />
            <div className="lg:w-[35vw] flex flex-col justify-center gap-6">
              <h2 className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31]">
                Curated for all Researchers and Enthusiasts
              </h2>
              <p className="font-medium text-muted-foreground md:text-xl">
                Explore a vast collection of African psychiatric genomics
                metadata, freely available for your research needs.
              </p>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide>
          <div className="flex flex-col-reverse lg:flex-row justify-center text-center lg:text-start gap-x-10">
            <div className="lg:w-[35vw] flex flex-col justify-center gap-6">
              <h2 className="text-3xl pt-6 lg:text-5xl font-semibold">
                Discover Groundbreaking Research
              </h2>
              <p className="font-medium text-muted-foreground md:text-xl">
                Uncover a comprehensive overview of existing studies in African
                psychiatric genomics, organised for your convenience.
              </p>
              {/* <SearchPublication /> */}
              <Link
                className={buttonVariants({
                  size: "lg",
                  className:
                    "font-bold h-14 w-fit rounded-[10px] !text-base lg:mx-0 mx-auto",
                })}
                href="/search"
              >
                Use Advanced search
              </Link>
            </div>
            <Image
              src="/image-6.jpg"
              alt="Genomics"
              width={996}
              height={558}
              priority
              className="w-full lg:w-[30vw] sm:min-h-[450px] max-h-[400px] rounded-lg object-cover object-center"
            />
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
};

export default LandingCarousel;
