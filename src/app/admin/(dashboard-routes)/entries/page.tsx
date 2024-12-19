"use client";

import UploadEntry from "@/components/admin/upload-entry";
import PaginationControls from "@/components/PaginationControls";
import StudySkeleton from "@/components/skeletons/study-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/services/endpoint";
import { BASE_URL } from "@/static";
import { ApiResponse } from "@/types/studyViewList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { PlusCircleIcon } from "lucide-react";
import { useState } from "react";

const EntriesPage = () => {
  const [query, setQuery] = useState("");
  const [selectMultiple, setSelectMultiple] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<{ title?: string; page: number }>({
    page: 1,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ApiResponse, Error>({
    queryKey: ["entries", filter],
    queryFn: async () => {
      const res = await apiCall(
        {},
        `${BASE_URL}/studies`,
        "get",
        {},
        { ...filter, title: filter.title }
      );
      return res ?? {};
    },
  });

  const { mutate: deleteEntries, isPending: isDeletePending } = useMutation({
    mutationKey: ["deleteEntries"],
    mutationFn: async (ids: number[]) => {
      const res = await Promise.allSettled(
        ids.map((id) =>
          apiCall({}, `${BASE_URL}/studies/delete/${id}/`, "delete")
        )
      );
      return res;
    },
    onSuccess: (res) => {
      if (res.every((r) => r.status === "fulfilled")) {
        toast({
          title: "Entries deleted successfully",
          // status: "success",
        });
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === "entries";
          },
        });
        setSelectedIds([]);
        setSelectMultiple(false);
      }
    },
  });

  const handleCheckChange = (
    id: number,
    checked: boolean | "indeterminate"
  ) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

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
      {isLoading ? (
        <Loader className="size-10 my-6" />
      ) : (
        <>
          <div className="flex items-center gap-4 justify-end">
            <Button
              variant={"outline"}
              onClick={() => {
                setSelectMultiple((prev) => {
                  if (prev) setSelectedIds([]);
                  return !prev;
                });
              }}
              className="h-12"
            >
              {selectMultiple ? "Done" : "Select Multiple"}
            </Button>
            {selectMultiple && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    loading={isDeletePending}
                    className="bg-red-700 h-12 border hover:border-red-700 border-red-700 hover:text-red-700"
                  >
                    Delete ({selectedIds.length}) selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete ({selectedIds.length})
                      articles
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the selected articles from database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (selectedIds.length === 0) {
                          toast({
                            title: "No entries selected",
                          });
                        } else {
                          deleteEntries(selectedIds);
                        }
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="text-white text-base gap-2 w-56 h-12">
                  <PlusCircleIcon size={16} />
                  Add New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="">
                <UploadEntry />
              </DialogContent>
            </Dialog>
          </div>
          <p>
            Showing {10} of {data?.count} studies
          </p>
          <div className="space-y-4">
            {isLoading
              ? new Array(10)
                  .fill(null)
                  .map((_, i) => <StudySkeleton key={i} />)
              : (data?.results ?? []).map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`bg-primary border-4 text-white p-3 space-y-2 rounded-lg relative transition-all duration-300 ${
                        isChecked
                          ? "border-white scale-[0.98] drop-shadow-lg"
                          : "scale-100"
                      } ${
                        selectMultiple ? "cursor-pointer" : "cursor-default"
                      }`}
                      onClick={() => {
                        if (selectMultiple) handleCheckChange(r.id, !isChecked);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold">{r.id}</p>
                        {selectMultiple ? (
                          <Checkbox
                            id={`entry-${r.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleCheckChange(r.id, checked)
                            }
                            className="bg-white data-[state=checked]:border-white data-[state=checked]:border-2"
                          />
                        ) : (
                          <span></span>
                        )}
                      </div>
                      <p className="font-bold">{r.title}</p>
                      <p className="space-x-2 text-white/70">{r.lead_author}</p>
                    </div>
                  );
                })}
          </div>
          {data?.results && data?.results.length <= 0 ? null : (
            <PaginationControls
              prevPage={() =>
                setFilter((prev) => ({
                  ...prev,
                  page: Math.max((Number(prev.page) || 1) - 1, 1),
                }))
              }
              nextPage={() => {
                console.log("next page");
                setFilter((prev) => ({
                  ...prev,
                  page: (Number(prev.page) || 1) + 1,
                }));
              }}
              page={Number(filter.page) || 1}
              count={data?.count}
              isLoading={isLoading}
            />
          )}
        </>
      )}
    </div>
  );
};

export default EntriesPage;
