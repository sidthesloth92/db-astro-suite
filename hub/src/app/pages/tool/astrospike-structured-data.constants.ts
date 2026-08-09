/**
 * Page-level structured data for the AstroSpike tool page. The suite-wide
 * JSON-LD in the hub's index.html only lists AstroSpike as a `hasPart`; this
 * block gives the tool page its own SoftwareApplication entity plus the
 * breadcrumb trail, which is what rich results and LLM crawlers read when
 * they land on /tool/astrospike directly.
 */
export const ASTROSPIKE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'AstroSpike',
      url: 'https://dbastrosuite.com/astrospike/',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires a modern web browser with JavaScript enabled',
      description:
        'AstroSpike adds Newtonian and JWST-style diffraction spikes to astrophotography images entirely in the browser. Stars are detected automatically, spike length and colour follow each star’s measured brightness, every star can be tuned individually, and nothing is ever uploaded.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Automatic star detection with hot-pixel, satellite-trail, and galaxy rejection',
        'Subtle, Classic (4-spike), JWST (6-spike), and Diffusion (spike-free bloom) presets',
        'Spike length and colour driven by each star’s measured brightness',
        'Chromatic arm gradients and per-star tuning',
        'Manual star placement and drag-to-move for missed detections',
        'PNG/JPEG export at the original resolution, plus a spikes-only transparent layer',
        '100% client-side processing — images never leave the browser',
      ],
      screenshot: 'https://dbastrosuite.com/astrospike/assets/img/astrospike-og.jpg',
      isPartOf: { '@type': 'WebSite', name: 'DB Astro Suite', url: 'https://dbastrosuite.com/' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'DB Astro Suite', item: 'https://dbastrosuite.com/' },
        { '@type': 'ListItem', position: 2, name: 'AstroSpike', item: 'https://dbastrosuite.com/tool/astrospike' },
      ],
    },
  ],
};
