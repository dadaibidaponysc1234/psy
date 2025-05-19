"use client"
import { IoSunnySharp } from "react-icons/io5"
import { FaMoon } from "react-icons/fa"
import React, { useEffect, useState } from "react"
import FirstModal from "./FirstModal"
import { CiSearch } from "react-icons/ci"
const Opolo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState<boolean>(true)
  const [mode, setMode] = useState<string>("light")

  const [chatData, setChatData] = useState({
    today: [
      { id: 1, title: "How to learn Python?" },
      { id: 2, title: "AI for real estate" },
    ],
    past7Days: [
      { id: 3, title: "Build a portfolio site" },
      { id: 4, title: "Dark mode toggle logic" },
      { id: 4, title: "Dark mode toggle logic" },
      { id: 4, title: "Dark mode toggle logic" },
      { id: 4, title: "Dark mode toggle logic" },
    ],
    earlier: [{ id: 5, title: "React performance tips" }],
  })

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
              className={`w-full rounded-sm border-[1.2px] border-[#5C5C5C] ${mode === "light" ? "bg-white" : "bg-[#212020]"}`}
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
                      // onClick={() => handleChatClick(chat.id)}
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
              <p>stuff</p>
            </div>
            <div className="flex w-full items-center justify-center px-5 pb-12 md:px-16">
              <input
                type="text"
                className="w-full rounded-lg p-6 font-[Inter] text-sm shadow-lg outline-none placeholder:text-xs placeholder:text-[#B59797] md:placeholder:text-sm"
                style={{
                  backgroundColor: mode === "dark" ? "#212020" : "",
                  borderColor: mode === "light" ? "#b59797" : "",
                  borderWidth: mode === "light" ? "1.5px" : "",
                }}
                placeholder="Ask about a gene, condition or paper..."
              />
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
