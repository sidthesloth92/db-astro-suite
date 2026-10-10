import { describe, expect, it } from 'vitest';
import { buildMailtoUrl } from './contact.util';

describe('buildMailtoUrl', () => {
  it('targets the recipient and URL-encodes the subject + body', () => {
    const url = buildMailtoUrl('hello@example.com', {
      name: 'Jane Stargazer',
      email: 'jane@sky.io',
      subject: 'Feedback & praise',
      message: 'Love the charts!',
    });
    expect(url.startsWith('mailto:hello@example.com?')).toBe(true);
    // Spaces are %20 (not '+') and "&" is %26 so it isn't read as a separator.
    expect(url).toContain('subject=Feedback%20%26%20praise');
    expect(url).not.toContain('+');
    // The signature line carries the sender so the recipient can reply.
    expect(decodeURIComponent(url)).toContain('Love the charts!');
    expect(decodeURIComponent(url)).toContain('Jane Stargazer <jane@sky.io>');
  });

  it('falls back to a default subject when none is given', () => {
    const url = buildMailtoUrl('hello@example.com', {
      name: '',
      email: 'jane@sky.io',
      subject: '   ',
      message: 'Hi',
    });
    expect(url).toContain('subject=Hello%20from%20Celestory');
    // With no name, the signature is just the email.
    expect(decodeURIComponent(url)).toContain('— jane@sky.io');
  });
});
