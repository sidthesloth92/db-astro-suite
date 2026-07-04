/** The visitor-entered fields composed into the contact mailto. */
export interface ContactMessage {
  /** Sender's name (optional). */
  name: string;
  /** Sender's email — echoed into the body so replies are easy. */
  email: string;
  /** Subject line (optional; a default is supplied when blank). */
  subject: string;
  /** Message body. */
  message: string;
}

/**
 * Build a `mailto:` URL from a contact message. The subject falls back to a
 * sensible default and the sender's name/email are appended to the body so the
 * recipient can reply directly. All parts are URL-encoded.
 */
export function buildMailtoUrl(recipient: string, msg: ContactMessage): string {
  const subject = msg.subject.trim() || 'Hello from Celestory';
  const fromLine = msg.name.trim() ? `${msg.name.trim()} <${msg.email.trim()}>` : msg.email.trim();
  const body = `${msg.message.trim()}\n\n— ${fromLine}`;
  // encodeURIComponent (not URLSearchParams) so spaces become %20, not '+':
  // mailto (RFC 6068) does not treat '+' as a space, and strict clients render
  // it literally in the subject/body.
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
