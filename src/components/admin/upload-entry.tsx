"use client";

import { useState } from "react";
import DropBox from "../ui/drop-box";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { AUTH_TOKEN, BASE_URL } from "@/static";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/services/endpoint";
import axios from "axios";
import Cookies from "js-cookie";

const UploadEntry = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: downloadTemplate, isPending: isDownloadTemplatePending } =
    useMutation({
      mutationKey: ["downloadTemplate"],
      mutationFn: async () => {
        const res = await axios.get(`${BASE_URL}/download-csv-example/`, {
          headers: {
            Authorization: `Bearer ${Cookies.get(AUTH_TOKEN)}`,
            "Content-Type": "text/csv",
          },
          responseType: "blob",
        });
        if (res) {
          const blob = res.data;
          console.log(blob);
          const url = window.URL.createObjectURL(blob);
          console.log(url);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = "study_template.csv";
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          // console.error("Failed to download CSV:", res.data.status);
          // toast({
          //   title: "Failed to download CSV: " + (res.data?.message ?? ""),
          //   type: "foreground",
          //   duration: 3000,
          // });
        }
        return res.data;
      },
    });

  const { mutate: uploadFile, isPending: isUploadFilePending } = useMutation({
    mutationKey: ["entries"],
    mutationFn: async (formData: FormData) => {
      const res = await apiCall(formData, `${BASE_URL}/upload-csv/`, "post");
      return res;
    },
    onSuccess: (res) => {
      toast({
        title: res?.message ?? "File uploaded successfully",
        type: "foreground",
        duration: 2000,
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === "entries";
        },
      });
      setFiles([]);
    },
  });

  const handleUpload = () => {
    if (files.length === 0)
      return toast({ title: "Please select a file to upload", duration: 2000 });

    const formData = new FormData();
    formData.append("file", files[0]);
    uploadFile(formData);
  };
  return (
    <div className="grid grid-cols-1 gap-4 h-full">
      <div className="text-xl mb-5 flex gap-2 items-center justify-between">
        <p>Add New Entry</p>
      </div>
      <DropBox files={files} limit={1} onFilesSelected={setFiles} />
      {files.length > 0 ? (
        <Button loading={isUploadFilePending} onClick={() => handleUpload()}>
          Upload Files
        </Button>
      ) : (
        <Button
          loading={isDownloadTemplatePending}
          onClick={() => downloadTemplate()}
        >
          Download Template
        </Button>
      )}
    </div>
  );
};

export default UploadEntry;
