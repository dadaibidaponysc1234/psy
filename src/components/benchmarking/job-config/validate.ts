import {
  normalizeChromosomes,
  ruleFor,
  runKinds,
} from "@/components/benchmarking/job-config/defaults"
import {
  quirksFor,
  type DatasetQuirks,
} from "@/components/benchmarking/job-config/datasets"
import {
  columnsFor,
  describePopulation,
  fillsSecondAllele,
  gwasNFor,
  isColumnRequired,
  N_COLUMN,
} from "@/components/benchmarking/job-config/requirements"
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
  SplitDraft,
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
  snp_list_path: "SNP list",
  base_model_path: "base model",
} as const

type Report = (step: Step, path: string, message: string) => void

/** "Binary run: ", or nothing when the tool's parameters are the same for every run. */
function runPrefix(definition: ToolDefinition, kind: TraitKind): string {
  if (definition.paramsSharedAcrossRuns) return ""
  return `${kind === "binary" ? "Binary" : "Quantitative"} run: `
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

function checkPopulations(
  definition: ToolDefinition,
  draft: ToolDraft,
  kinds: TraitKind[],
  quirks: DatasetQuirks | undefined,
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
    const label = describePopulation(definition, population)
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

    const paths = providedPaths(definition, population)
    for (const key of paths) {
      if (!population[key].trim())
        report(
          "mapping",
          `${at}.${key}`,
          `${label}: choose its ${PATH_LABELS[key]}`
        )
    }
    // The backend reads the missing allele from this population's own genotypes.
    if (
      fillsSecondAllele(definition, population, quirks) &&
      !paths.includes("genotype_path")
    )
      report(
        "mapping",
        `${at}.genotype_path`,
        `${label}: include its genotypes; this dataset's summary statistics have no ${definition.secondAllele} column, so it's read from them`
      )

    const gwasN = gwasNFor(definition, population.role)
    const n = population.gwas_n
    const nMapped = Boolean(population.column_mapping[N_COLUMN]?.trim())
    if (n !== null) {
      if (!Number.isInteger(n) || n <= 0)
        report(
          "configure",
          `${at}.gwas_n`,
          `${label}: the GWAS sample size must be a whole number above 0`
        )
    } else if (gwasN === "required") {
      report(
        "configure",
        `${at}.gwas_n`,
        `${label}: enter the GWAS sample size`
      )
    } else if (gwasN === "unless_n_column" && !nMapped) {
      report(
        "configure",
        `${at}.gwas_n`,
        `${label}: map the N column or enter the GWAS sample size`
      )
    }

    for (const column of columnsFor(definition, population.role).required) {
      if (!isColumnRequired(definition, population, column, quirks)) continue
      // Reported above, with the GWAS sample size that can stand in for it.
      if (column === N_COLUMN && gwasN === "unless_n_column") continue
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
        if (definition.singleTrait && population.traits[kind].length > 1) {
          report(
            "configure",
            `${at}.traits.${kind}`,
            `${label}: ${definition.label} fits one trait, so tick only one`
          )
        } else if (population.traits[kind].length === 0) {
          report(
            "configure",
            `${at}.traits.${kind}`,
            `${label}: tick at least one ${kind} trait`
          )
        }
      }
    }
  }
}

/** Reports "<prefix><subject> <problem>", e.g. "Binary run: Phi must be above 0". */
type Say = (path: string, problem: string) => void

function checkNumber(
  field: NumberField,
  value: unknown,
  path: string,
  say: Say
) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return say(path, "needs a number")
  if (field.integer && !Number.isInteger(value))
    say(path, "must be a whole number")
  if (field.min !== undefined && value < field.min)
    say(path, `must be at least ${field.min}`)
  if (field.above !== undefined && value <= field.above)
    say(path, `must be above ${field.above}`)
  if (field.max !== undefined && value > field.max)
    say(path, `must be at most ${field.max}`)
}

function checkField(field: FieldSpec, value: unknown, path: string, say: Say) {
  switch (field.kind) {
    case "number":
      return checkNumber(field, value, path, say)
    case "boolean":
      if (typeof value !== "boolean") say(path, "needs a yes or no")
      return
    case "select":
      if (typeof value !== "string" || !field.options.includes(value))
        say(path, `must be one of ${field.options.join(", ")}`)
  }
}

