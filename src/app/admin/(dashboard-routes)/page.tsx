"use client";

import UploadEntry from "@/components/admin/upload-entry";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import DropBox from "@/components/ui/drop-box";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { apiCall } from "@/services/endpoint";
import { BASE_URL } from "@/static";
import { ApiResponse } from "@/types/studyViewList";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

const AdminPage = () => {
  const { data: entriesData, isLoading: isEntriesLoading } = useQuery<
    ApiResponse,
    Error
  >({
    queryKey: ["entries", { page: 1 }],
    queryFn: async () => {
      const res = await apiCall(
        {},
        `${BASE_URL}/studies`,
        "get",
        {},
        {
          page: 1,
        }
      );
      return res ?? {};
    },
  });

  const { data: visitorsData, isLoading } = useQuery<
    {
      unique_visitors: number;
      total_visits: number;
      daily_visits: {
        date: string;
        visit_count: number;
      }[];
    },
    Error
  >({
    queryKey: ["visitor-count"],
    queryFn: async (data) => {
      const res = await apiCall(data, `${BASE_URL}/visitor-count/`, "get");
      return res;
    },
  });

  const renderVisitorGraph = async (
    daily_visits: {
      date: string;
      visit_count: number;
    }[]
  ) => {
    const labels = daily_visits.map((visit) => visit.date);
    const counts = daily_visits.map((visit) => visit.visit_count);

    const Chartjs = await import("chart.js");
    const {
      Chart,
      CategoryScale,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Title,
      Tooltip,
      Legend,
    } = Chartjs;
    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Title,
      Tooltip,
      Legend
    );
    const canvas = document.getElementById(
      "visitorChart"
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      console.log(canvas, ctx);
      if (ctx) {
        const chart = Chart.getChart(ctx);
        if (chart) {
          chart.destroy();
        }
        new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Daily Visits",
                data: counts,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              x: {
                title: { display: true, text: "Date" },
              },
              y: {
                title: { display: true, text: "Visits" },
                beginAtZero: true,
              },
            },
          },
        });
      }
    }
  };

  useEffect(() => {
    const func = async () => {
      if (visitorsData && visitorsData?.daily_visits) {
        await renderVisitorGraph(visitorsData.daily_visits);
      }
    };
    func();
  }, [visitorsData]);
  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Start typing"
        className="h-14 rounded-lg text-base px-4"
      />
      <section className="flex items-center gap-5 w-full text-center">
        <Card className="w-full h-[120px]">
          <CardContent className="p-6">
            <CardTitle className="text-[#5A3A31] text-4xl">
              {isEntriesLoading ? (
                <Loader />
              ) : (
                entriesData?.count?.toLocaleString()
              )}
            </CardTitle>
            <CardDescription className="text-2xl text-black">
              Papers
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="w-full h-[120px]">
          <CardContent className="p-6">
            <CardTitle className="text-[#5A3A31] text-4xl">
              {isEntriesLoading ? (
                <Loader />
              ) : (
                entriesData?.count?.toLocaleString()
              )}
            </CardTitle>
            <CardDescription className="text-2xl text-black">
              Papers
            </CardDescription>
          </CardContent>
        </Card>
      </section>
      <section className="grid grid-cols-2 gap-5 w-full h-full">
        <Card className="w-full min-h-80 h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <UploadEntry />
          </CardContent>
        </Card>
        <Card className="w-full min-h-80 h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-3">Recent Activities</p>
            <div className="h-full flex flex-col gap-2 overflow-auto">
              <p className="text-primary font-medium">Yesterday</p>
              <p>
                @essien added Lateralization of hand skill in bipolar affective
                disorder
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
      <Card className="w-full h-80">
        <CardContent className="p-6 h-full flex flex-col justify-center items-center">
          <CardTitle className="text-[#5A3A31] text-4xl">Insert</CardTitle>
          <CardDescription className="text-2xl text-black">
            Graph Here
          </CardDescription>
        </CardContent>
      </Card>
      <section className="flex gap-5 w-full">
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Most Viewed Paper</p>
            <p className="mb-3 font-medium text-[#5A3A31]">
              Genetics and personality traits in patients with social anxiety
              disorder: a case-control study in South Africa
            </p>
            <p>Christine Lochner</p>
          </CardContent>
        </Card>
        <section className="grid grid-cols-1 gap-5 w-full h-full">
          <Card className="w-full h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <p className="text-xl mb-4">Most Popular Disorder</p>
              <p className="mb-3 font-medium text-[#5A3A31]">Depression</p>
            </CardContent>
          </Card>
          <Card className="w-full h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <p className="text-xl mb-4">Most Viewed Region</p>
              <p className="mb-3 font-medium text-[#5A3A31]">South Africa</p>
            </CardContent>
          </Card>
        </section>
      </section>
      <section className="flex gap-5 w-full">
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Visitors</p>
            <canvas id="visitorChart" width="100%" height="100%"></canvas>
          </CardContent>
        </Card>
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Search Keywords</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminPage;
