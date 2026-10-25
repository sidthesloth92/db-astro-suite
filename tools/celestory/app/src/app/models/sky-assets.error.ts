/** Base class for planetarium asset failures (surfaced to the user by the component). */
export class SkyAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkyAssetError';
  }
}

/** A sky asset could not be fetched (network / HTTP failure). */
export class SkyAssetLoadError extends SkyAssetError {
  constructor(
    /** The asset URL that failed. */
    readonly url: string,
    message: string,
  ) {
    super(`${url}: ${message}`);
    this.name = 'SkyAssetLoadError';
  }
}

/** A packed star catalogue file is malformed. */
export class StarCatalogFormatError extends SkyAssetError {
  constructor(message: string) {
    super(`star catalogue: ${message}`);
    this.name = 'StarCatalogFormatError';
  }
}

/** WebGL2 (or a required extension) is unavailable on this device. */
export class SkyRendererUnavailableError extends SkyAssetError {
  constructor(message: string) {
    super(message);
    this.name = 'SkyRendererUnavailableError';
  }
}
