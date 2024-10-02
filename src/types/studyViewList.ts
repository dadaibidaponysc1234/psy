export interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Study[];
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
