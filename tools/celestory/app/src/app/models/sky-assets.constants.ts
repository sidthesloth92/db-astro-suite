/** Public URLs of the built sky assets (see `scripts/build-sky-assets.mjs`). */
export const SKY_ASSET_URLS = {
  milkyWay8k: '/sky/milkyway-8k.avif',
  milkyWay4k: '/sky/milkyway-4k.avif',
  milkyWay4kFallback: '/sky/milkyway-4k.webp',
  starsHipparcos: '/sky/stars-hip.bin',
  starsTycho: '/sky/stars-tyc.bin',
  catalog: '/sky/sky-catalog.json',
  moon: '/sky/moon-2k.webp',
} as const;

/** Decode options so textures reach the GPU untouched (no colour management, no premultiply). */
export const SKY_IMAGE_DECODE_OPTIONS: ImageBitmapOptions = {
  colorSpaceConversion: 'none',
  premultiplyAlpha: 'none',
};
