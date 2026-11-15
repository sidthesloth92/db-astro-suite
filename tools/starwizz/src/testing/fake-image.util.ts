/**
 * Stands in for `new Image()` in specs: each image records the source it was given, never
 * touches the network, and loads or fails only when the spec says so.
 */
export class FakeImages {
  /** Every image the app created through `imageConstructor`, oldest first. */
  readonly created: HTMLImageElement[] = [];

  private readonly sources = new WeakMap<HTMLImageElement, string>();
  private readonly loaded = new WeakSet<HTMLImageElement>();

  /**
   * A stand-in for the Image constructor, for `spyOn(window, 'Image').and.callFake(...)`.
   * It is a plain function because the app calls it with `new`, and a constructor that returns
   * an object makes `new` yield that object.
   */
  imageConstructor(): () => HTMLImageElement {
    const create = (): HTMLImageElement => this.create();
    return function fakeImage(): HTMLImageElement {
      return create();
    };
  }

  /** The image whose source ends with the given file name. */
  withSource(fileName: string): HTMLImageElement {
    const image = this.created.find((candidate) => this.sourceOf(candidate).endsWith(fileName));
    if (!image) {
      throw new Error(`No image was requested for ${fileName}`);
    }
    return image;
  }

  /** The source the app gave an image. */
  sourceOf(image: HTMLImageElement): string {
    return this.sources.get(image) ?? '';
  }

  /** Finishes loading the image, as the browser would. */
  load(image: HTMLImageElement): void {
    this.loaded.add(image);
    image.dispatchEvent(new Event('load'));
  }

  /** Fails the image, as a missing file would. */
  fail(image: HTMLImageElement): void {
    image.dispatchEvent(new Event('error'));
  }

  private create(): HTMLImageElement {
    const image = document.createElement('img');
    const loaded = this.loaded;
    const sources = this.sources;
    Object.defineProperty(image, 'src', {
      get: () => sources.get(image) ?? '',
      set: (value: string) => sources.set(image, value),
    });
    Object.defineProperty(image, 'complete', { get: () => loaded.has(image) });
    Object.defineProperty(image, 'naturalWidth', { get: () => (loaded.has(image) ? 1080 : 0) });
    this.created.push(image);
    return image;
  }
}
