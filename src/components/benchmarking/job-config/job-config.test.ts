import { describe, expect, it } from "vitest"
import {
  buildJobConfig,
  defaultDraft,
  newPopulation,
  validateDraft,
} from "@/components/benchmarking/job-config"
import type {
  EvaluationType,
  Role,
  ToolDraft,
  ToolId,
} from "@/components/benchmarking/job-config"
import { mappableColumns } from "@/components/benchmarking/job-config/requirements"
import {
  getToolDefinition,
  TOOL_DEFINITIONS,
} from "@/components/benchmarking/tools"

const NAMES: Record<Role, string[]> = {
  target: ["AFR"],
  base: ["EUR", "EAS"],
  auxiliary: ["EUR"],
  validation: ["EAS"],
}
const GWAS_N: Record<string, number> = { AFR: 20000, EUR: 80000, EAS: 50000 }

function counterIds() {
  let next = 0
  return () => `p${++next}`
}

/** A complete, valid draft for a tool: what a preset fills in. */
function filledDraft(tool: ToolId): ToolDraft {
  const definition = getToolDefinition(tool)
  const draft = defaultDraft(definition, counterIds())
  const used: Partial<Record<Role, number>> = {}
  draft.populations = draft.populations.map((population) => {
    const columns = mappableColumns(definition, population.role)
    const index = used[population.role] ?? 0
    used[population.role] = index + 1
    const name = NAMES[population.role][index]
    return {
      ...population,
      name,
      gwas_n: GWAS_N[name],
      sumstats_path: `data/sumstats/${name}`,
      genotype_path: `data/genotypes/${name}`,
      phenotype_path: `data/phenotypes/${name}.tsv`,
      snp_list_path: `data/snps/${name}.txt`,
      base_model_path: `data/models/${name}.txt`,
      column_mapping: Object.fromEntries(
        columns.map((column) => [column, column.toLowerCase()])
      ),
      traits: definition.singleTrait
        ? { binary: ["case"], quantitative: ["height"] }
        : { binary: ["case"], quantitative: ["height", "bmi"] },
    }
  })
  if (definition.params.some((spec) => spec.kind === "trait")) {
    draft.params.binary.trait = "case"
    draft.params.quantitative.trait = "height"
  }
  if (tool === "tlprs") {
    for (const kind of ["binary", "quantitative"] as const)
      Object.assign(draft.params[kind], { covar: "age", ldblocks: "AFR.hg19" })
  }
  if (tool === "sdprx") {
    draft.params.binary.rho = 0.8
    draft.params.quantitative.rho = 0.8
  }
  return draft
}

function withPopulation(draft: ToolDraft, role: Role, name: string): ToolDraft {
  const population = {
    ...newPopulation(role, () => `extra-${name}`),
    name,
    gwas_n: GWAS_N[name] ?? 1000,
  }
  population.sumstats_path = `data/sumstats/${name}`
  population.column_mapping = { ...draft.populations[0].column_mapping }
  return { ...draft, populations: [...draft.populations, population] }
}

function build(tools: ToolDraft[], evaluation_type: EvaluationType = "both") {
  return buildJobConfig({ evaluation_type, tools })
}

function validate(draft: ToolDraft, evaluationType: EvaluationType = "both") {
  return validateDraft(draft, evaluationType)
}

function messages(draft: ToolDraft): string[] {
  return validate(draft).map((issue) => issue.message)
}

