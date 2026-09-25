import axios from "axios"

/**
 * What to tell the user when a call to the backend fails. The backend wraps every error as
 * `{error: {message, status}}`; many of its messages describe internals (modes, S3, config
 * keys), so only the ones written for users are shown, reworded where needed. Everything else
 * gets a message chosen by status, and the backend's own text goes to the console.
 */

/** Backend messages a user can act on, as the user should read them. */
const KNOWN: { match: RegExp; say: string }[] = [
  // Sign in and sign up
  {
    match: /^Email already registered$/,
    say: "An account with this email already exists. Sign in instead.",
  },
  {
    match: /^Invalid email or password$/,
    say: "That email and password don't match.",
  },
  {
    match: /^Use Google login for this account$/,
    say: "This account signs in with Google.",
  },
  {
    match: /^User account is inactive$/,
    say: "This account is inactive. Contact the helpdesk to reactivate it.",
  },
  // Uploads and datasets
  {
    match: /^Invalid file extensions?:/,
    say: "One of these files isn't a supported type. Check the supported file types and try again.",
  },
  {
    match: /not in a state that accepts upload/,
    say: "This job can't take new files any more. Start a new job to upload a different dataset.",
  },
  {
    match: /^Shared dataset '.*' not found$/,
    say: "That shared dataset isn't available any more. Choose another one.",
  },
  {
    match: /must be in 'created' status to select a shared dataset/,
    say: "This job already has a dataset. Start a new job to use a different one.",
  },
  // Submitting a configuration
  {
    match: /while dataset is extracting/,
    say: "Your dataset is still being unpacked. Try again in a moment.",
  },
  {
    match: /^No files uploaded yet/,
    say: "This job has no dataset yet. Upload one before submitting.",
  },
  {
    match: /already been submitted/,
    say: "This job's configuration has already been submitted.",
  },
  { match: /^Job is already running/, say: "This job is already running." },
  {
    match: /^Job has already completed/,
    say: "This job has finished. Start a new job to run again.",
  },
]

/** Refusals of a config that name the tool they're about, e.g. "snpnet: ..." or "[jointprs] ...". */
const CONFIG: { match: RegExp; say: (tool: string) => string }[] = [
  {
    match: /population name '.*' must be letters/,
    say: (tool) =>
      `${tool}: population names can only use letters, numbers, "_", "-" and ".".`,
  },
  {
    match: /names no chromosome/,
    say: (tool) =>
      `${tool}: the summary statistics file you picked has no chromosome in its name. Pick a file named by chromosome (e.g. chr22), or set the summary statistics structure to Merged.`,
  },
  {
    match:
      /holds? (several|\d+|more than one)|more than one (set|dataset)|no pick/,
    say: (tool) =>
      `${tool}: a folder you picked holds more than one dataset. On the mapping page, pick one file of the dataset you mean.`,
  },
  {
    match: /must name the same inputs/,
    say: () => "XPASS and XPASS+ must use the same populations and files.",
  },
  {
    match: /[Dd]isk estimate|disk space/,
    say: () =>
      "This job needs more disk space than the server has. Choose fewer tools or chromosomes, or a smaller dataset.",
  },
]

function backendMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const message = error.response?.data?.error?.message
  return typeof message === "string" ? message : undefined
}

function byStatus(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  if (!error.response)
    return "We couldn't reach the server. Check your connection and try again."
  const status = error.response.status
  if (status === 401) return "Your session has expired. Please sign in again."
  if (status === 403) return "You don't have access to this."
  if (status >= 500)
    return "Something went wrong on our side. Please try again in a moment."
  return fallback
}

/** A message for a failed call: a known backend message reworded, else one chosen by status. */
export function userMessage(error: unknown, fallback: string): string {
  const message = backendMessage(error)
  if (message) console.warn("[backend]", message)
  const known = message && KNOWN.find((entry) => entry.match.test(message))
  return known ? known.say : byStatus(error, fallback)
}

/**
 * A message for a refused config, naming the tool the backend blamed by its label. `labels`
 * maps tool ids to what the page calls them.
 */
export function configRefusalMessage(
  error: unknown,
  labels: Record<string, string>
): string {
  const message = backendMessage(error)
  if (!message || !axios.isAxiosError(error) || error.response?.status !== 400)
    return userMessage(
      error,
      "Failed to submit configuration. Please try again."
    )
  console.warn("[backend]", message)
  const known = KNOWN.find((entry) => entry.match.test(message))
  if (known) return known.say
  const tool = labels[message.match(/^\[?([a-z+]+)[\]:]/)?.[1] ?? ""]
  const refusal = CONFIG.find((entry) => entry.match.test(message))
  if (refusal) return refusal.say(tool ?? "This configuration")
  const unknown =
    "the server couldn't accept these settings. Check them and try again, or contact the helpdesk if it keeps happening."
  return tool
    ? `${tool}: ${unknown}`
    : `This configuration wasn't accepted: ${unknown}`
}
