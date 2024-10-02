export interface Details {
    DOI: string;
    abstract: string;
    adequate_statistical_powered: string;
    age_range: string;
    article_type: { id: number; article_name: string }[];
    authors_affiliations: {
      affiliations: { [key: number]: string };
      authors: {
        name: string;
        affiliation_numbers: string[];
      }[];
    };
    automatic_tags: string;
    biological_modalities: {
      id: number;
      modality_name: string;
    }[];
    biological_rationale_provided: string;
    biological_risk_factor_studied: string;
    citation: number;
    comment: string;
    countries: { id: number; name: string }[];
    criteria_for_significance: string;
    date: string;
    diagnostic_criteria_used: string;
    disorder: { id: number; disorder_name: string }[];
    evaluation_method: string;
    findings_conclusions: string;
    funding_source: string;
    generalisability_of_conclusion: string;
    genetic_source_materials: { id: number; material_type: string }[];
    id: number;
    impact_factor: number;
    issue: number;
    journal_name: string;
    keyword: string;
    lead_author: string;
    male_female_split: string;
    mean_age: string;
    pages: string;
    phenotype: string;
    pmid: string;
    recommended_articles: Details[];
    sample_size: string;
    should_exclude: boolean;
    statistical_model: string;
    status_of_corresponding_gene: string;
    study_designs: number;
    technology_platform: string;
    title: string;
    validation_performed: string;
    volume: string;
    year: number;
  }
  