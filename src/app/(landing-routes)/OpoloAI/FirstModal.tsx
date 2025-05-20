import React from "react"
import { RxCross2 } from "react-icons/rx"

interface FirstModalProps {
  modalOpen: boolean
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  mode: string
}

const FirstModal: React.FC<FirstModalProps> = ({
  modalOpen,
  setModalOpen,
  mode,
}) => {
  if (!modalOpen) return null

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black bg-opacity-50">
      <div
        className={`rounded-xl ${mode === "light" ? "bg-white" : "bg-[#0F0D0D]"} p-3 shadow-md md:w-1/2 md:p-6`}
      >
        <div className="flex justify-end">
          <RxCross2
            size={20}
            className={`cursor-pointer hover:text-red-500 ${mode === "light" ? "text-[#333333]" : "text-white"}`}
            onClick={() => setModalOpen(false)}
          />
        </div>
        <div className="mt-5">
          <p
            className={`text-center text-xl font-bold ${mode === "light" ? "text-[#494845]" : "text-white"} md:text-3xl`}
          >
            {" "}
            Welcome to <span className="text-[#2C2554]">Ọ</span>
            <span className="text-[#65A0A8]">p</span>
            <span className="text-[#C23D18]">ọ</span>
            <span className="text-[#ECB03B]">l</span>
            <span className="text-[#6D792B]">ọ</span>
            <span className="text-[#ED6D1C]">A</span>
            <span className="text-[#2C2554]">I</span>
          </p>
        </div>
        <div
          className={`mt-5 text-center text-[0.675rem] sm:p-3 md:mt-0 md:p-6 md:text-sm ${mode === "light" ? "text-[#333333]" : "text-white"}`}
        >
          <p>
            ỌpọlọAI is an intelligent assistant built into the PsychGenAfrica
            portal, designed to make African psychiatric genomics research more
            accessible, actionable, and engaging. With Ọpọlọ AI, you can ask
            questions in plain language, get simplified explanations of complex
            scientific finding, explore key themes across psychiatric
            conditions, generate downloadable reports from analysis results
          </p>
        </div>
        <div className="mb-6 mt-4 flex justify-center">
          <button
            onClick={() => setModalOpen(false)}
            className="rounded-full bg-[#FF7116] p-1 px-8 text-white lg:px-5"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

export default FirstModal
