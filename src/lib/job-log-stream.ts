import type { LogLine } from "@/types/benchmarking"

/** The most lines a log view keeps; older ones drop off the top. */
export const MAX_LOG_LINES = 1500

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "")

/** A log event as the backend sends it, from history (REST) or the live stream. */
export function toLogLine(event: any): LogLine {
  return {
    seq: event.seq,
    level: event.level || "info",
    line: stripAnsi(event.line || ""),
    timestamp: event.timestamp || null,
    source: event.source,
  }
}

/**
 * Adds lines to a log view. History and the live stream overlap, so a line whose seq is already
 * shown is dropped; the view stays in seq order and keeps the newest MAX_LOG_LINES.
 */
export function mergeLogLines(
  existing: LogLine[],
  incoming: LogLine[]
): LogLine[] {
  const shown = new Set(existing.map((line) => line.seq))
  const fresh = incoming.filter((line) => !shown.has(line.seq))
  if (fresh.length === 0) return existing
  const combined = existing.concat(fresh)
  const last = existing.length ? existing[existing.length - 1].seq : 0
  if (fresh.some((line) => line.seq < last))
    combined.sort((a, b) => a.seq - b.seq)
  return combined.length > MAX_LOG_LINES
    ? combined.slice(-MAX_LOG_LINES)
    : combined
}

/**
 * Reads the complete events out of an SSE buffer and returns the unfinished rest, to be
 * prefixed to the next chunk. An event ends at a blank line, so one split across chunks
 * keeps its `event:` and `data:` lines together.
 */
export function parseSSE(
  buffer: string,
  onEvent: (eventType: string, data: string) => void
): string {
  const blocks = buffer.split(/\r?\n\r?\n/)
  const remaining = blocks.pop() ?? ""
  for (const block of blocks) {
    let eventType = "message"
    const data: string[] = []
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(":")) continue
      const colon = line.indexOf(":")
      const field = colon < 0 ? line : line.slice(0, colon)
      const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "")
      if (field === "event") eventType = value
      else if (field === "data") data.push(value)
    }
    if (data.length) onEvent(eventType, data.join("\n"))
  }
  return remaining
}
