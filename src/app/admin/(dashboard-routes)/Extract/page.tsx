"use client"
import { extractPdf, saveExtractedData } from "@/services/Admin"
import { useState, useRef } from "react"
import toast from "react-hot-toast"

interface PdfExtractionResponse {
  metadata: {
    pmid: string | null
    title: string
    abstract: string
    year: number
    DOI: string | null
    journal_name: string
    impact_factor: number | null
    funding_source: string | null
    lead_author: string
    countries: string[]
    article_type: string[]
    disorder: string[]
    phenotype: string | null
    diagnostic_criteria_used: string | null
    study_designs: string
    sample_size: string | null
    age_range: string | null
    mean_age: string | null
    male_female_split: string | null
    biological_modalities: string[]
    citation: number
    keyword: string
    date: string
    pages: string
    issue: string
    volume: string
    automatic_tags: string | null
    authors_affiliations: {
      authors: Array<{
        name: string
        affiliation_numbers: string[]
      }>
      affiliations: {
        [key: string]: string
      }
    }
    biological_risk_factor_studied: string | null
    biological_rationale_provided: string | null
    status_of_corresponding_gene: string | null
    technology_platform: string | null
    genetic_source_materials: string[]
    evaluation_method: string | null
    statistical_model: string | null
    criteria_for_significance: string | null
    validation_performed: string | null
    findings_conclusions: string | null
    generalisability_of_conclusion: string | null
    adequate_statistical_powered: string | null
    comment: string | null
    should_exclude: boolean
  }
}

