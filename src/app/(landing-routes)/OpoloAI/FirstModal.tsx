import React, { useState } from "react"
import { RxCross2 } from "react-icons/rx"

interface FirstModalProps {
  modalOpen: boolean
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  mode: string
  email: string
  setEmail: React.Dispatch<React.SetStateAction<string>>
}

const FirstModal: React.FC<FirstModalProps> = ({
  modalOpen,
  setModalOpen,
  mode,
  email,
  setEmail,
}) => {
  if (!modalOpen) return null

  // Simple email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleGetStarted = () => {
    if (isEmailValid) {
      localStorage.setItem("opolo_email", email)
      setModalOpen(false)
    }
  }

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black bg-opacity-50">
      <div
        className={`rounded-xl ${mode === "light" ? "bg-white" : "bg-[#0F0D0D]"} p-3 shadow-md md:w-1/2 md:p-6`}
      >
        <div className="flex justify-end">
          <RxCross2
            size={20}
            title="Enter your email to proceed"
            className={`cursor-not-allowed opacity-40`} // disable closing
          />
        </div>

        <div className="mt-5">
          <p
            className={`text-center text-xl font-bold ${mode === "light" ? "text-[#494845]" : "text-white"} md:text-3xl`}
          >
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
            portal. Enter your email to begin using the assistant.
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={`w-[80%] rounded border px-4 py-2 text-sm outline-none ${mode === "light" ? "border-[#ccc] bg-white text-black" : "border-[#444] bg-[#1A1919] text-white"}`}
          />
        </div>

        <div className="mb-6 mt-4 flex justify-center">
          <button
            onClick={handleGetStarted}
            disabled={!isEmailValid}
            className="rounded-full bg-[#FF7116] px-8 py-2 text-white disabled:opacity-50"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

export default FirstModal
