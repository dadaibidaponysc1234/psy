/** The shapes the PRS-CSx panel and dialogs take; `prscsx-populations.tsx` adapts drafts to them. */
export interface PrscsxTargetPopulation {
  id: string
  name: string
  sumstatsPath: string
  genotypePath: string
  phenotypePath: string
  covariatePath?: string
  includeCovariate: boolean
}

export interface PrscsxBasePopulation {
  id: string
  name: string
  sumstatsPath: string
  genotypePath?: string
  phenotypePath?: string
  covariatePath?: string
  includeGenotype: boolean
  includePhenotype: boolean
  includeCovariate: boolean
}

export interface PrscsxPopulationState {
  target: PrscsxTargetPopulation
  bases: PrscsxBasePopulation[]
}
