import {
  normalizeChromosomes,
  ruleFor,
  runKinds,
} from "@/components/benchmarking/job-config/defaults"
import {
  buildPreProcessing,
  providedPaths,
  takesCovariates,
} from "@/components/benchmarking/job-config/serialize"
import type {
  EvaluationType,
  FieldSpec,
  Issue,
  JobDraft,
  NumberField,
  ParamSpec,
  PopulationDraft,
  Step,
  ToolDefinition,
  ToolDraft,
  TraitKind,
} from "@/components/benchmarking/job-config/types"
import { getToolDefinition } from "@/components/benchmarking/tools"

const PATH_LABELS = {
  sumstats_path: "summary statistics",
  genotype_path: "genotypes",
  phenotype_path: "phenotypes",
  covariate_path: "covariates",
} as const

type Report = (step: Step, path: string, message: string) => void

function populationLabel(population: PopulationDraft): string {
  return population.name.trim() || `The ${population.role} population`
}

function checkPopulations(
  definition: ToolDefinition,
  draft: ToolDraft,
  kinds: TraitKind[],
  report: Report
) {
  for (const rule of definition.populations) {
    const count = draft.populations.filter(
      (population) => population.role === rule.role
    ).length
    const noun = rule.label.toLowerCase()
    if (count < rule.min) {
      report(
        "mapping",
        "populations",
        `Add ${rule.min === 1 ? "a" : rule.min} ${noun} population`
      )
    } else if (count > rule.max) {
      report(
        "mapping",
        "populations",
        `${definition.label} takes at most ${rule.max} ${noun} population${rule.max === 1 ? "" : "s"}`
      )
    }
  }

  const seen = new Set<string>()
  for (const population of draft.populations) {
    const at = `populations.${population.id}`
    const label = populationLabel(population)
    const rule = ruleFor(definition, population.role)
    if (!rule) {
      report(
        "mapping",
        `${at}.role`,
        `${definition.label} has no ${population.role} population`
      )
      continue
    }

    const name = population.name.trim()
    if (!name)
      report("mapping", `${at}.name`, `Name the ${population.role} population`)
    else if (seen.has(name.toLowerCase()))
      report("mapping", `${at}.name`, `Two populations are named ${name}`)
    seen.add(name.toLowerCase())

    for (const key of providedPaths(definition, population)) {
      if (!population[key].trim())
        report(
          "mapping",
          `${at}.${key}`,
          `${label}: choose its ${PATH_LABELS[key]}`
        )
    }

    const n = population.gwas_n
    if (n === null || !Number.isInteger(n) || n <= 0) {
      report(
        "configure",
        `${at}.gwas_n`,
        `${label}: enter its GWAS sample size as a whole number`
      )
    }

    for (const column of definition.columns.required) {
      if (!population.column_mapping[column]?.trim()) {
        report(
          "configure",
          `${at}.column_mapping.${column}`,
          `${label}: map the ${column} column`
        )
      }
    }

    // Every population with a phenotype file picks traits of each evaluated kind, as the old forms required.
    if (definition.hasTraits && population.phenotype_path.trim()) {
      for (const kind of kinds) {
        if (population.traits[kind].length === 0) {
          report(
            "configure",
            `${at}.traits.${kind}`,
            `${label}: choose at least one ${kind} trait`
          )
        }
      }
    }
  }
}

function checkNumber(
  field: NumberField,
  value: unknown,
  path: string,
  label: string,
  report: Report
) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return report("configure", path, `${label}: enter a number`)
  if (field.integer && !Number.isInteger(value))
    report("configure", path, `${label}: enter a whole number`)
  if (field.min !== undefined && value < field.min)
    report("configure", path, `${label}: must be at least ${field.min}`)
  if (field.above !== undefined && value <= field.above)
    report("configure", path, `${label}: must be above ${field.above}`)
  if (field.max !== undefined && value > field.max)
    report("configure", path, `${label}: must be at most ${field.max}`)
}

function checkField(
  field: FieldSpec,
  value: unknown,
  path: string,
  label: string,
  report: Report
) {
  switch (field.kind) {
    case "number":
      return checkNumber(field, value, path, label, report)
    case "boolean":
      if (typeof value !== "boolean")
        report("configure", path, `${label}: choose yes or no`)
      return
    case "select":
      if (typeof value !== "string" || !field.options.includes(value)) {
        report(
          "configure",
          path,
          `${label}: choose one of ${field.options.join(", ")}`
        )
      }
  }
}

