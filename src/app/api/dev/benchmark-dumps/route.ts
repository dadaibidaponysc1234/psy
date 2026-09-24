import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"
import type {
  BenchmarkDump,
  StoredDump,
} from "@/components/benchmarking/dev/dumps"

/**
 * The dev drawer's dumps, stored as JSON files in the repo under dev/benchmark-dumps/<dataset>/.
 * Development only: in production every method answers 404.
 */
const ROOT = path.join(process.cwd(), "dev", "benchmark-dumps")

const slug = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled"

const fileFor = (dump: Pick<BenchmarkDump, "dataset" | "name">) =>
  `${slug(dump.dataset)}/${slug(dump.name)}.json`

/** A path inside the dumps folder, or null for anything that tries to leave it. */
function resolve(file: string): string | null {
  const full = path.resolve(ROOT, file)
  return full.startsWith(ROOT + path.sep) && full.endsWith(".json")
    ? full
    : null
}

const notFound = () =>
  NextResponse.json({ detail: "Not found" }, { status: 404 })
const devOnly = () => process.env.NODE_ENV === "production"

async function write(dump: BenchmarkDump): Promise<string> {
  const file = fileFor(dump)
  const full = resolve(file)!
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, JSON.stringify(dump, null, 2) + "\n")
  return file
}

export async function GET() {
  if (devOnly()) return notFound()
  const dumps: StoredDump[] = []
  const datasets = await fs.readdir(ROOT).catch(() => [] as string[])
  for (const dataset of datasets) {
    const names = await fs
      .readdir(path.join(ROOT, dataset))
      .catch(() => [] as string[])
    for (const name of names.filter((entry) => entry.endsWith(".json"))) {
      const file = `${dataset}/${name}`
      try {
        const dump = JSON.parse(
          await fs.readFile(path.join(ROOT, file), "utf8")
        ) as BenchmarkDump
        dumps.push({ ...dump, file })
      } catch {
        // Not a dump; skip it.
      }
    }
  }
  dumps.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  return NextResponse.json({ dumps })
}

/** Saves a dump; `overwrite` must be set to replace one with the same dataset and name. */
export async function POST(request: Request) {
  if (devOnly()) return notFound()
  const { dump, overwrite } = (await request.json()) as {
    dump: BenchmarkDump
    overwrite?: boolean
  }
  if (!dump?.name?.trim() || !dump.dataset?.trim() || !dump.job)
    return NextResponse.json(
      { detail: "A dump needs a name, a dataset and a job" },
      { status: 400 }
    )
  const existing = await fs
    .access(resolve(fileFor(dump))!)
    .then(() => true)
    .catch(() => false)
  if (existing && !overwrite)
    return NextResponse.json(
      {
        detail: `A dump named "${dump.name}" already exists for ${dump.dataset}`,
      },
      { status: 409 }
    )
  return NextResponse.json({ file: await write(dump) })
}

/** Renames a dump or moves it to another dataset. */
export async function PATCH(request: Request) {
  if (devOnly()) return notFound()
  const { file, name, dataset } = (await request.json()) as {
    file: string
    name?: string
    dataset?: string
  }
  const full = resolve(file ?? "")
  if (!full) return NextResponse.json({ detail: "Bad file" }, { status: 400 })
  const dump = JSON.parse(await fs.readFile(full, "utf8")) as BenchmarkDump
  const next = {
    ...dump,
    name: name?.trim() || dump.name,
    dataset: dataset?.trim() || dump.dataset,
  }
  const target = fileFor(next)
  if (target !== file) {
    const taken = await fs
      .access(resolve(target)!)
      .then(() => true)
      .catch(() => false)
    if (taken)
      return NextResponse.json(
        {
          detail: `A dump named "${next.name}" already exists for ${next.dataset}`,
        },
        { status: 409 }
      )
  }
  const written = await write(next)
  if (written !== file) await fs.unlink(full)
  return NextResponse.json({ file: written })
}

export async function DELETE(request: Request) {
  if (devOnly()) return notFound()
  const file = new URL(request.url).searchParams.get("file") ?? ""
  const full = resolve(file)
  if (!full) return NextResponse.json({ detail: "Bad file" }, { status: 400 })
  await fs.unlink(full).catch(() => {})
  return NextResponse.json({ file })
}
