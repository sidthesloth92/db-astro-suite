import { Scene3dSettings } from '../models/scene3d-settings.model';
import { Video2dSettings } from '../models/video-settings.model';
import { videoSettings2d, videoSettings3d } from './video-settings.util';

/** The 2D settings the app opens with. */
const OPENING_2D: Video2dSettings = {
  direction: 'forward',
  rotation: 3,
  hasStars: true,
  hasShootingStars: true,
};

/** A 3D Travel shot; specs override what they need. */
const TRAVEL: Scene3dSettings = {
  style: 'travel',
  direction: 'left',
  aim: { x: 0, y: 0 },
  starStyle: 'original',
  zoomIn: true,
  starsReturn: true,
  speed: 5,
  rotation: 0,
  cloudDepth: 5,
  starAmount: 100,
  starSize: 1,
  starDepth: 5,
  spikes: 0,
  twinkle: 0,
};

describe('videoSettings2d', () => {
  it('should describe the clip the app makes when nothing is changed', () => {
    expect(videoSettings2d(OPENING_2D)).toEqual({
      mode: '2d',
      direction: 'forward',
      rotation: 'clockwise',
      stars: 'on',
      shooting_stars: 'on',
    });
  });

  it('should report which way the view turns, or that it does not', () => {
    expect(videoSettings2d({ ...OPENING_2D, rotation: -8 })['rotation']).toBe('anticlockwise');
    expect(videoSettings2d({ ...OPENING_2D, rotation: 0 })['rotation']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, direction: 'backward' })['rotation']).toBe('clockwise');
  });

  it('should report no rotation for directions that never turn the view', () => {
    expect(videoSettings2d({ ...OPENING_2D, direction: 'left' })['rotation']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, direction: 'path' })['rotation']).toBe('off');
  });

  it('should report no shooting stars when the Stars switch removed them', () => {
    const settings = videoSettings2d({ ...OPENING_2D, hasStars: false });

    expect(settings['stars']).toBe('off');
    expect(settings['shooting_stars']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, hasShootingStars: false })['shooting_stars']).toBe('off');
  });
});

describe('videoSettings3d', () => {
  it('should describe a Travel shot with its direction and nothing Arrive-only', () => {
    expect(videoSettings3d(TRAVEL)).toEqual({
      mode: '3d',
      style: 'travel',
      direction: 'left',
      rotation: 'off',
      sharp_stars: 'off',
    });
  });

  it('should describe an Arrive shot with its switches and no direction', () => {
    const settings = videoSettings3d({ ...TRAVEL, style: 'arrive', zoomIn: false, starsReturn: true });

    expect(settings).toEqual({
      mode: '3d',
      style: 'arrive',
      rotation: 'off',
      sharp_stars: 'off',
      zoom_in: 'off',
      stars_return: 'on',
    });
  });

  it('should report Sharp Stars and the way the view turns', () => {
    const settings = videoSettings3d({ ...TRAVEL, starStyle: 'sharp', rotation: -4 });

    expect(settings['sharp_stars']).toBe('on');
    expect(settings['rotation']).toBe('anticlockwise');
  });
});
