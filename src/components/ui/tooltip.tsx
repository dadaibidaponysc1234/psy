import * as React from "react"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState<
    "top" | "bottom" | "right" | "left"
  >("top")

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsVisible(true)

    // Check if this is a collapsed sidebar tooltip (check parent classes)
    const sidebarElement = e.currentTarget.closest("aside")
    const isCollapsedSidebar = sidebarElement?.classList.contains("w-16")

    if (isCollapsedSidebar || sidebarElement) {
      setPosition("right")
      return
    }

    setPosition("top")
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 transform rounded bg-gray-900 px-4 py-3 text-sm text-white shadow-lg ${
            position === "top"
              ? "-top-16 left-1/2 -translate-x-1/2"
              : position === "bottom"
                ? "left-1/2 top-full mt-2 -translate-x-1/2"
                : "left-full top-1/2 ml-3 -translate-y-1/2"
          } ${className ?? ""}`}
          style={{
            maxWidth: "320px",
            minWidth: "200px",
            wordWrap: "break-word",
            whiteSpace: "normal",
          }}
        >
          {content}
          <div
            className={`absolute h-0 w-0 transform border-l-4 border-r-4 border-transparent ${
              position === "top"
                ? "left-1/2 top-full border-t-4 border-t-gray-900"
                : position === "bottom"
                  ? "-top-1 left-1/2 -translate-y-1/2 border-b-4 border-b-gray-900"
                  : "left-0 top-1/2 -ml-2 -translate-y-1/2 border-r-4 border-r-gray-900"
            }`}
          ></div>
        </div>
      )}
    </div>
  )
}

export default Tooltip