/** Every key anywhere in a JSON value. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys)
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [
      key,
      ...allKeys(child),
    ])
  }
  return []
}

describe("every tool", () => {
  it.each(TOOL_DEFINITIONS.map((definition) => definition.id))(
    "%s: a filled draft is valid",
    (tool) => {
      const single = getToolDefinition(tool).singleTrait
      expect(
        validate(filledDraft(tool), single ? "quantitative" : "both")
      ).toEqual([])
    }
  )

  it.each(TOOL_DEFINITIONS.map((definition) => definition.id))(
    "%s: nothing identified by position or by name, no scoring fields, no generated paths",
    (tool) => {
      const { config } = build([filledDraft(tool)])
      const keys = allKeys(config[tool])
      const forbidden =
        /^(pop\d|ss\d|n\d|N\d|fixed_N\d?|n_gwas|population_order|populations_string|score_choice|scoring_population(_type)?|sumstats_size_.*|by_population|target_population|source_population|base_population|ldref.*|load_ld|output_dir|log_dir|pheno|sst_files|bim_prefix|.*_prefix_.*|ref_pop\d|xpass_pop\d|use_pop\d_snps|population_reference|fill_second_allele|map_to_rsid)$/
      expect(keys.filter((key) => forbidden.test(key))).toEqual([])
      expect(keys.filter((key) => ["AFR", "EUR", "EAS"].includes(key))).toEqual(
        []
      )
    }
  )

  it("a default draft lists what's missing on each page", () => {
    const issues = validate(
      defaultDraft(getToolDefinition("prscsx"), counterIds())
    )
    const byStep = (step: string) =>
      issues.filter((issue) => issue.step === step).map((issue) => issue.path)
    expect(byStep("mapping")).toEqual(
      expect.arrayContaining([
        "populations.p1.name",
        "populations.p1.genotype_path",
        "populations.p2.sumstats_path",
      ])
    )
    expect(byStep("configure")).toEqual(
      expect.arrayContaining([
        "populations.p1.gwas_n",
        "populations.p2.column_mapping.SNP",
        "params.binary.trait",
      ])
    )
  })
})

describe("the wire shape", () => {
  it("prscsx: one entry per population with its own N, mapping and traits; processing holds method params only", () => {
    const draft = withPopulation(filledDraft("prscsx"), "base", "EAS")
    draft.populations[1] = {
      ...draft.populations[1],
      genotype_path: "",
      phenotype_path: "",
    }
    draft.genotype = { file_type: "multi_chromosome", chrom: [22, 21] }
    draft.sumstats_file_type = "merged"

    const { config, issues } = build([draft])

    expect(issues).toEqual([])
    expect(config.tools_to_run).toEqual(["prscsx"])
    expect(config.prscsx).toEqual({
      pre_processing: {
        populations: [
          {
            name: "AFR",
            role: "target",
            gwas_n: 20000,
            sumstats_path: "data/sumstats/AFR",
            genotype_path: "data/genotypes/AFR",
            phenotype_path: "data/phenotypes/AFR.tsv",
            column_mapping: {
              SNP: "snp",
              A1: "a1",
              A2: "a2",
              BETA: "beta",
              P: "p",
            },
            traits: { binary: ["case"], quantitative: ["height", "bmi"] },
          },
          {
            name: "EUR",
            role: "base",
            gwas_n: 80000,
            sumstats_path: "data/sumstats/EUR",
            column_mapping: {
              SNP: "snp",
              A1: "a1",
              A2: "a2",
              BETA: "beta",
              P: "p",
            },
          },
          {
            name: "EAS",
            role: "base",
            gwas_n: 50000,
            sumstats_path: "data/sumstats/EAS",
            column_mapping: {
              SNP: "snp",
              A1: "a1",
              A2: "a2",
              BETA: "beta",
              P: "p",
            },
          },
        ],
        sumstats_file_type: "merged",
        genotype_config: { file_type: "multi_chromosome", chrom: [21, 22] },
        phenotype_config: { covariate_id_mapping: { fid: "FID", iid: "IID" } },
        options: {
          evaluation_type: "both",
          overwrite_existing: true,
        },
      },
      processing: {
        binary: { trait: "case", phi: 0.01 },
        quantitative: { trait: "height", phi: 0.01 },
      },
    })
  })

  it("prsice: covariates go on the target entry and in phenotype_config", () => {
    const draft = filledDraft("prsice")
    draft.populations[0].included_paths = ["covariate_path"]
    draft.populations[0].covariate_path = "data/covariates/AFR.tsv"
    draft.covariates.columns = ["PC1", " PC2 ", ""]

    const block = build([draft]).config.prsice!

    expect(block.pre_processing.populations[0].covariate_path).toBe(
      "data/covariates/AFR.tsv"
    )
    expect(block.pre_processing.phenotype_config).toEqual({
      covariates: ["PC1", "PC2"],
      covariate_id_mapping: { fid: "FID", iid: "IID" },
    })
  })

  it("tools without covariates send no phenotype_config", () => {
    expect(
      build([filledDraft("sdprx")]).config.sdprx!.pre_processing
        .phenotype_config
    ).toBeUndefined()
  })

  it("bridgeprs: genome-wide only, so chrom is always []", () => {
    const draft = filledDraft("bridgeprs")
    expect(
      build([draft]).config.bridgeprs!.pre_processing.genotype_config.chrom
    ).toEqual([])

    draft.genotype.chrom = [21]
    expect(messages(draft)).toContain("BridgePRS runs genome-wide only")
  })

  it("xpass+: per-population settings are keyed by role", () => {
    const processing = build([filledDraft("xpass+")], "quantitative").config[
      "xpass+"
    ]!.processing
    expect(processing).toEqual({
      quantitative: {
        compPosMean: true,
        use_snps: { target: true, auxiliary: true },
        clump_params: {
          target: { kb: 1000, r2: 0.1, p: 0.05 },
          auxiliary: { kb: 1000, r2: 0.1, p: 0.05 },
        },
      },
    })
  })

  it("xpass: follows the job's evaluation type like every tool, with no traits", () => {
    const block = build([filledDraft("xpass")]).config.xpass!

    expect(block.processing).toEqual({ binary: {}, quantitative: {} })
    expect(
      block.pre_processing.populations.every(
        (population) => population.traits === undefined
      )
    ).toBe(true)
    expect(
      block.pre_processing.populations.map((population) => population.role)
    ).toEqual(["target", "auxiliary", "validation"])
  })

  it("jointprs: a target and one base; the base sends summary statistics only; rho_cons keyed by role", () => {
    const block = build([filledDraft("jointprs")], "quantitative").config
      .jointprs!
    expect(block.pre_processing.populations).toEqual([
      expect.objectContaining({ name: "AFR", role: "target", gwas_n: 20000 }),
      {
        name: "EUR",
        role: "base",
        gwas_n: 80000,
        sumstats_path: "data/sumstats/EUR",
        column_mapping: {
          SNP: "snp",
          A1: "a1",
          A2: "a2",
          BETA: "beta",
          P: "p",
        },
      },
    ])
    expect(block.processing).toEqual({
      quantitative: {
        trait: "height",
        phi: 0.01,
        n_iter: 200,
        n_burnin: 100,
        seed: 42,
        rho_cons: { base: 1, target: 1 },
      },
    })
  })

  it("snpnet: the target alone, no summary statistics or mapping, and its split on the target", () => {
    const draft = filledDraft("snpnet")
    const block = build([draft], "binary").config.snpnet!
    expect(block.pre_processing.populations).toEqual([
      {
        name: "AFR",
        role: "target",
        gwas_n: 20000,
        genotype_path: "data/genotypes/AFR",
        phenotype_path: "data/phenotypes/AFR.tsv",
        traits: { binary: ["case"] },
        split_config: {
          split_proportions: { train: 0.7, val: 0.3 },
          seed: 42,
        },
      },
    ])
    expect(block.processing).toEqual({
      binary: { trait: "case", alpha: 1, nCores: 2, mem: 8000 },
    })

    draft.split = { ...draft.split!, method: "column", column: " fold " }
    expect(
      build([draft], "binary").config.snpnet!.pre_processing.populations[0]
        .split_config
    ).toEqual({ split_column: "fold" })
  })

  it("snpnet: the split's share, seed and column are checked", () => {
    const draft = filledDraft("snpnet")
    draft.split = { method: "proportions", train: 1, seed: 1.5, column: "" }
    expect(messages(draft)).toEqual([
      "Split: the training share must be between 0 and 1",
      "Split: the seed must be a whole number of 0 or more",
    ])
    draft.split = { ...draft.split, method: "column" }
    expect(messages(draft)).toEqual([
      "Split: choose the phenotype column that labels people train or val",
    ])
  })

  it("tlprs: the base gives its model file; columns differ by role; the chosen covariate is also listed; preprocessing options go in options", () => {
    const draft = filledDraft("tlprs")
    draft.populations[1].column_mapping = { SNP: "snp", A1: "a1", BETA: "beta" }
    draft.populations[1].gwas_n = null
    const block = build([draft], "binary").config.tlprs!
    expect(block.pre_processing.populations[1]).toEqual({
      name: "EUR",
      role: "base",
      sumstats_path: "data/sumstats/EUR",
      base_model_path: "data/models/EUR.txt",
      column_mapping: { SNP: "snp", A1: "a1", BETA: "beta" },
    })
    expect(
      Object.keys(block.pre_processing.populations[0].column_mapping!)
    ).toEqual(["SNP", "A1", "BETA", "N", "P"])
    expect(block.pre_processing.phenotype_config).toEqual({
      covariates: ["age"],
    })
    expect(block.pre_processing.options).toEqual({
      evaluation_type: "binary",
      overwrite_existing: true,
      genotype_missingness: "drop",
    })
    expect(block.processing).toEqual({
      binary: { trait: "case", covar: "age", ldblocks: "AFR.hg19" },
    })
    // TL-PRS reads only the target's size.
    expect(messages(draft)).toEqual([])
    draft.populations[0].gwas_n = null
    draft.populations[0].column_mapping.N = ""
    expect(messages(draft)).toEqual([
      "Target (AFR): map the N column or enter the GWAS sample size",
    ])
  })

  it("tlprs: the covariate and LD blocks must be chosen", () => {
    const draft = filledDraft("tlprs")
    draft.params.binary = { ...draft.params.binary, covar: "", ldblocks: "" }
    expect(messages(draft)).toEqual([
      "Binary run: choose the covariate column",
      "Binary run: LD blocks must be one of AFR.hg19, AFR.hg38, EUR.hg19, EUR.hg38, ASN.hg19, ASN.hg38",
    ])
  })

  it("xpblup: the target alone, with its genotypes, phenotypes and SNP list", () => {
    const block = build([filledDraft("xpblup")], "quantitative").config.xpblup!
    expect(block.pre_processing.populations).toEqual([
      {
        name: "AFR",
        role: "target",
        gwas_n: 20000,
        genotype_path: "data/genotypes/AFR",
        phenotype_path: "data/phenotypes/AFR.tsv",
        snp_list_path: "data/snps/AFR.txt",
        traits: { quantitative: ["height"] },
      },
    ])
    expect(block.processing).toEqual({ quantitative: { trait: "height" } })
  })

  it("xpblup fits one trait: binary or quantitative, never both, and one ticked", () => {
    const draft = filledDraft("xpblup")
    draft.populations[0].traits.quantitative = ["height", "bmi"]
    expect(messages(draft)).toContain(
      "XP-BLUP fits one trait per job: set the evaluation type to Binary or Quantitative"
    )
    expect(
      validate(draft, "quantitative").map((issue) => issue.message)
    ).toEqual(["Target (AFR): XP-BLUP fits one trait, so tick only one"])
    draft.populations[0].traits.quantitative = ["height"]
    expect(validate(draft, "quantitative")).toEqual([])
  })

  it("the job's evaluation type decides the blocks sent and is copied into every tool's options", () => {
    const { config } = build(
      [filledDraft("prsice"), filledDraft("sdprx")],
      "binary"
    )
    expect(Object.keys(config.prsice!.processing)).toEqual(["binary"])
    expect(config.sdprx!.pre_processing.options).toEqual({
      evaluation_type: "binary",
      overwrite_existing: true,
    })
  })

  it("overwrite_existing is always true, and there are no user options", () => {
    const { config } = build(
      TOOL_DEFINITIONS.map((definition) => filledDraft(definition.id))
    )
    const values = TOOL_DEFINITIONS.map(
      (definition) =>
        config[definition.id]!.pre_processing.options.overwrite_existing
    )
    expect(values).toEqual(TOOL_DEFINITIONS.map(() => true))
    expect(defaultDraft(getToolDefinition("prsice"))).not.toHaveProperty(
      "options"
    )
  })

  it("prsice: a target and a base, each with summary statistics, genotypes and phenotypes", () => {
    const populations = build([filledDraft("prsice")]).config.prsice!
      .pre_processing.populations
    expect(
      populations.map(
        ({ name, role, sumstats_path, genotype_path, phenotype_path }) => ({
          name,
          role,
          sumstats_path,
          genotype_path,
          phenotype_path,
        })
      )
    ).toEqual([
      {
        name: "AFR",
        role: "target",
        sumstats_path: "data/sumstats/AFR",
        genotype_path: "data/genotypes/AFR",
        phenotype_path: "data/phenotypes/AFR.tsv",
      },
      {
        name: "EUR",
        role: "base",
        sumstats_path: "data/sumstats/EUR",
        genotype_path: "data/genotypes/EUR",
        phenotype_path: "data/phenotypes/EUR.tsv",
      },
    ])

    const draft = filledDraft("prsice")
    draft.populations[1].phenotype_path = ""
    expect(messages(draft)).toEqual(["Base (EUR): choose its phenotypes"])
  })

  it("empty paths and mappings are left out; stray columns aren't sent", () => {
    const draft = filledDraft("sdprx")
    draft.populations[0].column_mapping = {
      ...draft.populations[0].column_mapping,
      A2: "  ",
      EXTRA: "x",
    }
    const target = build([draft]).config.sdprx!.pre_processing.populations[0]

    expect(target.column_mapping).not.toHaveProperty("A2")
    expect(target.column_mapping).not.toHaveProperty("EXTRA")
    expect(target).not.toHaveProperty("covariate_path")
  })
})

describe("validation", () => {
  it("prscsx takes any number of bases; sdprx exactly one", () => {
    expect(
      validate(withPopulation(filledDraft("prscsx"), "base", "EAS"))
    ).toEqual([])
    expect(
      messages(withPopulation(filledDraft("sdprx"), "base", "EAS"))
    ).toContain("SDPRX takes at most 1 base population")
  })

  it("a role the tool doesn't have is rejected", () => {
    expect(
      messages(withPopulation(filledDraft("sdprx"), "auxiliary", "EAS"))
    ).toContain("SDPRX has no auxiliary population")
  })

  it("population names must be distinct", () => {
    const draft = filledDraft("bridgeprs")
    draft.populations[1].name = "afr"
    expect(messages(draft)).toContain("Two populations are named afr")
  })

  it("gwas_n must be a positive whole number", () => {
    const draft = filledDraft("sdprx")
    draft.populations[0].gwas_n = 1.5
    draft.populations[1].gwas_n = null
    expect(validate(draft).map((issue) => issue.path)).toEqual([
      "populations.p1.gwas_n",
      "populations.p2.gwas_n",
    ])
  })

  it("the scored trait must be one of the target's traits of that kind", () => {
    const draft = filledDraft("prscsx")
    draft.params.binary.trait = "height"
    expect(messages(draft)).toEqual([
      "Binary run: height isn't one of Target (AFR)'s ticked binary traits",
    ])
  })

  it("parameter bounds come from the definition: clump r2 and p must be above 0", () => {
    const draft = filledDraft("xpass+")
    draft.params.quantitative.clump_params = {
      target: { kb: 1000, r2: 0, p: 0.05 },
      auxiliary: { kb: 1000, r2: 0.1, p: 1.5 },
    }
    expect(
      validate(draft, "quantitative").map((issue) => issue.message)
    ).toEqual([
      "Clump params (Target) LD r2 must be above 0",
      "Clump params (Auxiliary) P-value must be at most 1",
    ])
  })

  it("the trait to score isn't asked for until traits of its kind are ticked", () => {
    const draft = filledDraft("prsice")
    draft.populations[0].traits.binary = []
    draft.params.binary.trait = ""
    expect(messages(draft)).toEqual([
      "Target (AFR): tick at least one binary trait",
    ])
  })

  it("a number with no default must be entered", () => {
    const draft = filledDraft("sdprx")
    draft.params.binary.rho = null
    expect(messages(draft)).toEqual(["Binary run: Rho needs a number"])
  })

  it("every population with a phenotype file picks traits of each evaluated kind", () => {
    const draft = filledDraft("bridgeprs")
    draft.populations[1].traits = { binary: ["case"], quantitative: [] }
    expect(messages(draft)).toEqual([
      "Base (EUR): tick at least one quantitative trait",
    ])
    expect(validate(draft, "binary")).toEqual([])
  })

  it("optional files are sent only when included, and traits only with a phenotype file", () => {
    const draft = withPopulation(filledDraft("prscsx"), "base", "EAS")
    draft.populations[1].included_paths = ["genotype_path", "phenotype_path"]
    // Set but not included: left out.
    draft.populations[2].covariate_path = "data/covariates/EAS.tsv"
    const [, eur, eas] = build([draft]).config.prscsx!.pre_processing
      .populations

    expect(eur).toMatchObject({
      genotype_path: "data/genotypes/EUR",
      phenotype_path: "data/phenotypes/EUR.tsv",
    })
    expect(eur.traits).toBeDefined()
    expect(eas).not.toHaveProperty("covariate_path")
    expect(eas).not.toHaveProperty("genotype_path")
    expect(eas).not.toHaveProperty("traits")
  })

  it("an included optional file is required", () => {
    const draft = filledDraft("prscsx")
    draft.populations[1].included_paths = ["covariate_path"]
    expect(messages(draft)).toEqual(["Base (EUR): choose its covariates"])
  })

  it("a covariate file needs the FID and IID columns named", () => {
    const draft = filledDraft("prscsx")
    draft.populations[0].included_paths = ["covariate_path"]
    draft.populations[0].covariate_path = "data/covariates/AFR.tsv"
    draft.covariates.id_mapping = { fid: "FID", iid: "" }
    expect(messages(draft)).toEqual([
      "Covariates: name the FID and IID columns",
    ])
  })

  it("chromosomes are sorted on the way out; duplicates and non-autosomes are flagged", () => {
    const draft = filledDraft("prsice")
    draft.genotype.chrom = [22, 1]
    expect(validate(draft)).toEqual([])
    expect(
      build([draft]).config.prsice!.pre_processing.genotype_config.chrom
    ).toEqual([1, 22])

    draft.genotype.chrom = [22, 22, 23]
    expect(messages(draft)).toEqual([
      "Chromosomes must be distinct whole numbers from 1 to 22",
    ])
  })

  it("required columns are the ones each form required; optional ones may be left unmapped", () => {
    const sdprx = filledDraft("sdprx")
    delete sdprx.populations[1].column_mapping.A2
    expect(messages(sdprx)).toEqual(["Base (EUR): map the A2 column"])

    const xpass = filledDraft("xpass")
    delete xpass.populations[0].column_mapping.Z
    expect(validate(xpass)).toEqual([])
  })

  it("a tool that takes a typed N needs it from every population, and then N needn't be mapped", () => {
    const draft = filledDraft("sdprx")
    delete draft.populations[1].column_mapping.N
    expect(validate(draft)).toEqual([])

    draft.populations[1].gwas_n = null
    expect(messages(draft)).toEqual(["Base (EUR): enter the GWAS sample size"])
  })

  it("xpass needs the N column or the GWAS sample size", () => {
    const draft = filledDraft("xpass")
    draft.populations[0].gwas_n = null
    expect(validate(draft)).toEqual([])

    delete draft.populations[0].column_mapping.N
    expect(messages(draft)).toEqual([
      "Target (AFR): map the N column or enter the GWAS sample size",
    ])

    draft.populations[0].gwas_n = 20000
    expect(validate(draft)).toEqual([])
  })

  it("prsice's GWAS sample size is optional, and sent only when given", () => {
    const draft = filledDraft("prsice")
    draft.populations[1].gwas_n = null
    expect(validate(draft)).toEqual([])
    const [target, base] = build([draft]).config.prsice!.pre_processing
      .populations
    expect(target.gwas_n).toBe(20000)
    expect(base).not.toHaveProperty("gwas_n")

    draft.populations[1].gwas_n = 0
    expect(messages(draft)).toEqual([
      "Base (EUR): the GWAS sample size must be a whole number above 0",
    ])
  })

  it("parameters shared across runs are reported once, without a run prefix", () => {
    const draft = filledDraft("xpass+")
    const clump = {
      target: { kb: 0, r2: 0.1, p: 0.05 },
      auxiliary: { kb: 1000, r2: 0.1, p: 0.05 },
    }
    draft.params.binary.clump_params = clump
    draft.params.quantitative.clump_params = clump
    expect(messages(draft)).toEqual([
      "Clump params (Target) Window (kb) must be at least 1",
    ])
  })

  it("xpass and xpass+ must send identical preprocessing", () => {
    const xpass = filledDraft("xpass")
    const xpassPlus = { ...filledDraft("xpass+") }
    expect(build([xpass, xpassPlus]).issues).toEqual([])

    xpassPlus.populations = xpassPlus.populations.map((population) =>
      population.role === "auxiliary"
        ? { ...population, sumstats_path: "data/sumstats/other" }
        : population
    )
    expect(
      build([xpass, xpassPlus]).issues.map((issue) => issue.message)
    ).toEqual([
      "xpass+ and xpass are preprocessed together, so their populations and inputs must match",
    ])
  })
})

describe("shared dataset quirks", () => {
  /** A draft whose summary statistics have no second-allele column, as harvard's don't. */
  function withoutSecondAllele(tool: ToolId): ToolDraft {
    const draft = filledDraft(tool)
    const column = getToolDefinition(tool).secondAllele!
    draft.populations = draft.populations.map((population) => {
      const { [column]: _dropped, ...rest } = population.column_mapping
      return { ...population, column_mapping: rest }
    })
    return draft
  }

  function onHarvard(
    tools: ToolDraft[],
    evaluation_type: EvaluationType = "both"
  ) {
    return buildJobConfig({
      evaluation_type,
      tools,
      shared_dataset: "harvard_datasets",
    })
  }

  it("harvard: an unmapped second allele is filled from each population's genotypes, and IDs are renamed for LD-panel tools", () => {
    const draft = withoutSecondAllele("prscsx")
    draft.populations[1].included_paths = ["genotype_path"]
    const { config, issues } = onHarvard([draft])
    expect(issues).toEqual([])
    expect(
      config.prscsx!.pre_processing.populations.map((population) => [
        population.name,
        population.fill_second_allele,
        population.map_to_rsid,
      ])
    ).toEqual([
      ["AFR", true, true],
      ["EUR", true, true],
    ])
  })

  it("harvard: a population whose second allele is filled must include its genotypes", () => {
    const { issues } = onHarvard([withoutSecondAllele("jointprs")])
    expect(issues.map((issue) => [issue.step, issue.message])).toEqual([
      [
        "mapping",
        "Base (EUR): include its genotypes; this dataset's summary statistics have no A2 column, so it's read from them",
      ],
    ])
  })

  it("harvard: BridgePRS fills REF; PRSice, which takes LD from the dataset's genotypes, isn't renamed", () => {
    const { config, issues } = onHarvard([
      withoutSecondAllele("bridgeprs"),
      withoutSecondAllele("prsice"),
    ])
    expect(issues).toEqual([])
    expect(config.bridgeprs!.pre_processing.populations[0]).toMatchObject({
      fill_second_allele: true,
      map_to_rsid: true,
    })
    const prsice = config.prsice!.pre_processing.populations[0]
    expect(prsice.fill_second_allele).toBe(true)
    expect(prsice.map_to_rsid).toBeUndefined()
  })

  it("harvard: a mapped second allele is used as it is", () => {
    const population = onHarvard([filledDraft("sdprx")]).config.sdprx!
      .pre_processing.populations[0]
    expect(population.fill_second_allele).toBeUndefined()
    expect(population.map_to_rsid).toBe(true)
  })

  it("uploads and other shared datasets get none of it: the second allele must be mapped", () => {
    const draft = withoutSecondAllele("prscsx")
    for (const shared_dataset of [undefined, "some_other_dataset"]) {
      const { config, issues } = buildJobConfig({
        evaluation_type: "both",
        tools: [draft],
        shared_dataset,
      })
      expect(issues.map((issue) => issue.message)).toEqual([
        "Target (AFR): map the A2 column",
        "Base (EUR): map the A2 column",
      ])
      expect(
        allKeys(config).filter((key) =>
          ["fill_second_allele", "map_to_rsid"].includes(key)
        )
      ).toEqual([])
    }
  })
})
