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
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1))
      index++
      if (index >= text.length) {
        clearInterval(interval)
        setIsDone(true)
        if (onDone) onDone()
      }
    }, 15) // typing speed

    return () => clearInterval(interval)
  }, [text, onDone])

  return (
    <article className="markdown">
      {isDone ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {text}
        </ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap font-sans">
          {displayedText}
          <span className="animate-blink">|</span>
        </pre>
      )}
    </article>
  )
}

export default TypewriterMarkdown
