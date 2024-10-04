import { z } from "zod";

export const DocumentFilterValidator = z.object({
  searchTerm: z.string(),
  region: z.string(),
  keywords: z.string(),
  article: z.string(),
  year: z.string(),
  year_min: z.string(),
  year_max: z.string(),
  disorder: z.string(),
  country: z.string(),
  impact_factor: z.string(),
  genetic_source: z.string(),
  modalities: z.string(),
});

export type DocumentState = z.infer<typeof DocumentFilterValidator>;
