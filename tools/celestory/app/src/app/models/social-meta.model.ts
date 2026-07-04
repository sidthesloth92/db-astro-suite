/** Inputs for the full Open Graph + Twitter Card meta set on a page. */
export interface SocialMeta {
  title: string;
  description: string;
  /** Absolute https URL to a 1200×630 preview image. */
  image?: string;
  /** Absolute canonical URL of the page. */
  url?: string;
  /** Open Graph object type. */
  type?: 'website' | 'profile' | 'article';
}
