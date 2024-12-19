"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import YearlyStudyCount from "@/components/graph/yearly";
import RegionalStudyCount from "@/components/graph/region";
import DisorderStudyCount from "@/components/graph/disorder";
import BiologicalStudyCount from "@/components/graph/biological";
import GeneticsStudyCount from "@/components/graph/genetics";
import Collaboration from "@/components/graph/collaboration";
import WordCloudAnalysis from "@/components/graph/word-cloud-analysis";
import MapAnalysis from "@/components/graph/map-analysis";
import TopFiveDisorders from "@/components/graph/top-five-disorders";

const Analysis = () => {
  return (
    <div className="">
      <section className="relative h-[calc(100dvh-80px)] w-full flex justify-center items-center mb-12 flex-col p-2 lg:p-8">
        <video
          src="/AnalysisPage.mov"
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
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white text-center">
            Take a Deep Dive into{" "}
            <span className="text-primary">Africa&apos;s</span> Psychiatric
            Genomic Landscape
          </h1>
        </div>
      </section>
      <div className="sm:p-10 p-6 lg:space-y-5 space-y-2 max-w-[1024px] mx-auto w-full">
        <h1 className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31]">
          Uncover Regional Insights and Research Trends
        </h1>
      </div>
      <div className="sm:p-10 p-6 space-y-4 max-w-[1024px] mx-auto w-full">
        <h1 className="text-2xl lg:text-[28px] font-bold ">
          Visualise studies by:
        </h1>
        <Tabs defaultValue="region" className="space-y-10">
          <div className="p-2 border rounded-md">
            <TabsList className="flex h-full">
              <TabsTrigger value="region">Country</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="word-cloud">Word Cloud</TabsTrigger>
              <TabsTrigger value="disorder">Disorder</TabsTrigger>
              <TabsTrigger value="top-five-disorders">
                Top Five Disorders
              </TabsTrigger>
              <TabsTrigger value="biologicalModality">
                Biological Modality
              </TabsTrigger>
              <TabsTrigger value="geneticSource">Genetic Source</TabsTrigger>
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="year">
            <YearlyStudyCount />
          </TabsContent>
          <TabsContent value="region">
            <RegionalStudyCount />
          </TabsContent>
          <TabsContent value="map">
            <MapAnalysis />
          </TabsContent>
          <TabsContent value="word-cloud">
            <WordCloudAnalysis />
          </TabsContent>
          <TabsContent value="disorder">
            <DisorderStudyCount />
          </TabsContent>
          <TabsContent value="top-five-disorders">
            <TopFiveDisorders />
          </TabsContent>
          <TabsContent value="biologicalModality">
            <BiologicalStudyCount />
          </TabsContent>
          <TabsContent value="geneticSource">
            <GeneticsStudyCount />
          </TabsContent>
          <TabsContent value="collaboration">
            <Collaboration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analysis;
