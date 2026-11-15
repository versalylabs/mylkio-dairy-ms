// Veterinary content must be signed off by a veterinarian before farmers see it
// (docs/vet-and-illness-feature.md). Every entry carries a review status. A draft is shown only where
// NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT=true (local work and Vercel previews), always with a visible
// "draft" banner. To approve an entry, the reviewing vet's name and the date are written next to it in
// the content file and the change goes through a pull request like any other.

export type ReviewStatus = 'draft' | 'approved';

export interface Review {
  status: ReviewStatus;
  reviewedBy?: string;
  /** YYYY-MM-DD */
  reviewedOn?: string;
}

export const DRAFT: Review = { status: 'draft' };

/** True where unreviewed content may be shown (previews and local development, never live farms). */
export const draftContentAllowed = () => process.env.NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT === 'true';

/** Only approved entries, plus drafts where drafts are allowed. */
export function visibleEntries<T extends { review: Review }>(entries: readonly T[], includeDrafts: boolean = draftContentAllowed()): T[] {
  return entries.filter((entry) => entry.review.status === 'approved' || includeDrafts);
}

/** An approved entry must say who approved it and when; a draft must not claim a reviewer. */
export function reviewProblem(review: Review): string | null {
  if (review.status === 'approved') {
    if (!review.reviewedBy?.trim()) return 'approved without a reviewer';
    if (!review.reviewedOn || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn)) return 'approved without a review date (YYYY-MM-DD)';
    return null;
  }
  if (review.reviewedBy || review.reviewedOn) return 'a draft must not carry reviewer details';
  return null;
}
