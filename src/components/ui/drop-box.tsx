"use client";

import {
  ChangeEventHandler,
  DragEventHandler,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { Check, Trash, X } from "lucide-react";
import Image from "next/image";
import { createBlobUrl } from "@/lib/utils";

const DropBox = ({
  files,
  onFilesSelected,
}: {
  files: File[];
  onFilesSelected: (files: File[]) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      onFilesSelected([...files, ...newFiles]);
    }
  };
  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const newFiles = Array.from(droppedFiles);
      onFilesSelected([...files, ...newFiles]);
    }
  };

  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);

  const handleRemoveFile = (index: number) => {
    onFilesSelected(files.filter((_, i) => i !== index));
  };

  // useEffect(() => {
  //   onFilesSelected(files);
  // }, [files, onFilesSelected]);

  return (
    <section className="flex flex-col h-full">
      <div
        className={`flex-grow bg-slate-100 active:border-primary hover:border-primary border-dashed border rounded-xl transition-all duration-300 ${
          isDragging ? "border-primary" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <>
          <div className="h-full flex flex-col items-center justify-center gap-1.5 py-4 text-center">
            <Image src={"/icons/upload.svg"} width={60} height={48} alt="" />
            <p className="font-bold">
              Drag & drop files or{" "}
              <label
                htmlFor="browse"
                className="browse-btn text-primary underline cursor-pointer"
              >
                Browse
              </label>
            </p>
            <p className="text-[#676767] text-sm">
              Supported format: comma-separated values (csv) file
            </p>
          </div>
          <input
            type="file"
            hidden
            id="browse"
            onChange={handleFileChange}
            accept=".csv"
            multiple
            className="hidden"
          />
        </>

        {/* {files.length > 0 && (
          <div className="flex items-center text-[#6dc24b]">
            <Check style={{ color: "#6DC24B", marginRight: 1 }} />
            <p>{files.length} file(s) selected</p>
          </div>
        )} */}
      </div>
      {files.length > 0 && (
        <div className="px-3 pt-4 w-full">
          <div>
            {files.map((file, index) => (
              <div
                className="flex justify-between items-center gap-3 hover:bg-slate-100 transition-all duration-200 px-1"
                key={index}
              >
                <a
                  href={createBlobUrl(file)}
                  target="_blank"
                  className="w-fit hover:text-primary transition-all duration-200"
                >
                  {file.name}
                </a>
                {/* <p>{file.type}</p> */}
                <div className="cursor-pointer">
                  <Trash
                    size={14}
                    className="text-slate-500"
                    onClick={() => handleRemoveFile(index)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default DropBox;