function checkParam(
  spec: ParamSpec,
  value: unknown,
  kind: TraitKind,
  draft: ToolDraft,
  report: Report
) {
  const path = `params.${kind}.${spec.key}`

  if (spec.kind === "trait") {
    const target = draft.populations.find(
      (population) => population.role === "target"
    )
    const trait = typeof value === "string" ? value.trim() : ""
    if (!trait) report("configure", path, `Choose the ${kind} trait to score`)
    else if (target && !target.traits[kind].includes(trait)) {
      report(
        "configure",
        path,
        `${trait} is not one of ${populationLabel(target)}'s ${kind} traits`
      )
    }
    return
  }

  if (spec.kind === "per_role") {
    const byRole = (value ?? {}) as Record<string, unknown>
    for (const role of spec.roles) {
      const roleValue = byRole[role]
      if (Array.isArray(spec.of)) {
        const fields = (roleValue ?? {}) as Record<string, unknown>
        for (const field of spec.of) {
          checkField(
            field,
            fields[field.key],
            `${path}.${role}.${field.key}`,
            `${spec.label}, ${role} ${field.label} (${kind})`,
            report
          )
        }
      } else {
        checkField(
          spec.of,
          roleValue,
          `${path}.${role}`,
          `${spec.label}, ${role} (${kind})`,
          report
        )
      }
    }
    return
  }

  checkField(spec, value, path, `${spec.label} (${kind})`, report)
}

export function validateDraft(
  draft: ToolDraft,
  evaluationType: EvaluationType
): Issue[] {
  const definition = getToolDefinition(draft.tool)
  const kinds = runKinds(evaluationType)
  const issues: Issue[] = []
  const report: Report = (step, path, message) =>
    issues.push({ tool: draft.tool, step, path, message })

  checkPopulations(definition, draft, kinds, report)

  const layouts = [
    ["sumstats_file_type", draft.sumstats_file_type],
    ["genotype.file_type", draft.genotype.file_type],
  ] as const
  for (const [key, layout] of layouts) {
    if (!definition.layouts.includes(layout))
      report(
        "configure",
        key,
        `${definition.label} doesn't support ${layout} files`
      )
  }

  const chrom = draft.genotype.chrom
  if (!definition.chromosomeSelection && chrom.length > 0) {
    report(
      "configure",
      "genotype.chrom",
      `${definition.label} runs genome-wide only`
    )
  } else if (normalizeChromosomes(chrom).length !== chrom.length) {
    report(
      "configure",
      "genotype.chrom",
      "Chromosomes must be distinct whole numbers from 1 to 22"
    )
  }

  for (const kind of kinds) {
    for (const spec of definition.params)
      checkParam(spec, draft.params[kind]?.[spec.key], kind, draft, report)
  }

  if (
    takesCovariates(definition) &&
    draft.populations.some((population) => population.covariate_path.trim())
  ) {
    const { fid, iid } = draft.covariates.id_mapping
    if (!fid.trim() || !iid.trim()) {
      report(
        "configure",
        "covariates.id_mapping",
        "Name the FID and IID columns of the covariate file"
      )
    }
  }

  return issues
}

/** Every tool's issues, plus rules that span tools. */
export function validateJob(job: JobDraft): Issue[] {
  const drafts = job.tools
  const issues = drafts.flatMap((draft) =>
    validateDraft(draft, job.evaluation_type)
  )

  const seen = new Set<string>()
  for (const draft of drafts) {
    if (seen.has(draft.tool)) {
      issues.push({
        tool: draft.tool,
        step: "mapping",
        path: "tool",
        message: `${draft.tool} is selected twice`,
      })
    }
    seen.add(draft.tool)

    const partner = getToolDefinition(draft.tool).sharesPreprocessingWith
    const partnerDraft =
      partner && drafts.find((candidate) => candidate.tool === partner)
    // Report once, on the later of the pair.
    if (partnerDraft && drafts.indexOf(partnerDraft) < drafts.indexOf(draft)) {
      const build = (candidate: ToolDraft) =>
        JSON.stringify(buildPreProcessing(candidate, job.evaluation_type))
      if (build(draft) !== build(partnerDraft)) {
        issues.push({
          tool: draft.tool,
          step: "mapping",
          path: "populations",
          message: `${draft.tool} and ${partner} are preprocessed together, so their populations and inputs must match`,
        })
      }
    }
  }
  return issues
}
