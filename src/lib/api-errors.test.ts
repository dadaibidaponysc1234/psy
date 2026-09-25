import { describe, expect, it, vi } from "vitest"
import { configRefusalMessage, userMessage } from "@/lib/api-errors"

vi.spyOn(console, "warn").mockImplementation(() => {})

/** An axios error as the backend sends it: `{error: {message, status}}`, or no response at all. */
function backendError(status: number | null, message?: string) {
  return Object.assign(new Error(`status ${status}`), {
    isAxiosError: true,
    response:
      status === null
        ? undefined
        : { status, data: message ? { error: { message, status } } : {} },
  })
}

const LABELS = { snpnet: "snpnet", jointprs: "JointPRS" }

describe("userMessage", () => {
  it("rewords backend messages written for users", () => {
    expect(
      userMessage(backendError(400, "Email already registered"), "fallback")
    ).toBe("An account with this email already exists. Sign in instead.")
    expect(
      userMessage(
        backendError(400, "Invalid file extension: x.exe. Allowed: .zip"),
        "fallback"
      )
    ).toBe(
      "One of these files isn't a supported type. Check the supported file types and try again."
    )
  })

  it("hides internal messages behind the caller's fallback or a message by status", () => {
    expect(
      userMessage(
        backendError(400, "Chunked upload not supported in split mode."),
        "Upload failed. Please try again."
      )
    ).toBe("Upload failed. Please try again.")
    expect(userMessage(backendError(null), "fallback")).toBe(
      "We couldn't reach the server. Check your connection and try again."
    )
    expect(userMessage(backendError(401, "User not found"), "fallback")).toBe(
      "Your session has expired. Please sign in again."
    )
    expect(
      userMessage(
        backendError(500, "Failed to complete multipart upload: boom"),
        "fallback"
      )
    ).toBe("Something went wrong on our side. Please try again in a moment.")
    expect(userMessage(new Error("Extraction failed: zip"), "fallback")).toBe(
      "fallback"
    )
  })
})

describe("configRefusalMessage", () => {
  it("names the tool by its label and says what to change", () => {
    expect(
      configRefusalMessage(
        backendError(
          400,
          "jointprs: population name 'EUR x' must be letters, digits, '_', '-' or '.'"
        ),
        LABELS
      )
    ).toBe(
      'JointPRS: population names can only use letters, numbers, "_", "-" and ".".'
    )
    expect(
      configRefusalMessage(
        backendError(
          400,
          "[jointprs] data/AFR.tsv names no chromosome (chr<N>, chrom<N> or chromosome<N>), but ..."
        ),
        LABELS
      )
    ).toMatch(
      /^JointPRS: the summary statistics file you picked has no chromosome/
    )
  })

  it("keeps config keys out of what the user reads", () => {
    expect(
      configRefusalMessage(
        backendError(400, "snpnet: the target needs split_config, e.g. {...}"),
        LABELS
      )
    ).toBe(
      "snpnet: the server couldn't accept these settings. Check them and try again, or contact the helpdesk if it keeps happening."
    )
  })

  it("job-state refusals and failures that aren't refusals get their own messages", () => {
    expect(
      configRefusalMessage(
        backendError(
          400,
          "Job has already completed. Create a new job to run again."
        ),
        LABELS
      )
    ).toBe("This job has finished. Start a new job to run again.")
    expect(configRefusalMessage(backendError(null), LABELS)).toBe(
      "We couldn't reach the server. Check your connection and try again."
    )
  })
})
