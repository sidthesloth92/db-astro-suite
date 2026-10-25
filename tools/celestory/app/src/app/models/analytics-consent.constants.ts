/**
 * localStorage key holding the visitor's analytics choice ('granted' | 'denied').
 * index.html's inline Google tag script reads the same key before loading GA,
 * so keep the two in sync.
 */
export const ANALYTICS_CONSENT_KEY = 'celestory.analytics-consent';
