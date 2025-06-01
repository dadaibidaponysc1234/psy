import React, { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

interface Props {
  text: string
  onDone?: () => void
}

const TypewriterMarkdown: React.FC<Props> = ({ text, onDone }) => {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index))
      index++
      if (index >= text.length) {
        clearInterval(interval)
        if (onDone) onDone?.()
      }
    }, 20) // Speed: 20ms per character

    return () => clearInterval(interval)
  }, [text, onDone])

  return (
    <article className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {displayedText}
      </ReactMarkdown>
    </article>
  )
}

export default TypewriterMarkdown
