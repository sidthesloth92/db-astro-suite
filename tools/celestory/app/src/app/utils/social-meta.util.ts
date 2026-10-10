/**
 * Apply the full Open Graph + Twitter Card meta set for social-link unfurling.
 * Runs during SSR (crawlers read the rendered HTML) via Angular's Meta service.
 */
import type { Meta } from '@angular/platform-browser';
import type { SocialMeta } from '../models/social-meta.model';

/** Write og:* and twitter:* tags (plus description) for the given page. */
export function applySocialMeta(meta: Meta, social: SocialMeta): void {
  const type = social.type ?? 'website';
  meta.updateTag({ name: 'description', content: social.description });
  meta.updateTag({ property: 'og:site_name', content: 'Celestory' });
  meta.updateTag({ property: 'og:type', content: type });
  meta.updateTag({ property: 'og:title', content: social.title });
  meta.updateTag({ property: 'og:description', content: social.description });
  meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  meta.updateTag({ name: 'twitter:title', content: social.title });
  meta.updateTag({ name: 'twitter:description', content: social.description });

  if (social.url) {
    meta.updateTag({ property: 'og:url', content: social.url });
  }
  if (social.image) {
    meta.updateTag({ property: 'og:image', content: social.image });
    meta.updateTag({ property: 'og:image:width', content: '1200' });
    meta.updateTag({ property: 'og:image:height', content: '630' });
    meta.updateTag({ property: 'og:image:type', content: 'image/png' });
    meta.updateTag({ name: 'twitter:image', content: social.image });
  }
}
