import { z } from "zod";

export const DocumentFilterValidator = z.object({
  title: z.string().optional(),
  journal_name: z.string().optional(),
  keyword: z.string().optional(),
  impact_factor_min: z.string().optional(),
  impact_factor_max: z.string().optional(),
  year: z.string().optional(),
  year_min: z.string().optional(),
  year_max: z.string().optional(),
  research_regions: z.string().optional(),
  disorder: z.string().optional(),
  article_type: z.string().optional(),
  biological_modalities: z.string().optional(),
  genetic_source_materials: z.string().optional(),
  page: z.string().optional(),
});

export type DocumentState = z.infer<typeof DocumentFilterValidator>;
