"use client"

import React, { useEffect, useState } from "react"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { FiUpload } from "react-icons/fi"
import { cn } from "@/lib/utils"

import { fetchShortStudies, uploadImage, fetchImages } from "@/services/Admin"
import toast from "react-hot-toast"

const UploadImages = () => {
  type StudyImage = {
    id: number
    image_url: string
    caption: string
  }

  const [studies, setStudies] = useState([])
  const [selectedStudy, setSelectedStudy] = useState<any>(null)
  const [selectedId, setSelectedId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [images, setImages] = useState<StudyImage[]>([])
  const [open, setOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6
  const totalPages = Math.ceil(images.length / pageSize)
  const paginatedImages = images.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    const loadStudies = async () => {
      try {
        const data = await fetchShortStudies()
        setStudies(data)
      } catch (err) {
        console.error(err)
      }
    }

    const loadImages = async () => {
      try {
        const data = await fetchImages()
        setImages(data)
      } catch (err) {
        console.error(err)
      }
    }

    loadStudies()
    loadImages()
  }, [])

  useEffect(() => {
    if (selectedStudy) setSelectedId(String(selectedStudy.id))
  }, [selectedStudy])

  const handleUpload = async () => {
    if (!selectedId || !file || !caption.trim()) {
      return toast.error("Study, image, and caption are required.")
    }

    try {
      const response = await uploadImage(selectedId, caption, file)
      toast.success(response.message)
      setFile(null)
      setCaption("")

      const updated = await fetchImages()
      setImages(updated)
    } catch (error) {
      toast.error("Upload failed.")
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-6 p-6">
      <div className="w-full rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          🖼️ Upload Study Image
        </h2>

        {/* Combobox dropdown */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Study
          </label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-12 w-full justify-between text-left"
              >
                {selectedStudy ? selectedStudy.title : "Choose a study..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search studies..." />
                <CommandEmpty>No study found.</CommandEmpty>
                <CommandList>
                  {[...Object.values(studies)]
                    .sort((a: any, b: any) => a.title.localeCompare(b.title))
                    .map((study: any) => (
                      <CommandItem
                        key={study.id}
                        value={study.title}
                        onSelect={() => {
                          setSelectedStudy(study)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedStudy?.id === study.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {study.title}
                      </CommandItem>
                    ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Caption input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Caption
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none"
            placeholder="Enter a short caption"
          />
        </div>

        {/* Drag-and-drop image upload */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Upload Image
          </label>
          <div
            className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 px-4 text-center text-gray-500 hover:border-orange-500 hover:bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const droppedFile = e.dataTransfer.files?.[0]
              if (droppedFile && droppedFile.type.startsWith("image/")) {
                setFile(droppedFile)
              } else {
                toast.error("Please drop a valid image file.")
              }
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <FiUpload className="mx-auto mb-2 text-xl" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to browse or drop image here"}
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="mt-2 w-full rounded-md bg-orange-500 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600"
        >
          Upload Image
        </button>
      </div>

      {/* Uploaded Images Grid */}
      <div className="w-full max-w-4xl">
        <h3 className="mb-3 text-lg font-semibold text-gray-700">
          📚 Uploaded Images
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {paginatedImages.length === 0 ? (
            <p className="col-span-full text-gray-500">
              No images uploaded yet.
            </p>
          ) : (
            paginatedImages.map((img) => (
              <div
                key={img.id}
                className="rounded-lg border bg-white p-3 shadow-sm"
              >
                <img
                  src={img.image_url}
                  alt={img.caption}
                  className="mb-2 h-40 w-full rounded object-cover"
                />
                <p className="text-sm text-gray-700">{img.caption}</p>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-md border px-3 py-1 text-sm text-gray-700 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-md border px-3 py-1 text-sm text-gray-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadImages
