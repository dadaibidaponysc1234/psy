import { z } from "zod";

export const DocumentFilterValidator = z.object({
  searchTerm: z.string(),
  region: z.string(),
  keyword: z.string(),
  article: z.string(),
  year: z.string(),
  year_min: z.string(),
  year_max: z.string(),
  disorder: z.string(),
  impact_factor_min: z.string(),
  impact_factor_max: z.string(),
  genetic_source: z.string(),
  modalities: z.string(),
  export: z.string().optional(),
});

export type DocumentState = z.infer<typeof DocumentFilterValidator>;
