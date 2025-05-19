"use client"
import { IoSunnySharp } from "react-icons/io5"
import { FaMoon } from "react-icons/fa"
import React, { useEffect, useState } from "react"
import FirstModal from "./FirstModal"
import { CiSearch } from "react-icons/ci"
import { TbSend2 } from "react-icons/tb"
const Opolo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(true)
  const [mode, setMode] = useState<string>("light")
  const [selectedChat, setSelectedChat] = useState<number | null>(null)

  const [chatData, setChatData] = useState({
    today: [
      { id: 1, title: "Anxiety" },
      { id: 2, title: "Schizophrenia" },
    ],
    past7Days: [
      { id: 3, title: "Depression" },
      { id: 4, title: "PTSD" },
      { id: 5, title: "PTSD" },
      { id: 6, title: "PTSD" },
    ],
  })

  const handleChatClick = (id: number) => {
    setSelectedChat(id)
  }

  useEffect(() => {
    const storedMode = localStorage.getItem("mode")
    if (storedMode) setMode(storedMode)
  }, [])

  const handleToggle = () => {
    const newMode = mode === "light" ? "dark" : "light"
    setMode(newMode)
    localStorage.setItem("mode", newMode)
  }
  return (
    <div
      className={`h-full overflow-hidden font-[Arial] ${mode !== "light" ? "text-white" : ""}`}
    >
      <div className="h-full md:grid md:grid-cols-[230px_auto]">
        <div
          className={`hidden h-full overflow-hidden border border-r px-3 py-3 md:block`}
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
          <div className="mt-6 font-bold">
            <p>Chat History</p>
          </div>
          <div className="relative mt-5 w-full">
            <CiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              className={`w-full rounded-sm border-[1.5px] border-[#5C5C5C] pl-8 ${mode === "light" ? "bg-white" : "bg-[#212020]"}`}
            />
          </div>
          <div className="no-scrollbar mt-6 h-1/2 space-y-4 overflow-y-auto text-sm">
            {Object.entries(chatData).map(([section, chats]) => (
              <div className="" key={section}>
                <p className="mb-2 font-bold">
                  {section === "today"
                    ? "TODAY"
                    : section === "past7Days"
                      ? "PAST 7 DAYS"
                      : "EARLIER"}
                </p>
                <ul className="space-y-2">
                  {chats.map((chat) => (
                    <li
                      key={chat.id}
                      className="cursor-pointer rounded px-2 py-1 hover:bg-[#D5D6D5]"
                      onClick={() => handleChatClick(chat.id)}
                    >
                      {chat.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="h-full w-full overflow-y-auto">
          <div
            className="grid h-full w-full grid-rows-[1fr_100px_15px] overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage:
                mode === "light"
                  ? "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 80%, #FF8F4C 100%), url('/maplight.png')"
                  : "linear-gradient(to bottom, rgba(33,32,32,0) 0%, rgba(33,32,32,0) 80%, #FF8F4C 100%), url('/map-dark.png') ",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: mode === "dark" ? "#212020" : "",
            }}
          >
            <div className="no-scrollbar h-full overflow-y-auto">
              {selectedChat ? (
                <div></div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-2xl font-bold">
                  <p>Ask a question to get Started....</p>
                </div>
              )}
            </div>
            <div className="relative flex w-full items-center justify-center px-5 pb-12 md:px-16">
              <textarea
                rows={1}
                className="no-scrollbar w-full rounded-xl p-6 pr-12 font-[Inter] text-sm shadow-lg outline-none placeholder:text-xs placeholder:text-[#B59797] md:placeholder:text-sm"
                style={{
                  backgroundColor: mode === "dark" ? "#212020" : "",
                  borderColor: mode === "light" ? "#b59797" : "",
                  borderWidth: mode === "light" ? "1.5px" : "",
                }}
                placeholder="Ask about a gene, condition or paper..."
              />
              <div className="absolute right-10 flex items-center md:right-20">
                <TbSend2 size={24} className="cursor-pointer text-[#ED6D1C]" />
              </div>
            </div>
            <div
              className="flex flex-col items-center justify-end pb-5 text-xs md:text-sm"
              style={{ color: mode === "light" ? "#1D1D1D" : "" }}
            >
              Ọpọlọ AI isn’t flawless — double-check important info.
            </div>
          </div>
        </div>
      </div>
      <FirstModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        mode={mode}
      />
    </div>
  )
}

export default Opolo
