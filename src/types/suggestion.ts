
export interface Suggestion {
    authors: string[]
    disorders: { id: number; disorder_name: string; }[]
    study_titles: string[]
}