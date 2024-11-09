"use client";

import UploadEntry from "@/components/admin/upload-entry";
import PaginationControls from "@/components/PaginationControls";
import StudySkeleton from "@/components/skeletons/study-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BASE_URL } from "@/static";
import { ApiResponse } from "@/types/studyViewList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { PlusCircleIcon } from "lucide-react";
import { useState } from "react";

const EntriesPage = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<{ title: string; page: number }>({
    title: "",
    page: 1,
  });

  const { data, isLoading } = useQuery<ApiResponse, Error>({
    queryKey: ["entries", filter],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/studies`, {
        params: { title: filter.title || undefined },
      });
      return response.data;
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <Input
        value={query}
        onChange={(e) => {
          const value = e.target.value.trim();
          setQuery(value);
          if (!value) {
            setQuery("");
            setFilter((prev) => ({ ...prev, title: "" }));
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            setFilter((prev) => ({ ...prev, title: query }));
          }
        }}
        placeholder="Search by tag, title or author"
        className="h-14 rounded-lg text-base px-4"
      />
      <Dialog>
        <DialogTrigger>
          <Button className="text-white text-base gap-2 float-right w-56 h-14">
            <PlusCircleIcon size={16} />
            Add New Entry
          </Button>
        </DialogTrigger>
        <DialogContent className="">
          {/* <DialogHeader>
            <DialogTitle>
              
            </DialogTitle>
          </DialogHeader> */}
          <UploadEntry />
        </DialogContent>
      </Dialog>
      <p>
        Showing {10} of {data?.count} studies
      </p>
      <div className="space-y-5">
        {isLoading
          ? new Array(10).fill(null).map((_, i) => <StudySkeleton key={i} />)
          : (data?.results ?? []).map((r) => (
              <div
                key={r.id}
                className="bg-primary text-white p-3 space-y-2 rounded-lg"
              >
                <p className="font-bold">{r.id}</p>
                <p className="font-bold">{r.title}</p>
                <p className="space-x-2 text-white/70">{r.lead_author}</p>
              </div>
            ))}
      </div>
      {data?.results && data?.results.length <= 0 ? null : (
        <PaginationControls
          prevPage={() =>
            setFilter((prev) => ({
              ...prev,
              page: Math.max((Number(prev.page) || 1) - 1, 1),
            }))
          }
          nextPage={() =>
            setFilter((prev) => ({
              ...prev,
              page: (Number(prev.page) || 1) + 1,
            }))
          }
          page={Number(filter.page) || 1}
          count={data?.count}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default EntriesPage;