export default function PDFDataExtractor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [extractedData, setExtractedData] =
    useState<PdfExtractionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf") {
        setPdfFile(file)
        await processPdfFile(file)
      } else {
        setError("Please upload a PDF file")
        toast.error("Please upload a PDF file")
      }
    }
  }

  const processPdfFile = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setSaveMessage(null)

    try {
      const data = await extractPdf(file)
      setExtractedData(data)
    } catch (err) {
      console.error("Failed to extract text from PDF:", err)
      setError("Failed to process PDF file. Please try again.")
      toast.error("Failed to process PDF file. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/pdf") {
        setPdfFile(file)
        await processPdfFile(file)
      } else {
        setError("Please upload a PDF file")
        toast.error("Please upload a PDF file")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extractedData || !pdfFile) {
      alert("Please process a PDF file first")
      return
    }

    setIsSaving(true)
    setSaveMessage(null)
    setError(null)

    try {
      await saveExtractedData({
        pdf: pdfFile,
        payload: extractedData.metadata,
      })
      toast.success("Data saved successfully")
      setSaveMessage("Data saved successfully!")
    } catch (err: any) {
      console.log("Failed to save data:", err.response.data.error)

      setError("Failed to save data. Please try again.")
      toast.error(
        err.response.data.error || "Failed to save data. Please try again."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!extractedData) return

    setExtractedData((prev) => {
      if (!prev) return prev

      const newData = { ...prev }
      const fieldPath = field.split(".")

      if (fieldPath.length === 1) {
        ;(newData.metadata as any)[fieldPath[0]] = value
      } else if (fieldPath.length === 2) {
        ;(newData.metadata as any)[fieldPath[0]][fieldPath[1]] = value
      }

      return newData
    })
  }

  const handleArrayInputChange = (field: string, value: string) => {
    if (!extractedData) return

    const arrayValue = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item)
    handleInputChange(field, arrayValue)
  }

  const handleAuthorsChange = (
    index: number,
    field: "name" | "affiliations",
    value: string
  ) => {
    if (!extractedData) return

    setExtractedData((prev) => {
      if (!prev) return prev

      const newData = JSON.parse(JSON.stringify(prev))
      if (field === "name") {
        newData.metadata.authors_affiliations.authors[index].name = value
      } else if (field === "affiliations") {
        const affiliationNumbers = value
          .split(",")
          .map((num) => num.trim())
          .filter((num) => num)
        newData.metadata.authors_affiliations.authors[
          index
        ].affiliation_numbers = affiliationNumbers
      }

      return newData
    })
  }

  const handleAffiliationsChange = (
    affiliationNumber: string,
    value: string
  ) => {
    if (!extractedData) return

    setExtractedData((prev) => {
      if (!prev) return prev

      const newData = JSON.parse(JSON.stringify(prev))
      newData.metadata.authors_affiliations.affiliations[affiliationNumber] =
        value
      return newData
    })
  }

  const addAuthor = () => {
    if (!extractedData) return

    setExtractedData((prev) => {
      if (!prev) return prev

      const newData = JSON.parse(JSON.stringify(prev))
      const newAuthorNumber =
        Object.keys(newData.metadata.authors_affiliations.affiliations).length +
        1

      newData.metadata.authors_affiliations.authors.push({
        name: "",
        affiliation_numbers: [newAuthorNumber.toString()],
      })

      newData.metadata.authors_affiliations.affiliations[
        newAuthorNumber.toString()
      ] = ""

      return newData
    })
  }

  const removeAuthor = (index: number) => {
    if (!extractedData) return

    setExtractedData((prev) => {
      if (!prev) return prev

      const newData = JSON.parse(JSON.stringify(prev))
      newData.metadata.authors_affiliations.authors.splice(index, 1)
      return newData
    })
  }

  const formatArrayData = (data: string[] | string | null): string => {
    if (Array.isArray(data)) {
      return data.join(", ")
    }
    return data || ""
  }

  const formatNullData = (data: any): string => {
    if (data === null || data === undefined || data === "") return ""
    return String(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold text-orange-500">
            Research Paper Data Extractor
          </h1>
          <p className="text-gray-600">
            Upload a PDF research paper to extract and edit structured data
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-orange-500">
            Upload PDF File
          </h2>

          <div
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              pdfFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-orange-400 hover:bg-orange-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center justify-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500"></div>
                <p className="font-medium text-gray-600">Processing PDF...</p>
                <p className="mt-1 text-sm text-gray-500">
                  This may take a few moments
                </p>
              </div>
            ) : pdfFile ? (
              <div className="flex flex-col items-center">
                <svg
                  className="mb-3 h-12 w-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <p className="font-medium text-gray-700">{pdfFile.name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Click to select a different file
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPdfFile(null)
                    setExtractedData(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  className="mt-3 rounded-md bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg
                  className="mb-3 h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p className="font-medium text-gray-600">
                  Drag & drop a PDF file here
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  or click to browse files
                </p>
                <p className="mt-2 text-xs text-gray-400">PDF files only</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Extracted Data Form */}
        {extractedData && extractedData.metadata && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg bg-white p-6 shadow-md"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-orange-500">
                Extracted Research Data
              </h2>
              <div className="flex items-center text-green-600">
                <svg
                  className="mr-1 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-sm font-medium">
                  Data extracted successfully - All fields are editable
                </span>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Basic Information
              </h3>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    PMID
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.pmid)}
                    onChange={(e) => handleInputChange("pmid", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formatNullData(extractedData.metadata.year)}
                    onChange={(e) =>
                      handleInputChange("year", parseInt(e.target.value) || 0)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    DOI
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.DOI)}
                    onChange={(e) => handleInputChange("DOI", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Publication Date
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.date)}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Journal Name
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.journal_name)}
                    onChange={(e) =>
                      handleInputChange("journal_name", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Impact Factor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatNullData(extractedData.metadata.impact_factor)}
                    onChange={(e) =>
                      handleInputChange(
                        "impact_factor",
                        parseFloat(e.target.value) || null
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Volume
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.volume)}
                    onChange={(e) =>
                      handleInputChange("volume", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Issue
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.issue)}
                    onChange={(e) => handleInputChange("issue", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Pages
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.pages)}
                    onChange={(e) => handleInputChange("pages", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Citation Count
                  </label>
                  <input
                    type="number"
                    value={formatNullData(extractedData.metadata.citation)}
                    onChange={(e) =>
                      handleInputChange(
                        "citation",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <textarea
                  value={formatNullData(extractedData.metadata.title)}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Abstract Section */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Abstract & Keywords
              </h3>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Abstract
                </label>
                <textarea
                  value={formatNullData(extractedData.metadata.abstract)}
                  onChange={(e) =>
                    handleInputChange("abstract", e.target.value)
                  }
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Article Type (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formatArrayData(extractedData.metadata.article_type)}
                    onChange={(e) =>
                      handleArrayInputChange("article_type", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Keywords
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.keyword)}
                    onChange={(e) =>
                      handleInputChange("keyword", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Study Details Section */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Study Details
              </h3>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Disorder (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formatArrayData(extractedData.metadata.disorder)}
                    onChange={(e) =>
                      handleArrayInputChange("disorder", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phenotype
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.phenotype)}
                    onChange={(e) =>
                      handleInputChange("phenotype", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Diagnostic Criteria Used
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.diagnostic_criteria_used
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "diagnostic_criteria_used",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Study Designs
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.study_designs)}
                    onChange={(e) =>
                      handleInputChange("study_designs", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Sample Size
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.sample_size)}
                    onChange={(e) =>
                      handleInputChange("sample_size", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Age Range
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.age_range)}
                    onChange={(e) =>
                      handleInputChange("age_range", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mean Age
                  </label>
                  <input
                    type="text"
                    value={formatNullData(extractedData.metadata.mean_age)}
                    onChange={(e) =>
                      handleInputChange("mean_age", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Male/Female Split
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.male_female_split
                    )}
                    onChange={(e) =>
                      handleInputChange("male_female_split", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Countries (comma-separated)
                </label>
                <textarea
                  value={formatArrayData(extractedData.metadata.countries)}
                  onChange={(e) =>
                    handleArrayInputChange("countries", e.target.value)
                  }
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Biological & Technical Details */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Biological & Technical Details
              </h3>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Biological Modalities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formatArrayData(
                      extractedData.metadata.biological_modalities
                    )}
                    onChange={(e) =>
                      handleArrayInputChange(
                        "biological_modalities",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Automatic Tags
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.automatic_tags
                    )}
                    onChange={(e) =>
                      handleInputChange("automatic_tags", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Biological Risk Factor Studied
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.biological_risk_factor_studied
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "biological_risk_factor_studied",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Biological Rationale Provided
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.biological_rationale_provided
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "biological_rationale_provided",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status of Corresponding Gene
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.status_of_corresponding_gene
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "status_of_corresponding_gene",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Technology Platform
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.technology_platform
                    )}
                    onChange={(e) =>
                      handleInputChange("technology_platform", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Genetic Source Materials (comma-separated)
                </label>
                <input
                  type="text"
                  value={formatArrayData(
                    extractedData.metadata.genetic_source_materials
                  )}
                  onChange={(e) =>
                    handleArrayInputChange(
                      "genetic_source_materials",
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Methodology & Analysis */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Methodology & Analysis
              </h3>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Evaluation Method
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.evaluation_method
                    )}
                    onChange={(e) =>
                      handleInputChange("evaluation_method", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Statistical Model
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.statistical_model
                    )}
                    onChange={(e) =>
                      handleInputChange("statistical_model", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Criteria for Significance
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.criteria_for_significance
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "criteria_for_significance",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Validation Performed
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.validation_performed
                    )}
                    onChange={(e) =>
                      handleInputChange("validation_performed", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Results & Conclusions */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Results & Conclusions
              </h3>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Findings & Conclusions
                </label>
                <textarea
                  value={formatNullData(
                    extractedData.metadata.findings_conclusions
                  )}
                  onChange={(e) =>
                    handleInputChange("findings_conclusions", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Generalisability of Conclusion
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.generalisability_of_conclusion
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "generalisability_of_conclusion",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Adequate Statistical Power
                  </label>
                  <input
                    type="text"
                    value={formatNullData(
                      extractedData.metadata.adequate_statistical_powered
                    )}
                    onChange={(e) =>
                      handleInputChange(
                        "adequate_statistical_powered",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Authors Section */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Authors & Affiliations
              </h3>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Lead Author
                </label>
                <input
                  type="text"
                  value={formatNullData(extractedData.metadata.lead_author)}
                  onChange={(e) =>
                    handleInputChange("lead_author", e.target.value)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Funding Source
                </label>
                <input
                  type="text"
                  value={formatNullData(extractedData.metadata.funding_source)}
                  onChange={(e) =>
                    handleInputChange("funding_source", e.target.value)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Authors & Affiliations
                  </label>
                  <button
                    type="button"
                    onClick={addAuthor}
                    className="rounded-md bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
                  >
                    Add Author
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4">
                  {extractedData.metadata.authors_affiliations.authors.map(
                    (author, index) => (
                      <div
                        key={index}
                        className="mb-4 border-b border-gray-200 pb-4 last:mb-0 last:border-b-0 last:pb-0"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium text-gray-800">
                            Author {index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeAuthor(index)}
                            className="rounded-md bg-red-500 px-2 py-1 text-xs text-white transition-colors hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Author Name
                            </label>
                            <input
                              type="text"
                              value={author.name}
                              onChange={(e) =>
                                handleAuthorsChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Affiliation Numbers (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={author.affiliation_numbers.join(", ")}
                              onChange={(e) =>
                                handleAuthorsChange(
                                  index,
                                  "affiliations",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Affiliation Details
                </label>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  {Object.entries(
                    extractedData.metadata.authors_affiliations.affiliations
                  ).map(([number, affiliation]) => (
                    <div key={number} className="mb-3 last:mb-0">
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Affiliation {number}
                      </label>
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) =>
                          handleAffiliationsChange(number, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mb-8">
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-lg font-medium text-orange-500">
                Additional Information
              </h3>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Comment
                </label>
                <textarea
                  value={formatNullData(extractedData.metadata.comment)}
                  onChange={(e) => handleInputChange("comment", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={extractedData.metadata.should_exclude}
                    onChange={(e) =>
                      handleInputChange("should_exclude", e.target.checked)
                    }
                    className="mr-2 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Should Exclude from Analysis
                  </span>
                </label>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center rounded-md bg-orange-500 px-6 py-2 font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-orange-300"
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  "Save Extracted Data"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
