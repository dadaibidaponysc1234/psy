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
    <div className="max-w-[1024px] mx-auto w-full">
      <div className="p-10 lg:space-y-5 space-y-2">
        <h1 className="text-3xl pt-6 lg:text-5xl font-semibold text-[#5A3A31]">
          Dive Deep into Africa's Genomic Landscape
        </h1>
        <p className="text-xl lg:text-3xl font-bold ">
          Uncover Regional Insights and Research Trends
        </p>
      </div>
      <div className="p-10 space-y-4">
        <h1 className="text-2xl lg:text-[28px] font-bold ">Visualize by:</h1>
        <Tabs defaultValue="collaboration" className="space-y-10">
          <div className="p-2 border rounded-md overflow-auto">
            <TabsList className="flex h-full">
              <TabsTrigger value="collaboration" className="w-full">
                Collaboration
              </TabsTrigger>
              <TabsTrigger value="year" className="w-full">
                Year
              </TabsTrigger>
              <TabsTrigger value="region" className="w-full">
                Region
              </TabsTrigger>
              <TabsTrigger value="disorder" className="w-full">
                Disorder
              </TabsTrigger>
              <TabsTrigger value="biologicalModality" className="w-full">
                Biological Mod..
              </TabsTrigger>
              <TabsTrigger value="geneticSource" className="w-full">
                Genetic Source
              </TabsTrigger>
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
