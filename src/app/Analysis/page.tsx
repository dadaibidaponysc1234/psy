"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import YearlyStudyCount from "@/components/graph/yearly";
import RegionalStudyCount from "@/components/graph/region";
import DisorderStudyCount from "@/components/graph/disorder";
import BiologicalStudyCount from "@/components/graph/biological";
import GeneticsStudyCount from "@/components/graph/genetics";
import Chord from "@/components/graph/collaboration";

const Analysis = () => {
  return (
    <div>
      <div className="p-10 space-y-8">
        <h1 className="text-3xl pt-6 lg:text-6xl font-semibold text-[#5A3A31]">
          Dive Deep into Africa’s Genomic Landscape
        </h1>
        <p className="text-2xl lg:text-3xl font-bold ">
          Uncover Regional Insights and Research Trends
        </p>
      </div>
      <div className="p-10 w-full space-y-6 ">
        <h1 className="text-2xl lg:text-3xl font-bold ">Visualize by:</h1>
        <Tabs
          defaultValue="collaboration"
          className="lg:w-[70vw] mx-auto space-y-10"
        >
          <div className="p-1 border-none lg:border-y-[1px] lg:border-x-[1px]">
            <TabsList className="flex">
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
              <TabsTrigger value="region">Region</TabsTrigger>
              <TabsTrigger value="disorder">Disorder</TabsTrigger>
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
          <TabsContent value="disorder">
            <DisorderStudyCount />
          </TabsContent>
          <TabsContent value="biologicalModality">
            <BiologicalStudyCount />
          </TabsContent>
          <TabsContent value="geneticSource">
            <GeneticsStudyCount />
          </TabsContent>
          <TabsContent value="collaboration">
            <Chord />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analysis;