function checkParam(
  definition: ToolDefinition,
  spec: ParamSpec,
  value: unknown,
  kind: TraitKind,
  draft: ToolDraft,
  report: Report
) {
  const path = `params.${kind}.${spec.key}`
  const prefix = runPrefix(definition, kind)
  const sayAbout =
    (subject: string): Say =>
    (at, problem) =>
      report("configure", at, capitalize(`${prefix}${subject} ${problem}`))

  if (spec.kind === "trait") {
    const target = draft.populations.find(
      (population) => population.role === "target"
    )
    const trait = typeof value === "string" ? value.trim() : ""
    // With no traits of this kind ticked, "tick at least one" already says what to do.
    const nothingTicked =
      target?.phenotype_path.trim() && target.traits[kind].length === 0
    if (!trait && nothingTicked) return
    if (!trait)
      report(
        "configure",
        path,
        capitalize(`${prefix}choose the trait to score`)
      )
    else if (target && !target.traits[kind].includes(trait)) {
      report(
        "configure",
        path,
        capitalize(
          `${prefix}${trait} isn't one of ${describePopulation(definition, target)}'s ticked ${kind} traits`
        )
      )
    }
    return
  }

  if (spec.kind === "covariate") {
    if (typeof value !== "string" || !value.trim())
      report(
        "configure",
        path,
        capitalize(`${prefix}choose the ${spec.label.toLowerCase()} column`)
      )
    return
  }

  if (spec.kind === "per_role") {
    const byRole = (value ?? {}) as Record<string, unknown>
    for (const role of spec.roles) {
      const roleValue = byRole[role]
      const roleLabel = ruleFor(definition, role)?.label ?? role
      if (Array.isArray(spec.of)) {
        const fields = (roleValue ?? {}) as Record<string, unknown>
        for (const field of spec.of) {
          checkField(
            field,
            fields[field.key],
            `${path}.${role}.${field.key}`,
            sayAbout(`${spec.label} (${roleLabel}) ${field.label}`)
          )
        }
      } else {
        checkField(
          spec.of,
          roleValue,
          `${path}.${role}`,
          sayAbout(`${spec.label} (${roleLabel})`)
        )
      }
    }
    return
  }

  checkField(spec, value, path, sayAbout(spec.label))
}

function checkSplit(split: SplitDraft | undefined, report: Report) {
  if (!split) {
    report("configure", "split.method", "Split: choose how to split the target")
    return
  }
  if (split.method === "column") {
    if (!split.column.trim())
      report(
        "configure",
        "split.column",
        "Split: choose the phenotype column that labels people train or val"
      )
    return
  }
  const { train, seed } = split
  if (train === null || !Number.isFinite(train))
    report("configure", "split.train", "Split: enter the training share")
  else if (train <= 0 || train >= 1)
    report(
      "configure",
      "split.train",
      "Split: the training share must be between 0 and 1"
    )
  if (seed === null || !Number.isInteger(seed) || seed < 0)
    report(
      "configure",
      "split.seed",
      "Split: the seed must be a whole number of 0 or more"
    )
}

export function validateDraft(
  draft: ToolDraft,
  evaluationType: EvaluationType,
  quirks?: DatasetQuirks
): Issue[] {
  const definition = getToolDefinition(draft.tool)
  const kinds = runKinds(evaluationType)
  const issues: Issue[] = []
  const report: Report = (step, path, message) =>
    issues.push({ tool: draft.tool, step, path, message })

  checkPopulations(definition, draft, kinds, quirks, report)

  const layouts = [
    ["sumstats_file_type", draft.sumstats_file_type],
    ["genotype.file_type", draft.genotype.file_type],
  ] as const
  for (const [key, layout] of layouts) {
    // The layouts are chosen on the mapping page.
    if (!definition.layouts.includes(layout))
      report(
        "mapping",
        key,
        `${definition.label} doesn't support ${layout} files`
      )
  }

  if (definition.singleTrait && evaluationType === "both")
    report(
      "configure",
      "evaluation_type",
      `${definition.label} fits one trait per job: set the evaluation type to Binary or Quantitative`
    )

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
      checkParam(
        definition,
        spec,
        draft.params[kind]?.[spec.key],
        kind,
        draft,
        report
      )
  }

  if (definition.trainValidationSplit) checkSplit(draft.split, report)

  for (const field of definition.preprocessingOptions ?? []) {
    checkField(
      field,
      draft.preprocessing?.[field.key],
      `preprocessing.${field.key}`,
      (at, problem) => report("configure", at, `${field.label} ${problem}`)
    )
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
        "Covariates: name the FID and IID columns"
      )
    }
  }

  // Shared parameters are checked per run kind but read the same everywhere.
  return issues.filter(
    (issue, index) =>
      issues.findIndex((other) => other.message === issue.message) === index
  )
}

/** Every tool's issues, plus rules that span tools. */
export function validateJob(job: JobDraft): Issue[] {
  const drafts = job.tools
  const quirks = quirksFor(job)
  const issues = drafts.flatMap((draft) =>
    validateDraft(draft, job.evaluation_type, quirks)
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
        JSON.stringify(
          buildPreProcessing(candidate, job.evaluation_type, quirks)
        )
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
