export const LEGAL_OPERATOR: string
export const LEGAL_CONTACT: string
export const LEGAL_VERSION: string
export const DELETION_MAILTO: string
export type LegalDocument = { slug: string; title: string; introduction: string; sections: { id: string; title: string; paragraphs: string[] }[] }
export function getLegalDocument(slug: unknown): LegalDocument | null
export function renderLegalDocument(slug: unknown): string | null
