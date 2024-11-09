"use client";

import { useState } from "react";
import DropBox from "../ui/drop-box";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/static";

const UploadEntry = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleUpload = () => {
    toast({
      title: "Files uploaded successfully",
      duration: 2000,
    });
    setFiles([]);
  };
  return (
    <div className="grid grid-cols-1 gap-4 h-full">
      <div className="text-xl mb-5 flex gap-2 items-center justify-between">
        <p>Add New Entry</p>
      </div>
      <DropBox files={files} onFilesSelected={setFiles} />
      {files.length > 0 ? (
        <Button onClick={() => handleUpload()}>Upload Files</Button>
      ) : (
        <Button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(`${BASE_URL}/download-csv-example/`, "_blank");
            }
          }}
        >
          Download Template
        </Button>
      )}
    </div>
  );
};

export default UploadEntry;
