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
    <div className="max-w-[1024px] mx-auto w-full">
      <div className="p-10 lg:space-y-5 space-y-2">
        <h1 className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31]">
          Dive Deep into Africa&apos;s Genomic Landscape
        </h1>
        <p className="text-xl lg:text-3xl font-bold ">
          Uncover Regional Insights and Research Trends
        </p>
      </div>
      <div className="p-10 space-y-4">
        <h1 className="text-2xl lg:text-[28px] font-bold ">Visualise by:</h1>
        <Tabs defaultValue="collaboration" className="space-y-10">
          <div className="p-2 border rounded-md">
            <TabsList className="flex h-full">
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
              <TabsTrigger value="region">Region</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="word-cloud">Word Cloud</TabsTrigger>
              <TabsTrigger value="disorder">Disorder</TabsTrigger>
              <TabsTrigger value="top-five-disorders">
                Top Five Disorders
              </TabsTrigger>
              <TabsTrigger value="biologicalModality">
                Biological Mod..
              </TabsTrigger>
              <TabsTrigger value="geneticSource">Genetic Source</TabsTrigger>
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
