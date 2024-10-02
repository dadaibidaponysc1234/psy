import { z } from 'zod'

export const DocumentFilterValidator = z.object({
    searchTerm: z.string(),
    region: z.string(),
    disorder: z.string(),
    article: z.string(),
    year: z.string(),
})

export type DocumentState = z.infer<typeof DocumentFilterValidator>