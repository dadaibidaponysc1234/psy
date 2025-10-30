import * as React from "react"
import { createPortal } from "react-dom"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  // Optional delay in milliseconds before showing the tooltip
  delayMs?: number
  // Optional className for the wrapper container to better control layout
  containerClassName?: string
  // Optional preferred placement; "auto" will choose based on viewport
  placement?: "auto" | "top" | "bottom" | "right" | "left"
  // Gap between the anchor and tooltip
  offset?: number
}

export function Tooltip({
  content,
  children,
  className,
  delayMs = 800,
  containerClassName,
  placement = "auto",
  offset = 8,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState<"top" | "bottom" | "right" | "left">("top")
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null)
  const anchorRef = React.useRef<HTMLDivElement | null>(null)

  // timers to support delayed show/hide
  const showTimerRef = React.useRef<number | null>(null)
  const hideTimerRef = React.useRef<number | null>(null)

  const clearTimers = () => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const updateAnchorRect = () => {
    if (anchorRef.current) {
      setAnchorRect(anchorRef.current.getBoundingClientRect())
    }
  }

  const choosePlacement = (rect: DOMRect, defaultPos: "top" | "bottom") => {
    // Collapsed sidebar tooltips prefer right
    const sidebarElement = anchorRef.current?.closest("aside")
    const isCollapsedSidebar = sidebarElement?.classList.contains("w-16")
    if (isCollapsedSidebar || sidebarElement) return "right"

    if (placement !== "auto") return placement as any

    const nearTop = rect.top <= 100
    const nearBottom = window.innerHeight - rect.bottom <= 100
    const inScrollContainer = !!anchorRef.current?.closest(".overflow-y-auto")

    if (nearBottom) return "top"
    if (nearTop || inScrollContainer) return "bottom"
    return defaultPos
  }

  const handleMouseEnter = () => {
    clearTimers()
    // Delay showing the tooltip and compute initial rect/placement
    showTimerRef.current = window.setTimeout(() => {
      updateAnchorRect()
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition(choosePlacement(rect, "top"))
      }
      setIsVisible(true)
    }, Math.max(0, delayMs))
  }

  const handleMouseLeave = () => {
    // Cancel any pending show and hide immediately
    clearTimers()
    setIsVisible(false)
  }

  // Reposition on scroll/resize while visible to avoid jank
  React.useEffect(() => {
    if (!isVisible) return

    const handle = () => {
      updateAnchorRect()
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition(choosePlacement(rect, position))
      }
    }

    window.addEventListener("scroll", handle, true)
    window.addEventListener("resize", handle)
    return () => {
      window.removeEventListener("scroll", handle, true)
      window.removeEventListener("resize", handle)
    }
  }, [isVisible, position])

  const renderTooltip = () => {
    if (!isVisible || !anchorRect) return null

    // Compute viewport-aware coordinates
    const centerX = anchorRect.left + anchorRect.width / 2
    const clampedX = Math.min(Math.max(centerX, 16), window.innerWidth - 16)

    let top = anchorRect.top
    let left = clampedX
    let transform = "translateX(-50%)"

    if (position === "top") {
      top = anchorRect.top
      transform = `translateX(-50%) translateY(calc(-100% - ${offset}px))`
    } else if (position === "bottom") {
      top = anchorRect.bottom
      transform = `translateX(-50%) translateY(${offset}px)`
    } else if (position === "right") {
      left = anchorRect.right + offset
      top = anchorRect.top + anchorRect.height / 2
      transform = "translateY(-50%)"
    } else if (position === "left") {
      left = anchorRect.left - offset
      top = anchorRect.top + anchorRect.height / 2
      transform = "translateY(-50%)"
    }

    const panel = (
      <div
        className={`z-[9999] rounded bg-gray-900 px-4 py-3 text-sm text-white shadow-lg ${className ?? ""}`}
        style={{
          position: "fixed",
          top,
          left,
          transform,
          maxWidth: 320,
          minWidth: 200,
          wordWrap: "break-word",
          whiteSpace: "normal",
          pointerEvents: "none", // don't steal hover, prevents flicker/jank
        }}
      >
        {content}
        {/* Arrow */}
        <div
          className={`absolute h-0 w-0 transform border-l-4 border-r-4 border-transparent ${
            position === "top"
              ? "left-1/2 top-full -translate-x-1/2 border-t-4 border-t-gray-900"
              : position === "bottom"
              ? "left-1/2 -top-1 -translate-x-1/2 border-b-4 border-b-gray-900"
              : position === "right"
              ? "left-0 top-1/2 -ml-2 -translate-y-1/2 border-r-4 border-r-gray-900"
              : "-right-2 top-1/2 -translate-y-1/2 border-l-4 border-l-gray-900"
          }`}
        />
      </div>
    )

    return createPortal(panel, document.body)
  }

  return (
    <div
      ref={anchorRef}
      className={`relative inline-block ${containerClassName ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip()}
    </div>
  )
}

export default Tooltip
