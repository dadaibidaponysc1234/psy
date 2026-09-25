import type {
  ToolDefinition,
  ToolId,
} from "@/components/benchmarking/job-config/types"
import { bridgeprs } from "@/components/benchmarking/tools/bridgeprs/definition"
import { jointprs } from "@/components/benchmarking/tools/jointprs/definition"
import { prscsx } from "@/components/benchmarking/tools/prscsx/definition"
import { prsice } from "@/components/benchmarking/tools/prsice/definition"
import { sdprx } from "@/components/benchmarking/tools/sdprx/definition"
import { snpnet } from "@/components/benchmarking/tools/snpnet/definition"
import { tlprs } from "@/components/benchmarking/tools/tlprs/definition"
import { xpass } from "@/components/benchmarking/tools/xpass/definition"
import { xpassPlus } from "@/components/benchmarking/tools/xpass-plus/definition"
import { xpblup } from "@/components/benchmarking/tools/xpblup/definition"

/** Every tool the form knows, in display order. Adding a tool = adding its definition here. */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  prsice,
  prscsx,
  bridgeprs,
  sdprx,
  xpass,
  xpassPlus,
  jointprs,
  snpnet,
  tlprs,
  xpblup,
]

const BY_ID = new Map(
  TOOL_DEFINITIONS.map((definition) => [definition.id, definition])
)

export function getToolDefinition(id: ToolId): ToolDefinition {
  const definition = BY_ID.get(id)
  if (!definition) throw new Error(`Unknown tool: ${id}`)
  return definition
}
