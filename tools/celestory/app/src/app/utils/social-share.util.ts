import type { SocialShareLink } from '../models/social-share.model';

/** Caption shared alongside the profile link on social platforms. */
const SHARE_CAPTION = 'My astrophotography journey, charted with Celestory ✦';

/**
 * Build the social-platform share links for a published profile URL. Each link
 * is a ready-to-open intent URL (opened in a new tab) with the profile URL and
 * caption pre-filled. Pure / presentational — no side effects.
 *
 * @param profileUrl Absolute, public URL of the profile being shared.
 */
export function socialShareLinks(profileUrl: string): SocialShareLink[] {
  const u = encodeURIComponent(profileUrl);
  const t = encodeURIComponent(SHARE_CAPTION);
  return [
    { id: 'x', name: 'X', glyph: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { id: 'facebook', name: 'Facebook', glyph: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'reddit', name: 'Reddit', glyph: 'r', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'whatsapp', name: 'WhatsApp', glyph: 'w', href: `https://wa.me/?text=${t}%20${u}` },
    { id: 'telegram', name: 'Telegram', glyph: 't', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'email', name: 'Email', glyph: '@', href: `mailto:?subject=${t}&body=${u}` },
  ];
}
