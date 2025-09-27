import { BASE_URL } from "@/static"
import axios from "axios"

export const fetchShortStudies = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/shortstudies/`)
    return response.data
  } catch (error) {
    console.error("Failed to fetch short studies:", error)
    throw error
  }
}

export const uploadPdf = async (studyId: string, file: File) => {
  const formData = new FormData()
  formData.append("study_id", studyId)

  formData.append("file", file)

  try {
    const response = await axios.post(`${BASE_URL}/ai/upload-pdf/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  } catch (error) {
    console.error("Failed to upload PDF:", error)
    throw error
  }
}

export const fetchImages = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/ai/images/`)
    return response.data
  } catch (error) {
    console.error("Failed to fetch images:", error)
    throw error
  }
}

// POST /ai/images/upload/ - Upload a new image with caption and study ID
export const uploadImage = async (
  studyId: string,
  caption: string,
  imageFile: File
) => {
  const formData = new FormData()
  formData.append("study", studyId)
  formData.append("caption", caption)
  formData.append("image", imageFile)

  try {
    const response = await axios.post(
      `${BASE_URL}/ai/images/upload/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    return response.data
  } catch (error) {
    console.error("Failed to upload image:", error)
    throw error
  }
}

// GET /ai/images/<pk>/ - Get a single image by ID
export const fetchImageById = async (imageId: string) => {
  try {
    const response = await axios.get(`${BASE_URL}/ai/images/${imageId}/`)
    return response.data
  } catch (error) {
    console.error(`Failed to fetch image with ID ${imageId}:`, error)
    throw error
  }
}

// response type
interface PdfExtractionResponse {
  metadata: {
    pmid: string | null
    title: string
    abstract: string
    year: number
    DOI: string
    journal_name: string
    impact_factor: number
    funding_source: string
    lead_author: string
    countries: string[]
    article_type: string[]
    disorder: string[]
    phenotype: string
    diagnostic_criteria_used: string
    study_designs: string
    sample_size: string
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
    automatic_tags: string
    authors_affiliations: {
      authors: Array<{
        name: string
        affiliation_numbers: string[]
      }>
      affiliations: {
        [key: string]: string
      }
    }
    biological_risk_factor_studied: string
    biological_rationale_provided: string
    status_of_corresponding_gene: string | null
    technology_platform: string | null
    genetic_source_materials: string[]
    evaluation_method: string
    statistical_model: string
    criteria_for_significance: string
    validation_performed: string
    findings_conclusions: string
    generalisability_of_conclusion: string
    adequate_statistical_powered: string
    comment: string | null
    should_exclude: boolean
  }
}

export const extractPdf = async (
  file: File
): Promise<PdfExtractionResponse> => {
  const formData = new FormData()
  formData.append("file", file)
  try {
    const response = await axios.post(`${BASE_URL}/ingest/extract/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  } catch (error) {
    console.error("Failed to extract text from PDF:", error)
    throw error
  }
}

interface SaveStudyData {
  pdf: File
  payload: {
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

export const saveExtractedData = async (data: SaveStudyData): Promise<any> => {
  const formData = new FormData()

  formData.append("pdf", data.pdf)

  formData.append("payload", JSON.stringify(data.payload))

  try {
    const response = await axios.post(`${BASE_URL}/studies/save/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  } catch (error) {
    console.error("Failed to save extracted data:", error)
    throw error
  }
}
