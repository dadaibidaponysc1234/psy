export interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Study[];
  yearly_study_counts: {
    year: number;
    study_count: number;
    average_impact_factor: number;
    total_citations: number;
  }[];
  genetic_source_material_study_counts: {
    genetic_source_materials__material_type: string;
    study_count: number;
  }[];
  disorder_study_counts: {
    disorder__disorder_name: string;
    study_count: number;
  }[];
  biological_modality_study_counts: {
    biological_modalities__modality_name: string;
    study_count: number;
  }[];
  african_study_counts: {
    countries__name: string;
    study_count: number;
  }[];
  collaboration_data: {
    countries: string[];
    matrix: number[][];
  };
}

export interface Study {
  id: number;
  disorder: Disorder[];
  research_regions: string[];
  biological_modalities: string[];
  genetic_source_materials: string[];
  article_type: ArticleType[];
  title: string;
  year: number;
  journal_name: string;
  impact_factor: number;
  pmid: string;
  funding_source: string;
  lead_author: string;
  phenotype: string;
  diagnostic_criteria_used: string;
  sample_size: string;
  age_range: string;
  mean_age: string;
  recommended_articles: Study[];
  male_female_split: string;
  biological_risk_factor_studied: string;
  biological_rationale_provided: string;
  status_of_corresponding_gene: string;
  technology_platform: string;
  evaluation_method: string;
  statistical_model: string;
  criteria_for_significance: string;
  validation_performed: string;
  findings_conclusions: string;
  generalisability_of_conclusion: string;
  adequate_statistical_powered: string;
  comment: string;
  should_exclude: boolean;
  study_designs: number;
  author_regions: number[];
}

interface Disorder {
  id: number;
  disorder_name: string;
}

// interface ResearchRegion {
//     id: number;
//     name: string;
// }

interface BiologicalModality {
  id: number;
  modality_name: string;
}

interface GeneticSourceMaterial {
  id: number;
  material_type: string;
}

interface ArticleType {
  id: number;
  article_name: string;
}
