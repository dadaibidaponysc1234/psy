import { describe, expect, it } from "vitest"
import {
  MAX_LOG_LINES,
  mergeLogLines,
  parseSSE,
  toLogLine,
} from "@/lib/job-log-stream"

const line = (seq: number) =>
  toLogLine({ seq, level: "info", line: `line ${seq}` })
const seqs = (lines: { seq: number }[]) => lines.map((l) => l.seq)

describe("parseSSE", () => {
  it("keeps an event whole when it is split across chunks", () => {
    const events: Array<[string, string]> = []
    const onEvent = (type: string, data: string) => events.push([type, data])

    let buffer = parseSSE("id: 7\nevent: job_log\n", onEvent)
    expect(events).toEqual([])
    buffer = parseSSE(
      buffer + 'data: {"seq":7}\n\nevent: log\ndata: {"seq"',
      onEvent
    )
    expect(events).toEqual([["job_log", '{"seq":7}']])
    buffer = parseSSE(buffer + ":8}\r\n\r\n", onEvent)
    expect(events).toEqual([
      ["job_log", '{"seq":7}'],
      ["log", '{"seq":8}'],
    ])
    expect(buffer).toBe("")
  })

  it("skips keepalive comments and joins multi-line data", () => {
    const events: Array<[string, string]> = []
    parseSSE(": keepalive\n\ndata: a\ndata: b\n\n", (type, data) =>
      events.push([type, data])
    )
    expect(events).toEqual([["message", "a\nb"]])
  })
})

describe("mergeLogLines", () => {
  it("drops lines already shown when history and the live stream overlap", () => {
    const history = [line(1), line(2), line(3)]
    expect(seqs(mergeLogLines(history, [line(3), line(4)]))).toEqual([
      1, 2, 3, 4,
    ])
  })

  it("puts history read after live lines back in seq order", () => {
    expect(seqs(mergeLogLines([line(5), line(6)], [line(2), line(5)]))).toEqual(
      [2, 5, 6]
    )
  })

  it("returns the same array when nothing is new", () => {
    const shown = [line(1)]
    expect(mergeLogLines(shown, [line(1)])).toBe(shown)
  })

  it("keeps the newest lines", () => {
    const many = Array.from({ length: MAX_LOG_LINES + 5 }, (_, i) =>
      line(i + 1)
    )
    const merged = mergeLogLines([], many)
    expect(merged).toHaveLength(MAX_LOG_LINES)
    expect(merged[0].seq).toBe(6)
  })
})
