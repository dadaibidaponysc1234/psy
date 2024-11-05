"use client";

import { useState } from "react";
import DropBox from "../ui/drop-box";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";

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
    <>
      <div className="text-xl mb-5 flex gap-2 items-center justify-between">
        <p>Add New Entry</p>
        {files.length > 0 && (
          <Button onClick={() => handleUpload()}>Upload Files</Button>
        )}
      </div>
      <DropBox files={files} onFilesSelected={setFiles} />
    </>
  );
};

export default UploadEntry;
