import { BASE_URL } from "@/static"
import axios from "axios"

// 1. One-off Ask (no memory)
export const askQuestion = async (q: string) => {
  const response = await axios.get(`${BASE_URL}/ai/ask/`, {
    params: { q },
  })
  return response.data
}

// 2. Chat with memory (POST)
export interface ChatRequest {
  email: string
  question: string
  session_id?: number
}

export const chatWithMemory = async (payload: ChatRequest) => {
  const response = await axios.post(`${BASE_URL}/ai/chat/`, payload)
  return response.data
}

// 3. Get All Chat Sessions for User
export const getChatSessions = async (email: string) => {
  const response = await axios.get(`${BASE_URL}/ai/chat/sessions/`, {
    params: { email },
  })
  return response.data
}

// 4. Delete Chat Session
export const deleteChatSession = async (sessionId: number, email: string) => {
  const response = await axios.delete(
    `${BASE_URL}/ai/chat/session/${sessionId}/delete/`,
    {
      params: { email },
    }
  )
  return response.data
}

// 5. Delete Individual Message
export const deleteChatMessage = async (messageId: number, email: string) => {
  const response = await axios.delete(
    `${BASE_URL}/ai/chat/message/${messageId}/delete/`,
    {
      params: { email },
    }
  )
  return response.data
}
