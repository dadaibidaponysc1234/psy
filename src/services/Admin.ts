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
