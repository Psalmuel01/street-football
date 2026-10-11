export type VoiceClip = {
  url: string; hash: string; source?: 'recorded' | 'synthetic';
  review?: { status: string; hash: string; locale: string; date: string; reviewers: string[] };
};
/** Approval follows the exact recorded file; regenerating a clip invalidates its review. */
export function approvedVoices(clips: Record<string, VoiceClip> = {}): Record<string, VoiceClip> {
  return Object.fromEntries(Object.entries(clips).filter(([, clip]) => {
    const review = clip.review;
    return clip.source === 'recorded' && typeof clip.url === 'string' && clip.url.startsWith('/assets/audio/voices/') &&
      typeof clip.hash === 'string' && /^[a-f0-9]{64}$/.test(clip.hash) &&
      review?.status === 'approved' && review.hash === clip.hash && review.locale === 'ng' &&
      /^\d{4}-\d{2}-\d{2}$/.test(review.date) && Array.isArray(review.reviewers) &&
      new Set(review.reviewers.filter(r => typeof r === 'string' && r.trim())).size >= 2;
  }));
}
