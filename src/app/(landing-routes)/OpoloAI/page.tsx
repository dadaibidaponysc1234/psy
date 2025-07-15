"use client"
import { IoSunnySharp } from "react-icons/io5"
import { FaMoon, FaPlus, FaTrash, FaTrashAlt } from "react-icons/fa"
import React, { useEffect, useRef, useState } from "react"
import FirstModal from "./FirstModal"
import { CiSearch } from "react-icons/ci"
import { TbSend2 } from "react-icons/tb"
import chatData from "./chatdata"
import { IoShareSocialOutline } from "react-icons/io5"
import { FiCopy } from "react-icons/fi"
import { FaRegThumbsUp } from "react-icons/fa"
import { FaRegThumbsDown } from "react-icons/fa"
import toast from "react-hot-toast"
import { IoCloudDownloadOutline } from "react-icons/io5"
import "katex/dist/katex.min.css"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"

import ReactMarkdown from "react-markdown"
import {
  chatWithMemory,
  deleteChatMessage,
  deleteChatSession,
  getChatSessions,
} from "@/services/opolo"
import TypewriterMarkdown from "./Typewrite"
import Image from "next/image"

const Opolo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(true)
  const [chatHover, setChatHover] = useState<boolean>(false)
  const [mode, setMode] = useState<string>("light")
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  const [chatTab, setChatTab] = useState<{ [key: number]: string }>({})
  const [userInput, setUserInput] = useState<string>("")
  const [isSending, setIsSending] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>("")
  const [chatInfo, setChatInfo] = useState<ChatData>({})
  const [streamedText, setStreamedText] = useState<string>("")
  const endRef = useRef<HTMLDivElement | null>(null)
  const [atBottom, setAtBottom] = useState<boolean>(true)
  const [typingIndex, setTypingIndex] = useState<number | null>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Add typing indicator component
  const TypingIndicator = () => (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
      </div>
      <span className="text-lg text-gray-500">
        <span className="text-sm">AI is thinking</span>...
      </span>
    </div>
  )

  useEffect(() => {
    if (streamedText && endRef.current && !userScrolledUp) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [streamedText, userScrolledUp])

  useEffect(() => {
    if (endRef.current && atBottom) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatInfo])

  interface Message {
    response: string
    answer: {
      text: string
      images: {
        image_url: string
        caption: string
      }[]
      sources: {
        title: string
        lead_author: string
        journal: string
        year: string
        pdf_url: string
        doi: string
      }[]
    }
    suggested_questions?: string[]
    tempId?: number // Add this line
  }

  interface Chat {
    id: number
    title: string
    messages: Message[]
  }

  interface ChatData {
    [key: string]: Chat[]
  }

  //Get selected chat
  const getSelectedChat = (): Chat | null => {
    for (const chats of Object.values(chatInfo)) {
      for (const chat of chats) {
        if (chat.id === selectedChat) {
          return chat
        }
      }
    }
    return null
  }

  const currentChat = getSelectedChat()
  const lastMessageIndex = currentChat?.messages.length
    ? currentChat.messages.length - 1
    : -1

  const handleChatClick = (id: number) => {
    setSelectedChat(id)
  }
  const handleTabClick = (messageId: number, tab: string) => {
    setChatTab((prev) => ({ ...prev, [messageId]: tab }))
  }
  useEffect(() => {
    const storedMode = localStorage.getItem("mode")
    if (storedMode) setMode(storedMode)

    const fetchChats = async () => {
      try {
        const email = userEmail || localStorage.getItem("opolo_email") || ""
        const sessions = await getChatSessions(email)

        const groupChatsByTime = (sessions: any[]): ChatData => {
          const now = new Date()
          const grouped: ChatData = {}

          sessions.forEach((session) => {
            const createdAt = new Date(session.created_at)
            const diffTime = now.getTime() - createdAt.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 3600 * 24))

            let section = ""
            if (diffDays === 0) {
              section = "Today"
            } else if (diffDays < 7) {
              section = "Past 7 Days"
            } else {
              section = "Earlier"
            }

            const chat: Chat = {
              id: session.id,
              title: session.title,
              messages: session.messages.map((msg: any) => ({
                id: msg.id,
                response: msg.question,
                answer: {
                  text: msg.answer,
                  images: msg.image_results,
                  sources: msg.source_studies,
                },
              })),
            }

            if (!grouped[section]) {
              grouped[section] = []
            }
            grouped[section].push(chat)
          })

          return grouped
        }
        const grouped = groupChatsByTime(sessions)
        setChatInfo(grouped)
      } catch (err) {
        console.error("Error loading chat sessions", err)
      }
    }

    fetchChats()
  }, [userEmail])

  useEffect(() => {
    const storedMode = localStorage.getItem("mode")
    if (storedMode) setMode(storedMode)
  }, [])

  const simulateTyping = (text: string, callback: (value: string) => void) => {
    let index = 0
    const interval = setInterval(() => {
      callback(text.slice(0, index + 1))
      index++
      if (index === text.length) clearInterval(interval)
    }, 25) // Adjust speed here
  }

  const handleSend = async (inputOverride?: string) => {
    if (isSending) return

    const trimmedInput = inputOverride || userInput.trim()
    if (!trimmedInput) return

    setIsSending(true)
    setUserInput("")
    setStreamedText("")

    // Create temporary message ID or use timestamp
    const tempId = Date.now()

    try {
      // ---- STEP 1: Immediately add user's message to chat ----
      setChatInfo((prev) => {
        const updated: ChatData = { ...prev }
        let chatExists = false

        // If we have a selected chat, add message to it
        if (selectedChat) {
          for (const section in updated) {
            updated[section] = updated[section].map((chat) => {
              if (chat.id === selectedChat) {
                chatExists = true
                return {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    {
                      response: trimmedInput,
                      answer: {
                        text: "", // Empty answer for now
                        images: [],
                        sources: [],
                      },
                      tempId, // Mark as temporary
                    },
                  ],
                }
              }
              return chat
            })
          }
        }

        // If no selected chat or chat not found, create new chat
        if (!selectedChat || !chatExists) {
          if (!updated["Today"]) {
            updated["Today"] = []
          }
          updated["Today"].unshift({
            id: tempId, // Temporary ID until we get real one from API
            title:
              trimmedInput.slice(0, 30) +
              (trimmedInput.length > 30 ? "..." : ""),
            messages: [
              {
                response: trimmedInput,
                answer: {
                  text: "", // Empty answer for now
                  images: [],
                  sources: [],
                },
                tempId, // Mark as temporary
              },
            ],
          })
          setSelectedChat(tempId) // Set temporary selected chat
        }

        return updated
      })

      const email = userEmail || localStorage.getItem("opolo_email") || ""
      const res = await chatWithMemory({
        email,
        question: trimmedInput,
        session_id: selectedChat ?? undefined,
      })

      // ---- STEP 2: Update with actual response ----
      setChatInfo((prev) => {
        const updated: ChatData = { ...prev }
        let newIndex: number | null = null

        for (const section in updated) {
          updated[section] = updated[section].map((chat) => {
            // Match either by temporary ID or real session ID
            if (chat.id === tempId || chat.id === res.session_id) {
              // Find the temporary message and replace it
              const messages = chat.messages.map((msg) => {
                if ((msg as any).tempId === tempId) {
                  return {
                    response: trimmedInput,
                    answer: {
                      text: res.answer,
                      images: res.images,
                      sources: res.sources,
                    },
                    suggested_questions: res.suggested_questions || [],
                  }
                }
                return msg
              })

              newIndex = messages.length - 1
              return {
                ...chat,
                id: res.session_id, // Ensure we use the real session ID
                title: res.title || chat.title,
                messages,
              }
            }
            return chat
          })
        }

        setTimeout(() => setTypingIndex(newIndex), 0)
        return updated
      })

      setSelectedChat(res.session_id) // Ensure we're using the real session ID

      // ---- STEP 3: Animate the answer ----
      simulateTyping(res.answer, (value) => {
        setStreamedText(value)
        if (value === res.answer) {
          setTypingIndex(null)
        }
      })
    } catch (err) {
      console.error("Error sending message:", err)
      toast.error("Failed to send message")

      // On error, remove the temporary message
      setChatInfo((prev) => {
        const updated: ChatData = { ...prev }
        for (const section in updated) {
          updated[section] = updated[section]
            .map((chat) => {
              if (chat.id === tempId || chat.id === selectedChat) {
                return {
                  ...chat,
                  messages: chat.messages.filter(
                    (msg) => (msg as any).tempId !== tempId
                  ),
                }
              }
              return chat
            })
            .filter((chat) => chat.messages.length > 0) // Remove empty chats
        }
        return updated
      })

      setUserInput(trimmedInput)
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteSession = async (chatId: number) => {
    try {
      const email = userEmail || localStorage.getItem("opolo_email") || ""
      console.log("Trying to delete chat session:", chatId, "Email:", email)

      const res = await deleteChatSession(chatId, email)
      console.log("Delete API response:", res)

      setChatInfo((prev) => {
        const updated: ChatData = {}
        for (const section in prev) {
          updated[section] = prev[section].filter((chat) => chat.id !== chatId)
        }
        return updated
      })

      if (selectedChat === chatId) setSelectedChat(null)
      toast.success("Chat deleted successfully.")
    } catch (error) {
      toast.error("Failed to delete chat")
      console.error("Delete session error:", error)
    }
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem("opolo_email")
    if (savedEmail) {
      setUserEmail(savedEmail)
      setModalOpen(false)
    }
  }, [])

  const handleToggle = () => {
    const newMode = mode === "light" ? "dark" : "light"
    setMode(newMode)
    localStorage.setItem("mode", newMode)
    window.location.reload()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard!"))
      .catch(() => toast.error("Failed to copy"))
  }

  const handleShare = (content: string) => {
    const isURL = content.startsWith("http") || content.includes("://")

    const shareText = isURL
      ? `📄 Here's a PDF you might find useful:\n${content}\n\n— Shared from ỌpọlọAI`
      : `✨ "${content}" ✨\n\n— from ỌpọlọAI\n\n📢 *Check out more great content at ỌpọlọAI!*`

    if (navigator.share) {
      navigator
        .share({
          title: "Check this out",
          text: shareText,
          url: isURL ? content : undefined,
        })
        .then(() => toast.success("Shared successfully!"))
        .catch((err) => {
          toast.error("Share failed.")
          console.error(err)
        })
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success("Copied to clipboard (share not supported)")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isSending) {
        handleSend()
      }
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight

      // If user scrolls up more than 100px from bottom, mark as manual scroll
      setUserScrolledUp(scrollTop + clientHeight < scrollHeight - 100)

      // For atBottom detection (keep your existing logic)
      setAtBottom(scrollTop + clientHeight >= scrollHeight - 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className={`h-full overflow-hidden font-[Arial] text-xs md:text-base ${mode !== "light" ? "text-white" : ""}`}
    >
      <div className="h-full md:grid md:grid-cols-[250px_auto]">
        <div
          className={`hidden h-full overflow-hidden border-r px-3 py-3 md:block`}
          style={{
            backgroundImage:
              mode === "light"
                ? "linear-gradient(to bottom, white 0%, white 80%, #FF8F4C 100%)"
                : "linear-gradient(to bottom, #212020 0%, #212020 80%, #FF8F4C 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className={`text-lg font-bold`}>
              <span className="text-[#2C2554]">Ọ</span>
              <span className="text-[#65A0A8]">p</span>
              <span className="text-[#C23D18]">ọ</span>
              <span className="text-[#ECB03B]">l</span>
              <span className="text-[#6D792B]">ọ</span>
              <span className="text-[#ED6D1C]">A</span>
              <span className="text-[#2C2554]">I</span>
            </p>
            {mode === "light" ? (
              <div
                onClick={handleToggle}
                className={`flex h-[20px] w-[60px] cursor-pointer items-center justify-between rounded-full border border-[#C4BABA] bg-white pr-1 transition-colors duration-300`}
              >
                <div
                  className={`flex h-[20px] w-[30px] transform items-center justify-center rounded-full bg-[#DFC6B7]`}
                >
                  <IoSunnySharp size={16} className="text-orange-500" />
                </div>
                <FaMoon size={16} className="text-black" />
              </div>
            ) : (
              <div
                onClick={handleToggle}
                className={`flex h-[20px] w-[60px] cursor-pointer items-center justify-between rounded-full border bg-[#212020] pr-1 transition-colors duration-300`}
              >
                <div
                  className={`flex h-[20px] w-[30px] transform items-center justify-center rounded-full bg-[#DFC6B7] transition-all duration-300`}
                >
                  <IoSunnySharp size={16} className="text-orange-500" />
                </div>
                <FaMoon size={16} className="text-black" />
              </div>
            )}{" "}
          </div>
          <div className="mt-6 flex items-center justify-between font-bold">
            <p>Chat History</p>
            <div
              onClick={() => setSelectedChat(null)}
              className="flex cursor-pointer items-center justify-center rounded-full hover:h-6 hover:w-6 hover:bg-[#Ed6D1C]/50 hover:text-white"
            >
              <FaPlus />
            </div>
          </div>
          <div className="relative mt-5 w-full">
            <CiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              className={`w-full rounded-sm border-[1.5px] border-[#5C5C5C] pl-8 ${mode === "light" ? "bg-white" : "bg-[#212020]"}`}
            />
          </div>
          <div className="no-scrollbar mt-6 h-1/2 space-y-4 overflow-y-auto text-sm">
            {Object.entries(chatInfo).map(([section, chats]) => (
              <div className="" key={section}>
                <p className="mb-2 font-bold">
                  {section === "Today"
                    ? "TODAY"
                    : section === "Past 7 Days"
                      ? "PAST 7 DAYS"
                      : "EARLIER"}
                </p>
                <ul className="space-y-2">
                  {chats.map((chat) => (
                    <li
                      key={chat.id}
                      className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-[#D5D6D5]"
                      onClick={() => handleChatClick(chat.id)}
                    >
                      {chat.title}
                      <span
                        title="Delete Session"
                        className="hover:text-[#EE7527]"
                        onClick={() => handleDeleteSession(chat.id)}
                      >
                        <FaTrashAlt />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="h-full w-full overflow-y-auto overflow-x-hidden">
          <div
            className="grid h-full w-full grid-rows-[1fr_100px_15px] overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage:
                mode === "light"
                  ? "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 80%, #FF8F4C 100%)"
                  : "linear-gradient(to bottom, rgba(33,32,32,0) 0%, rgba(33,32,32,0) 80%, #FF8F4C 100%), url('/map-dark.png') ",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: mode === "dark" ? "#212020" : "",
            }}
          >
            <div className="no-scrollbar h-full overflow-y-auto">
              {selectedChat ? (
                <div className="w-full p-5 pt-10" key={selectedChat}>
                  {getSelectedChat()?.messages?.map((message, index) => {
                    const currentTab = chatTab[index] || "Answer"

                    return (
                      <div className="mb-2" key={index}>
                        <div className="flex justify-end">
                          <div className="mb-10 rounded-t-xl rounded-bl-xl bg-[#EE7527] p-2">
                            <p>{message.response}</p>
                          </div>
                        </div>
                        <div className="relative mb-5 flex w-full justify-between border-b border-[#8E8E8E] font-bold md:w-[75%]">
                          {["Answer", "Image", "Sources"].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => handleTabClick(index, tab)}
                              className={`relative flex w-full items-center justify-center rounded-t-lg ${currentTab === tab ? "bg-[#EE7527]/10" : ""}`}
                            >
                              <p
                                className={`${currentTab === tab ? "text-[#EE7527]" : ""}`}
                              >
                                {tab}
                              </p>
                              {currentTab === tab && (
                                <div className="absolute bottom-[-1px] left-0 h-[1.5px] w-full bg-[#EE7527] transition-all duration-300" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="h-full w-full overflow-hidden md:pr-12">
                          {currentTab === "Answer" && (
                            <div>
                              {index === typingIndex ? (
                                <>
                                  {!streamedText && <TypingIndicator />}
                                  <TypewriterMarkdown
                                    text={message.answer.text}
                                  />
                                </>
                              ) : (
                                <article className="markdown">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                  >
                                    {message.answer.text}
                                  </ReactMarkdown>
                                </article>
                              )}
                              <div className="mt-5 flex flex-wrap gap-5 md:flex-nowrap">
                                <button
                                  className={`flex items-center gap-2 rounded-xl border border-[#8E8E8E] p-1 px-3 text-sm hover:backdrop-opacity-20 lg:text-base ${mode === "dark" ? "hover:bg-[#8E8E8E]" : "hover:bg-[#8E8E8E]"}`}
                                  onClick={() =>
                                    handleShare(message.answer.text)
                                  }
                                >
                                  <span>
                                    <IoShareSocialOutline />
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    copyToClipboard(message.answer.text)
                                  }
                                  className={`flex items-center gap-2 rounded-xl border border-[#8E8E8E] p-1 px-3 text-sm hover:backdrop-opacity-20 lg:text-base ${mode === "dark" ? "hover:bg-[#8E8E8E]" : "hover:bg-[#8E8E8E]/40"}`}
                                >
                                  <span>
                                    <FiCopy />
                                  </span>
                                </button>
                                <button
                                  className={`flex items-center gap-2 rounded-xl border border-[#8E8E8E] p-1 px-3 text-sm hover:backdrop-opacity-20 lg:text-base ${mode === "dark" ? "hover:bg-[#8E8E8E]" : "hover:bg-[#8E8E8E]/40"}`}
                                >
                                  <span>
                                    <FaRegThumbsUp />
                                  </span>
                                </button>
                                <button
                                  className={`flex items-center gap-2 rounded-xl border border-[#8E8E8E] p-1 px-3 text-sm hover:backdrop-opacity-20 lg:text-base ${mode === "dark" ? "hover:bg-[#8E8E8E]" : "hover:bg-[#8E8E8E]/40"}`}
                                >
                                  <span>
                                    <FaRegThumbsDown />
                                  </span>
                                </button>
                              </div>
                              {message.suggested_questions &&
                                message.suggested_questions.length > 0 && (
                                  <div className="mb-5 mt-5 space-y-2">
                                    {/* <p className="text-sm font-semibold text-[#EE7527]">
                                      Suggested Questions:
                                    </p> */}
                                    <div className="flex flex-wrap justify-end gap-2">
                                      {message.suggested_questions.map(
                                        (suggestion, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() =>
                                              handleSend(suggestion)
                                            }
                                            className="rounded-lg border border-[#ED6D1C] px-3 py-2 text-sm text-[#ED6D1C] transition hover:bg-[#ED6D1C] hover:text-white"
                                          >
                                            {suggestion}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          <div ref={endRef} />
                          {currentTab === "Image" && (
                            <div className="grid-col-1 grid gap-2 lg:grid-cols-3">
                              {message.answer.images.length === 0 ? (
                                <div className="flex w-full items-center justify-center">
                                  No Images Available
                                </div>
                              ) : (
                                message.answer.images.map((image, index) => (
                                  <Image
                                    key={index}
                                    src={image.image_url}
                                    alt={image.caption}
                                    width={300}
                                    height={200}
                                    className="object-contain"
                                  />
                                ))
                              )}
                            </div>
                          )}
                          {currentTab === "Sources" && (
                            <div>
                              {message.answer.sources.length === 0 ? (
                                <div className="flex w-full items-center justify-center">
                                  No Sources Available
                                </div>
                              ) : (
                                message.answer.sources.map((source, index) => {
                                  return (
                                    <div
                                      key={index}
                                      className="mb-2 flex w-full items-center gap-5 rounded-lg border border-[#8E8E8E] p-2 px-5 text-xs lg:flex-row lg:text-sm"
                                    >
                                      <div>
                                        <Image
                                          src="/pdflogo.png"
                                          alt="PDF icon"
                                          width={40}
                                          height={40}
                                        />
                                      </div>
                                      <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col gap-1 text-left">
                                          <p className="font-semibold">
                                            {source.title}
                                          </p>
                                          <p>
                                            <span className="font-medium text-[#EE7527]">
                                              {source.lead_author}
                                            </span>
                                            , {source.journal} ({source.year})
                                          </p>
                                          <a
                                            href={
                                              source.pdf_url ||
                                              `https://doi.org/${source.doi}`
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {source.doi}
                                          </a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div
                                            onClick={() =>
                                              window.open(source.pdf_url)
                                            }
                                            className="cursor-pointer rounded-lg border border-[#8E8E8E] p-1 hover:bg-[#EE7527]/20"
                                          >
                                            <IoCloudDownloadOutline />
                                          </div>
                                          <div
                                            onClick={() =>
                                              handleShare(source.pdf_url)
                                            }
                                            className="cursor-pointer rounded-lg border border-[#8E8E8E] p-1 hover:bg-[#EE7527]/20"
                                          >
                                            <IoShareSocialOutline />
                                          </div>
                                        </div>{" "}
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {atBottom && (
                    <button
                      onClick={() =>
                        endRef.current?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="fixed bottom-36 right-6 z-50 rounded-full bg-orange-500 px-4 py-2 text-white shadow-lg transition-all hover:bg-orange-600"
                      title="Scroll to latest message"
                    >
                      ↧
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {!isSending && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-2xl font-bold">
                      <p>Ask a question to get Started....</p>
                    </div>
                  )}
                  {isSending && (
                    <div className="animate-pulse rounded-md p-4">
                      <p className="font-medium">🤖 AI is typing...</p>
                      <p className="mt-1 whitespace-pre-line">
                        {streamedText}
                        <span className="animate-blink">|</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="relative flex w-full items-center justify-center px-5 pb-12 md:px-16">
              {isSending && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 transform">
                  <TypingIndicator />
                </div>
              )}
              <textarea
                rows={1}
                value={userInput}
                onKeyDown={handleKeyDown}
                onChange={(e) => setUserInput(e.target.value)}
                className="no-scrollbar w-full rounded-xl p-6 pr-12 font-[Inter] text-sm shadow-lg outline-none placeholder:text-xs placeholder:text-[#B59797] md:placeholder:text-sm"
                style={{
                  backgroundColor: mode === "dark" ? "#212020" : "",
                  borderColor: mode === "light" ? "#b59797" : "",
                  borderWidth: mode === "light" ? "1.5px" : "",
                }}
                placeholder="Ask about a gene, condition or paper..."
              />

              <div className="absolute right-10 flex items-center md:right-20">
                <TbSend2
                  size={24}
                  className="cursor-pointer text-[#ED6D1C]"
                  onClick={() => {
                    if (!isSending) handleSend()
                  }}
                />
              </div>
            </div>
            <div
              className="flex flex-col items-center justify-end pb-5 text-xs md:text-sm"
              style={{ color: mode === "light" ? "#1D1D1D" : "" }}
            >
              {"Ọpọlọ AI isn't flawless — double-check important info."}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes blink {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0;
            }
          }
          .animate-blink {
            animation: blink 1s step-end infinite;
          }
          @keyframes bounce {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-5px);
            }
          }
          .animate-bounce {
            animation: bounce 0.6s infinite;
          }
        `}</style>
      </div>

      <FirstModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        mode={mode}
        email={userEmail}
        setEmail={setUserEmail}
      />
    </div>
  )
}

export default Opolo
