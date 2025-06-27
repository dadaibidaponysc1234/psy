"use client"

import React, { useEffect, useState } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { fetchShortStudies, uploadPdf } from "@/services/Admin"
import toast from "react-hot-toast"
import { FiUpload } from "react-icons/fi"

const FileUploads = () => {
  const [studies, setStudies] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const loadStudies = async () => {
      try {
        const data = await fetchShortStudies()
        setStudies(data)
      } catch (err) {
        console.error(err)
      }
    }

    loadStudies()
  }, [])

  const handleUpload = async () => {
    if (!selectedId || !file) {
      return toast.error("Please select a study and a PDF file.")
    }

    try {
      const response = await uploadPdf(selectedId, file)
      toast.success(response.message)
      setFile(null)
    } catch (error) {
      toast.error("Upload failed.")
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          📄 Upload Study PDF
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Study
          </label>
          <Select onValueChange={(value) => setSelectedId(value)}>
            <SelectTrigger className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-0">
              <SelectValue placeholder="Choose a study..." />
            </SelectTrigger>
            <SelectContent>
              {[...Object.values(studies)]
                .sort((a: any, b: any) => a.title.localeCompare(b.title))
                .map((study: any) => (
                  <SelectItem key={study.id} value={String(study.id)}>
                    {study.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Upload PDF
          </label>
          <div
            className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 px-4 text-center text-gray-500 hover:border-orange-500 hover:bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const droppedFile = e.dataTransfer.files?.[0]
              if (droppedFile && droppedFile.type === "application/pdf") {
                setFile(droppedFile)
              } else {
                toast.error("Please drop a valid PDF file.")
              }
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <FiUpload className="mx-auto mb-2 text-xl" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to browse or drop PDF here"}
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="mt-2 w-full rounded-md bg-orange-500 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600"
        >
          Upload & Index PDF
        </button>
      </div>
    </div>
  )
}

export default FileUploads
