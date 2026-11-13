/** Raised when the 3D scene cannot be drawn: no WebGL2, or a shader failed to build. */
export class ParallaxRendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParallaxRendererError';
  }
}
